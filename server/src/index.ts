import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { checkArbitrage } from './paraswap';
import { LogEntry } from './types';

// Interface estendida para WebSocket com propriedades adicionais
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  isPending: boolean;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3002;
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
      console.log('Encontradas', opportunities.length, 'oportunidades de arbitragem');
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
function shutdownGracefully() {
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
