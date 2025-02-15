import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { checkArbitrage } from './paraswap';
import { LogEntry, ExecutionSignal, ArbitrageOpportunity } from './types';
import { executeArbitrage } from './executor';
import { ethers } from 'ethers';

// Mapeamento de símbolos de tokens para endereços na Polygon
const TOKEN_ADDRESS_MAP: { [symbol: string]: string } = {
  'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  'WETH': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  'DAI':  '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  'WMATIC': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  // Adicione outros tokens conforme necessário
};

// Mapeamento de DEX names para endereços de Router na Polygon
const DEX_ROUTER_MAP: { [dexName: string]: string } = {
  'quickswapv3': '0xf5b509bb0909a69b1c207e495f687a596c168e12',   // QuickSwap v3 Router
  'curvev1': '0x094d12e5b541784701fd8d65f11fc0598fbc6332',       // Curve v1 Router (Factory)
  'curvev2': '0x3f41FA8E04491135Ec98547554D7c3eC63947bEb',       // Curve v2 Router
  'woofiv2': '0x9aEd3A8896A85FE9a8CAc52C9B402D092B629a30',      // WooFi Router
  'uniswaprv3': '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',    // UniSwap v3 Router
  'sushiswap': '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',    // SushiSwap Router
  'swaapv2': '0xf0C1c87ff758F9DbdDF9451B1679EE62568bcE4F',      // SwaapV2 Router
};

// Função auxiliar para normalizar nomes de DEX
function normalizeDexName(dexName: string): string {
  // Remove espaços, hífens e converte para minúsculas
  return dexName.toLowerCase().replace(/[\s-]/g, '');
}

// Interface estendida para WebSocket com propriedades adicionais
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  isPending: boolean;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3003;
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos entre verificações

// Armazenar logs das últimas verificações
const logs: LogEntry[] = [];
const MAX_LOGS = 100;
const PING_INTERVAL = 30000; // 30 segundos
const PONG_TIMEOUT = 5000; // 5 segundos

let checkOpportunitiesInterval: NodeJS.Timeout;
let pingInterval: NodeJS.Timeout;

// Função para enviar logs para todos os clientes conectados
function broadcastLogs(log: LogEntry) {
  logs.unshift(log);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  
  let successfulClients = 0;

  wss.clients.forEach((client) => {
    const ws = client as ExtendedWebSocket;
    if (ws.readyState === WebSocket.OPEN && !ws.isPending) {
      ws.send(JSON.stringify({
        type: 'log',
        data: log
      }));
      successfulClients++;
    }
  });

  console.log(`Log enviado para ${successfulClients} cliente(s)`);
}

// Configurar conexões WebSocket
wss.on('connection', (socket) => {
  const ws = socket as ExtendedWebSocket;
  console.log('Novo cliente WebSocket conectado. Total de logs:', logs.length);
  
  // Inicializar propriedades do WebSocket
  ws.isAlive = true;
  ws.isPending = false;

  // Enviar logs existentes para o novo cliente
  ws.send(JSON.stringify({
    type: 'initial',
    data: logs
  }));

  // Handler para mensagens do cliente
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'pong') {
        ws.isAlive = true;
        ws.isPending = false;
      }
    } catch (error) {
      console.error('Erro ao processar mensagem do cliente:', error);
    }
  });

  ws.on('error', console.error);
  
  ws.on('close', () => {
    console.log('Cliente WebSocket desconectado');
  });
});

// Verificar conexões ativas periodicamente
function startPingInterval() {
  return setInterval(() => {
    wss.clients.forEach((socket) => {
      const ws = socket as ExtendedWebSocket;
      if (!ws.isAlive) {
        console.log('Cliente inativo detectado, terminando conexão');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.isPending = true;
      ws.send(JSON.stringify({ type: 'ping' }));
      
      setTimeout(() => {
        if (ws.isPending) {
          console.log('Cliente não respondeu ao ping, terminando conexão');
          ws.terminate();
        }
      }, PONG_TIMEOUT);
    });
  }, PING_INTERVAL);
}

// Função principal de verificação
async function checkOpportunities() {
  try {
    const opportunities = await checkArbitrage((log) => {
      broadcastLogs(log);
    });

    // Se encontrou oportunidades, envia para todos os clientes
    if (opportunities.length > 0) {
      for (const opportunity of opportunities) {
          console.log('Oportunidade detectada:', opportunity);
          
          // Normalizar símbolos e buscar endereços
          const assetSymbol = opportunity.steps[0].from.toUpperCase();
          const assetAddress = TOKEN_ADDRESS_MAP[assetSymbol];

          if (!assetAddress) {
            console.error(`Endereço não encontrado para o símbolo do ativo: ${assetSymbol}`);
            broadcastLogs({
              timestamp: Date.now(),
              type: 'error',
              message: `Endereço não encontrado para o símbolo do ativo: ${assetSymbol}`,
              details: { opportunity },
            });
            continue;
          }

          // Normalizar e buscar endereço do primeiro DEX
          console.log('DEX 1 original:', opportunity.steps[0].dex);
          const dexName1 = normalizeDexName(opportunity.steps[0].dex);
          console.log('DEX 1 normalizado:', dexName1);
          const routerAddress1 = DEX_ROUTER_MAP[dexName1];

          if (!routerAddress1 || !ethers.isAddress(routerAddress1)) {
            console.error(`Endereço de router inválido para DEX: ${opportunity.steps[0].dex} (${dexName1})`);
            broadcastLogs({
              timestamp: Date.now(),
              type: 'error',
              message: `Endereço de router inválido para DEX: ${opportunity.steps[0].dex}`,
              details: { opportunity },
            });
            continue;
          }

          // Normalizar e buscar endereço do segundo DEX
          console.log('DEX 2 original:', opportunity.steps[1].dex);
          const dexName2 = normalizeDexName(opportunity.steps[1].dex);
          console.log('DEX 2 normalizado:', dexName2);
          const routerAddress2 = DEX_ROUTER_MAP[dexName2];

          if (!routerAddress2 || !ethers.isAddress(routerAddress2)) {
            console.error(`Endereço de router inválido para DEX: ${opportunity.steps[1].dex} (${dexName2})`);
            broadcastLogs({
              timestamp: Date.now(),
              type: 'error',
              message: `Endereço de router inválido para DEX: ${opportunity.steps[1].dex}`,
              details: { opportunity },
            });
            continue;
          }

          // Construir o objeto ExecutionSignal
          const signal: ExecutionSignal = {
            asset: assetAddress,
            amount: opportunity.flashLoanAmount.toString(),
            swap1: {
              router: routerAddress1,
              path: [assetAddress, TOKEN_ADDRESS_MAP[opportunity.steps[0].to.toUpperCase()]], // Use token addresses from map
              amountOutMin: '0',
            },
            swap2: {
              router: routerAddress2,
              path: [TOKEN_ADDRESS_MAP[opportunity.steps[1].from.toUpperCase()], assetAddress], // Use token addresses from map
              amountOutMin: '0',
            },
          };

          console.log('Sinal de execução construído:', signal);

          try {
            await executeArbitrage(signal);
            console.log('Arbitragem executada com sucesso para a oportunidade:', opportunity);
            broadcastLogs({
              timestamp: Date.now(),
              type: 'success',
              message: 'Arbitragem executada com sucesso',
              details: { opportunity },
            });
          } catch (error) {
            console.error('Falha ao executar arbitragem para a oportunidade:', opportunity, error);
            broadcastLogs({
              timestamp: Date.now(),
              type: 'error',
              message: 'Falha ao executar arbitragem',
              details: { opportunity, error },
            });
          }
        }
        wss.clients.forEach((socket) => {
          const ws = socket as ExtendedWebSocket;
          if (ws.readyState === WebSocket.OPEN && !ws.isPending) {
            ws.send(JSON.stringify({
              type: 'opportunities',
              data: opportunities,
              timestamp: Date.now()
            }));
          }
        });
    }
  } catch (error) {
    console.error('Erro ao verificar oportunidades:', error);
    broadcastLogs({
      timestamp: Date.now(),
      type: 'error',
      message: 'Erro ao verificar oportunidades de arbitragem'
    });
  }
}

// Função para encerrar o servidor graciosamente
async function shutdownGracefully() {
  console.log('Encerrando servidor...');
  
  // Limpar todos os intervalos
  clearInterval(checkOpportunitiesInterval);
  clearInterval(pingInterval);
  
  // Fechar todas as conexões WebSocket
  wss.clients.forEach(client => {
    const ws = client as ExtendedWebSocket;
    ws.terminate();
  });
  
  // Fechar o servidor WebSocket e HTTP
  wss.close(() => {
    server.close(() => {
      console.log('Servidor encerrado');
      process.exit(0);
    });
  });
}

// Iniciar verificações periódicas
async function startServer() {
  try {
    server.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      
      // Primeira verificação
      checkOpportunities();
      
      // Configurar intervalos
      checkOpportunitiesInterval = setInterval(checkOpportunities, CHECK_INTERVAL);
      pingInterval = startPingInterval();
    });

    // Handler para erros do servidor
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.log('Porta em uso, tentando encerrar processo anterior...');
        process.exit(1);
      } else {
        console.error('Erro no servidor:', error);
      }
    });

  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Handlers para sinais de encerramento
process.on('SIGINT', shutdownGracefully);
process.on('SIGTERM', shutdownGracefully);
process.on('uncaughtException', (error) => {
  console.error('Erro não tratado:', error);
  shutdownGracefully();
});

// Iniciar servidor
startServer();
