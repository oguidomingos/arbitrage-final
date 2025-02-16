import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { checkArbitrage } from './paraswap';
import { LogEntry, ExecutionSignal, ArbitrageOpportunity } from './types';
import { executeArbitrage } from './executor';
import { createDexAdapter } from './adapters';
import { ethers } from 'ethers';

const TOKEN_ADDRESS_MAP: { [symbol: string]: string } = {
  'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  'WETH': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  'DAI':  '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  'WMATIC': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  'WBTC': '0x1BFD67037B42Cf73acf2047067bd4F2C47D9BfD6',
  'AAVE': '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
  'GHST': '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7',
  'LINK': '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
  'CRV': '0x172370d5Cd63279eFa6d502DAB29171933a610AF',
  'SUSHI': '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
  'DPI': '0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369'
};

const DEX_ROUTER_MAP: { [dexName: string]: string } = {
  'quickswapv3': '0xf5b509bb0909a69b1c207e495f687a596c168e12',
  'quickswapv2': '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
  'uniswapv3': '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  'sushiswapv2': '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  'curve': '0x094d12e5b541784701fd8d65f11fc0598fbc6332',
  'meshswap': '0x10f4A785F458Bc144e3706575924889954946639',
  'balancer': '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  'dodo': '0xa222e6a71D1A1Dd5F279805fbe38d5329C1d0e70',
  'kyberswap': '0x546C79662E028B661dFB4767664d0273184E4dD1'
};

function normalizeDexName(name: string): string {
  return name.trim().toLowerCase();
}

function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

function getRouterAddress(dexName: string): string {
  const normalizedDex = normalizeDexName(dexName);
  const routerAddress = DEX_ROUTER_MAP[normalizedDex];
  if (!routerAddress || !isValidAddress(routerAddress)) {
    throw new Error(`Invalid router address for dex "${dexName}" (normalized: "${normalizedDex}")`);
  }
  return routerAddress;
}

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  lastPing: number;
  pingTimeout?: NodeJS.Timeout;
  healthCheckInterval?: NodeJS.Timeout;
  clientId: string;
}

const app = express();

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const server = createServer(app);

// WebSocket server configuration
const wss = new WebSocketServer({ 
  server,
  clientTracking: true,
  verifyClient: ({ origin }, callback) => {
    callback(true); // Accept all origins for now
  }
});

// Constants
const PORT = process.env.PORT || 3003;
const CHECK_INTERVAL = 5 * 60 * 1000;  // 5 minutes
const PING_INTERVAL = 30000;           // 30 seconds
const PONG_TIMEOUT = 10000;            // 10 seconds
const MAX_LOGS = 100;

// State
const logs: LogEntry[] = [];
let checkOpportunitiesInterval: NodeJS.Timeout;
const connectedClients = new Set<ExtendedWebSocket>();

// Utility function to broadcast logs to all connected clients
function broadcastLogs(log: LogEntry) {
  logs.unshift(log);
  console.log('Broadcasting log:', log);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  
  let successfulClients = 0;
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.isAlive) {
      try {
        console.log('Sending log to client:', client.clientId);
        client.send(JSON.stringify({
          type: 'log',
          data: log
        }));
        successfulClients++;
      } catch (error) {
        console.error(`Failed to send to client ${client.clientId}:`, error);
      }
    }
  });

  console.log(`Log sent to ${successfulClients} client(s)`);
}

// Set up WebSocket monitoring for a single connection
function setupWebSocketMonitoring(ws: ExtendedWebSocket) {
  ws.isAlive = true;
  ws.lastPing = Date.now();
  ws.clientId = Math.random().toString(36).substring(7);
  
  // Set up periodic health checks
  const healthCheck = () => {
    if (!ws.isAlive && ws.readyState === WebSocket.OPEN) {
      console.log(`Client ${ws.clientId} unresponsive, terminating connection`);
      if (ws.healthCheckInterval) {
        clearInterval(ws.healthCheckInterval);
        clearTimeout(ws.pingTimeout);
      }
      connectedClients.delete(ws);
      return ws.terminate();
    }

    const timeSinceLastPing = Date.now() - ws.lastPing;
    if (timeSinceLastPing > PING_INTERVAL) {
      ws.isAlive = false;
      ws.send(JSON.stringify({ type: 'ping' }));
      ws.lastPing = Date.now();

      // Set timeout for pong response
      if (ws.pingTimeout) {
        clearTimeout(ws.pingTimeout);
      }
      const timeoutId = setTimeout(() => {
        console.log(`Ping timeout for client ${ws.clientId}`);
        if (ws.healthCheckInterval) {
          clearInterval(ws.healthCheckInterval);
        }
        if (!ws.isAlive) {
          connectedClients.delete(ws);
          ws.terminate();
        }
      }, PONG_TIMEOUT);
    }
  };

  ws.healthCheckInterval = setInterval(healthCheck, PING_INTERVAL) as NodeJS.Timeout;
  healthCheck(); // Initial check
}

// Check for arbitrage opportunities
async function checkOpportunities() {
  // Função auxiliar para construir o sinal de execução
  function buildExecutionSignal(opportunity: ArbitrageOpportunity): ExecutionSignal {
    // Pegar o token inicial e o montante do flash loan
    const asset = TOKEN_ADDRESS_MAP[opportunity.steps[0].from.toUpperCase()];
    if (!asset) {
      throw new Error(`Token não encontrado: ${opportunity.steps[0].from}`);
    }

    const amount = ethers.parseUnits(
      opportunity.flashLoanAmount.toString(),
      18 // Assumindo 18 decimais para todos os tokens por enquanto
    ).toString();

    // Criar adaptadores para cada DEX
    try {
      const dex1 = normalizeDexName(opportunity.steps[0].dex);
      const dex2 = normalizeDexName(opportunity.steps[1].dex);

      const router1 = getRouterAddress(dex1);
      const router2 = getRouterAddress(dex2);

      const adapter1 = createDexAdapter(dex1, router1);
      const adapter2 = createDexAdapter(dex2, router2);

      // Construir os dados dos swaps
      const swap1 = adapter1.buildSwapData(
        asset,
        TOKEN_ADDRESS_MAP[opportunity.steps[0].to.toUpperCase()],
        amount
      );

      const swap2 = adapter2.buildSwapData(
        TOKEN_ADDRESS_MAP[opportunity.steps[1].from.toUpperCase()],
        asset,
        amount
      );

      return {
        asset,
        amount,
        swap1,
        swap2,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Erro ao construir sinal de execução: ${errorMessage}`);
    }
  }

  try {
    const opportunities = await checkArbitrage((log) => {
      broadcastLogs(log);
    });

    if (opportunities.length > 0) {
      opportunities.forEach(opportunity => {
        console.log('Opportunity detected:', opportunity);

        try {
          // Construir o sinal de execução
          const signal = buildExecutionSignal(opportunity);
          console.log('Execution signal built:', signal);

          // Tentar executar a arbitragem
          executeArbitrage(signal).catch(error => {
            console.error('Error executing arbitrage:', error);
            broadcastLogs({
              timestamp: Date.now(),
              type: 'error',
              message: 'Error executing arbitrage',
              details: error
            });
          });
        
          // Broadcast opportunity and signal to all connected clients
          connectedClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client.isAlive) {
              try {
                client.send(JSON.stringify({
                  type: 'opportunity',
                  data: {
                    ...opportunity,
                    executionSignal: signal
                  }
                }));
              } catch (error) {
                console.error(`Failed to send to client ${client.clientId}:`, error);
              }
            }
          });
        } catch (error) {
          console.error('Error processing opportunity:', error);
          broadcastLogs({
            timestamp: Date.now(),
            type: 'error',
            message: 'Error processing arbitrage opportunity',
            details: error instanceof Error ? error.message : error
          });
        }
      });
    }
  } catch (error) {
    console.error('Error checking opportunities:', error);
    broadcastLogs({
      timestamp: Date.now(),
      type: 'error',
      message: 'Error checking arbitrage opportunities',
      details: error
    });
  }
}

// WebSocket connection handler
wss.on('connection', (socket, req) => {
  const ws = socket as ExtendedWebSocket;
  const clientIp = req.socket.remoteAddress;
  
  console.log(`New WebSocket client connected from ${clientIp}`);
  connectedClients.add(ws);
  
  setupWebSocketMonitoring(ws);

  // Send initial logs
  console.log('Sending initial logs:', logs);
  ws.send(JSON.stringify({
    type: 'logs',
    data: logs
  }));
  console.log('Initial logs sent');

  // Message handler
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'pong') {
        ws.isAlive = true;
        if (ws.pingTimeout) {
          clearTimeout(ws.pingTimeout);
          ws.pingTimeout = null;
        }
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      } else {
        console.log(`Received message from ${ws.clientId}:`, message);
        ws.isAlive = true; // Any valid message indicates the client is alive
      }
    } catch (error) {
      console.error(`Error processing message from ${ws.clientId}:`, error);
    }
  });

  // Error handler
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${ws.clientId}:`, error);
  });
  
  // Close handler
  ws.on('close', () => {
    console.log(`Client ${ws.clientId} disconnected`);
    if (ws.healthCheckInterval) {
      clearInterval(ws.healthCheckInterval);
    }
    if (ws.pingTimeout) {
      clearTimeout(ws.pingTimeout);
    }
    connectedClients.delete(ws);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    connections: connectedClients.size,
    uptime: process.uptime()
  });
});

// Server startup
async function startServer() {
  try {
    server.listen(PORT, () => {
      console.log(`HTTP/WebSocket server running on port ${PORT}`);
      console.log(`WebSocket URL: ws://localhost:${PORT}`);
      
      checkOpportunities();
      checkOpportunitiesInterval = setInterval(checkOpportunities, CHECK_INTERVAL);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.log('Port in use, attempting to terminate previous process...');
        process.exit(1);
      } else {
        console.error('Server error:', error);
        broadcastLogs({
          timestamp: Date.now(),
          type: 'error',
          message: 'Server error occurred',
          details: error
        });
      }
    });

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdownGracefully() {
  console.log('Shutting down server...');
  
  clearInterval(checkOpportunitiesInterval);
  
  // Close all client connections
  connectedClients.forEach(client => {
    if (client.pingTimeout) clearTimeout(client.pingTimeout!);
    if (client.healthCheckInterval) clearInterval(client.healthCheckInterval);
    client.terminate();
  });
  connectedClients.clear();
  
  // Close WebSocket server and HTTP server
  wss.close(() => {
    server.close(() => {
      console.log('Server shutdown complete');
      process.exit(0);
    });
  });
}

// Shutdown handlers
process.on('SIGINT', shutdownGracefully);
process.on('SIGTERM', shutdownGracefully);
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdownGracefully();
});

// Start server
startServer();
