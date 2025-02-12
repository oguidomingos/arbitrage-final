import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error';
  details?: {
    route?: string;
    profit?: number;
    dex1?: string;
    dex2?: string;
  };
}

interface ArbitrageLogsProps {
  logs: LogEntry[];
}

function ArbitrageLogs({ logs }: ArbitrageLogsProps) {
  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Logs de Arbitragem</h2>
      </div>
      <div className="overflow-y-auto max-h-96">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`px-4 py-3 border-b border-gray-100 ${
              log.type === 'error' ? 'bg-red-50' :
              log.type === 'success' ? 'bg-green-50' : 'bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500">
                    {format(new Date(log.timestamp), "HH:mm:ss", { locale: ptBR })}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    log.type === 'error' ? 'bg-red-100 text-red-800' :
                    log.type === 'success' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {log.type === 'error' ? 'Erro' :
                     log.type === 'success' ? 'Sucesso' : 'Info'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-900">{log.message}</p>
                {log.details && (
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    {log.details.route && (
                      <div>Rota: {log.details.route}</div>
                    )}
                    {log.details.profit !== undefined && (
                      <div className={`font-medium ${
                        log.details.profit > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Lucro: ${log.details.profit.toFixed(6)}
                      </div>
                    )}
                    {log.details.dex1 && log.details.dex2 && (
                      <div>DEXs: {log.details.dex1} → {log.details.dex2}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ArbitrageLogs;