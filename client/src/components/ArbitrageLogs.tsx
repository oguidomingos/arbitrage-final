import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Info, AlertTriangle, CheckCircle, ArrowLeftRight } from 'lucide-react';
import { LogEntry } from '../types';

interface ArbitrageLogsProps {
  logs: LogEntry[];
}

function ArbitrageLogs({ logs }: ArbitrageLogsProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value);
  };

  return (
    <div className="overflow-y-auto max-h-[600px]">
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <ArrowLeftRight className="w-12 h-12 mb-4" />
          <p>Nenhum log encontrado</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`p-4 ${
                log.type === 'error' ? 'bg-red-900/10' :
                log.type === 'success' ? 'bg-green-900/10' :
                'bg-transparent'
              } hover:bg-gray-700/20 transition-colors`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(log.type)}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                      'text-gray-200'
                    }`}>
                      {log.message}
                    </p>
                    <span className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), "HH:mm:ss", { locale: ptBR })}
                    </span>
                  </div>
                  {log.details && (
                    <div className="mt-2 text-xs space-y-1">
                      {log.details.route && (
                        <div className="text-gray-400">
                          Rota: <span className="text-gray-300">{log.details.route}</span>
                        </div>
                      )}
                      {log.details.profit !== undefined && (
                        <div className="text-gray-400">
                          Lucro: <span className={`font-medium ${
                            log.details.profit > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatCurrency(log.details.profit)}
                          </span>
                        </div>
                      )}
                      {log.details.dex1 && log.details.dex2 && (
                        <div className="text-gray-400">
                          DEXs: <span className="text-gray-300">{log.details.dex1} → {log.details.dex2}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ArbitrageLogs;