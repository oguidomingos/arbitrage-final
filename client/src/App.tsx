import React, { useState, useEffect, useRef } from 'react';
import { ArbitrageOpportunity, LogEntry } from './types';
import ArbitrageTable from './components/ArbitrageTable';
import ArbitrageLogs from './components/ArbitrageLogs';
import { ArrowRightLeft, RefreshCcw, X } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  progress: number;
}

const TOKENS = {
  MATIC: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 },
  WMATIC: { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
  USDC: { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
  DAI: { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
  WETH: { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
  QUICK: { address: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13", decimals: 18 },
  SUSHI: { address: "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a", decimals: 18 },
  AAVE: { address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", decimals: 18 },
  LINK: { address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", decimals: 18 },
  WBTC: { address: "0x1BFD67037B42Cf73acf2047067bd4F2C47D9BfD6", decimals: 8 },
  CRV: { address: "0x172370d5Cd63279eFa6d502DAB29171933a610AF", decimals: 18 },
  BAL: { address: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3", decimals: 18 },
  GHST: { address: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7", decimals: 18 },
  DPI: { address: "0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369", decimals: 18 }
};

function App() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const setupWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('ws://localhost:3002');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket conectado');
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    ws.onmessage = (event) => {
      try {
        console.log('Mensagem WebSocket recebida:', event.data);
        const message = JSON.parse(event.data);

        if (message.type === 'opportunities') {
          setOpportunities(message.data);
          if (message.data && message.data.length > 0) {
            setLastUpdate(new Date(message.timestamp));
            showSwapNotification(message.data[0]);
          }
        } else if (message.type === 'initial') {
          console.log('Recebidos logs iniciais:', message.data.length);
          setLogs(message.data);
        } else if (message.type === 'log') {
          console.log('Novo log recebido:', message.data);
          setLogs(prevLogs => [message.data, ...prevLogs].slice(0, 100));
        } else if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket desconectado');
      setIsConnected(false);
      wsRef.current = null;

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Tentando reconectar...');
        setupWebSocket();
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('Erro WebSocket:', error);
    };
  };

  useEffect(() => {
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const showSwapNotification = (opportunity: ArbitrageOpportunity) => {
    const id = Date.now().toString();
    const newNotification: Notification = {
      id,
      message: `Arbitragem encontrada: ${opportunity.route} (${opportunity.profitPercentage.toFixed(2)}%)`,
      progress: 0
    };

    setNotifications(prev => [...prev, newNotification]);

    const startTime = Date.now();
    const duration = 3000;
    const updateInterval = 50;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, progress } : n)
      );

      if (elapsed >= duration) {
        clearInterval(progressInterval);
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, 200);
      }
    }, updateInterval);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ArrowRightLeft className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">Polygon Arbitrage Scanner</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-400">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <RefreshCcw className={`w-4 h-4 ${isConnected ? 'animate-spin' : ''}`} />
                <span>Última atualização: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 w-96 transform transition-all"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{notification.message}</span>
              <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-300" />
              </button>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-200"
                style={{ width: `${notification.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-700/30">
              <h2 className="text-lg font-bold">Oportunidades de Arbitragem</h2>
            </div>
            <ArbitrageTable opportunities={opportunities} />
          </div>
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-700/30">
              <h2 className="text-lg font-bold">Logs de Execução</h2>
            </div>
            <ArbitrageLogs logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
