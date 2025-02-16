import React, { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Terminal } from 'lucide-react';
import { LogEntry } from '../types';

interface LogsPanelProps {
  logs: LogEntry[];
  isConnected?: boolean;
  isLoading?: boolean;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ logs, isConnected = true, isLoading = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400 shrink-0" />;
      default:
        return <Terminal className="w-5 h-5 text-gray-400 shrink-0" />;
    }
  };

  const getLogStyles = (type: string) => {
    const baseStyles = 'rounded-lg p-3 transition-all duration-200 animate-fade-in';
    switch (type) {
      case 'error':
        return `${baseStyles} bg-red-500/10 border border-red-500/20 hover:bg-red-500/20`;
      case 'success':
        return `${baseStyles} bg-green-500/10 border border-green-500/20 hover:bg-green-500/20`;
      case 'warning':
        return `${baseStyles} bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20`;
      case 'info':
        return `${baseStyles} bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20`;
      default:
        return `${baseStyles} bg-gray-700/30 border border-gray-700 hover:bg-gray-700/50`;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDetails = (details: any) => {
    if (!details) return null;
    if (typeof details === 'string') return details;
    return JSON.stringify(details, null, 2);
  };

  const getDetailsStyles = (type: string) => {
    const baseStyles = 'mt-2 text-sm font-mono whitespace-pre-wrap rounded p-2 transition-colors';
    switch (type) {
      case 'error':
        return `${baseStyles} bg-red-500/5 text-red-300`;
      case 'success':
        return `${baseStyles} bg-green-500/5 text-green-300`;
      case 'warning':
        return `${baseStyles} bg-yellow-500/5 text-yellow-300`;
      case 'info':
        return `${baseStyles} bg-blue-500/5 text-blue-300`;
      default:
        return `${baseStyles} bg-gray-700/30 text-gray-300`;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-400">Loading logs...</p>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-400">Disconnected from server</p>
        </div>
      );
    }

    if (!logs || logs.length === 0) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-400">No logs available yet</p>
        </div>
      );
    }

    return logs.map((log, index) => (
      <article
        key={`${log.timestamp}-${index}`}
        className={getLogStyles(log.type)}
      >
        <div className="flex items-start space-x-3">
          {getLogIcon(log.type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{log.message}</span>
              <time
                className="text-xs text-gray-400 whitespace-nowrap ml-4"
                dateTime={new Date(log.timestamp).toISOString()}
              >
                {formatTime(log.timestamp)}
              </time>
            </div>
            {log.details && (
              <div className={getDetailsStyles(log.type)}>
                {formatDetails(log.details)}
              </div>
            )}
          </div>
        </div>
      </article>
    ));
  };

  return (
    <div className="h-full">
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 backdrop-blur-sm">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <Terminal className="w-5 h-5" />
            <span>Activity Logs</span>
          </h2>
          <span className="text-sm text-gray-400">
            {logs?.length || 0} entries
          </span>
        </div>

        {/* Logs Container */}
        <div
          ref={scrollRef}
          className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar p-4"
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default LogsPanel;