import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { checkArbitrage } from './paraswap';
import { LogEntry } from './types';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());

// Armazenar logs
const logs: LogEntry[] = [];

const addLog = (log: LogEntry) => {
  logs.push(log);
  if (logs.length > 100) {
    logs.shift(); // Manter apenas os últimos 100 logs
  }
  broadcastData('logs', logs);
};

// Armazenar clientes WebSocket conectados
const clients = new Set<WebSocket>();

// Configuração do WebSocket
wss.on('connection', (ws) => {
  console.log('Novo cliente WebSocket conectado');
  clients.add(ws);

  // Enviar logs existentes para o novo cliente
  ws.send(JSON.stringify({
    type: 'logs',
    data: logs,
    timestamp: Date.now()
  }));

  ws.on('close', () => {
    console.log('Cliente WebSocket desconectado');
    clients.delete(ws);
  });
});

// Função para enviar dados para todos os clientes WebSocket
const broadcastData = (type: string, data: any) => {
  const message = JSON.stringify({
    type,
    data,
    timestamp: Date.now()
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Loop de verificação de arbitragem
const startArbitrageLoop = async () => {
  while (true) {
    try {
      const opportunities = await checkArbitrage(addLog);

      // Filtrar oportunidades com lucro significativo (mais de 0.1% de retorno)
      const significantOpportunities = opportunities.filter(opp => 
        opp.profit > 0 && opp.profitPercentage > 0.001
      );

      broadcastData('opportunities', significantOpportunities);

      if (significantOpportunities.length > 0) {
        const bestProfit = Math.max(...significantOpportunities.map(o => o.profit));
        addLog({
          timestamp: Date.now(),
          type: 'success',
          message: `Encontradas ${significantOpportunities.length} oportunidades significativas`,
          details: { profit: bestProfit }
        });
      }

    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error);
      addLog({
        timestamp: Date.now(),
        type: 'error',
        message: `Erro ao buscar oportunidades: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Intervalo de 1 segundo
  }
};

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: Date.now(),
    connectedClients: clients.size,
    logsCount: logs.length
  });
});

// Manter endpoint REST como fallback
app.get('/api/opportunities', async (req: Request, res: Response) => {
  try {
    const opportunities = await checkArbitrage(addLog);
    res.json(opportunities);
  } catch (error) {
    console.error('Erro ao buscar oportunidades:', error);
    res.status(500).json({ error: 'Falha ao buscar oportunidades' });
  }
});

app.get('/api/logs', (req: Request, res: Response) => {
  res.json(logs);
});

server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  // Iniciar o loop de verificação de arbitragem
  startArbitrageLoop();
});
