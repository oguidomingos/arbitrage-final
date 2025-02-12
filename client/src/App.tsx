import React, { useState, useEffect, useRef } from 'react';
import { ArbitrageOpportunity } from './types';
import { LogEntry } from './types';
import ArbitrageTable from './components/ArbitrageTable';
import ArbitrageLogs from './components/ArbitrageLogs';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function App() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);
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
        const message = JSON.parse(event.data);
        if (message.type === 'opportunities') {
          setOpportunities(message.data);
          setLastUpdate(new Date(message.timestamp));
        } else if (message.type === 'logs') {
          setLogs(message.data);
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket desconectado');
      setIsConnected(false);
      wsRef.current = null;

      // Tentar reconectar após 5 segundos
      reconnectTimeoutRef.current = setTimeout(() => {
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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Oportunidades de Arbitragem
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div
                  className={`h-3 w-3 rounded-full mr-2 ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Última atualização:{' '}
                {formatDistanceToNow(lastUpdate, {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ArbitrageTable opportunities={opportunities} />
            </div>
            <ArbitrageLogs logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
