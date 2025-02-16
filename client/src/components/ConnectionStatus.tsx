import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  onManualReconnect: () => void;
  lastUpdate: Date;
  reconnectDelay?: number;
}

const formatTime = (ms: number) => Math.ceil(ms / 1000);

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  reconnectAttempts,
  maxReconnectAttempts,
  onManualReconnect,
  lastUpdate,
  reconnectDelay = 0 // Default value using parameter destructuring
}) => {
  const isReconnecting = reconnectAttempts > 0;

  return (
    <div className="flex items-center space-x-4">
      <div 
        className={`
          relative flex items-center space-x-2 px-3 py-1.5 rounded-full font-medium
          ${isConnected 
            ? 'bg-green-500/10 text-green-400' 
            : 'bg-red-500/10 text-red-400'
          }
          ${isReconnecting ? 'animate-pulse' : ''}
        `}
      >
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isReconnecting ? (
                <span className="flex items-center space-x-1">
                  <span>Reconnecting</span>
                  <span className="text-xs text-red-300">
                    ({reconnectAttempts}/{maxReconnectAttempts}) in {formatTime(reconnectDelay)}s
                  </span>
                </span>
              ) 
                : 'Disconnected'
              }
            </span>
          </>
        )}

        {/* Status Indicator Dot */}
        <div 
          className={`
            absolute -right-1 -top-1 h-3 w-3 rounded-full
            ${isConnected ? 'bg-green-500' : 'bg-red-500'}
            ${isConnected ? 'animate-ping' : isReconnecting ? 'animate-pulse' : ''}
          `}
        />
      </div>

      {/* Last Update */}
      <div className="flex items-center space-x-2 text-sm text-gray-400">
        <RefreshCw 
          className={`w-4 h-4 ${isConnected ? 'animate-spin' : ''}`} 
        />
        <span>
          Last update: {lastUpdate.toLocaleTimeString()}
        </span>
      </div>

      {/* Manual Reconnect Button */}
      {!isConnected && reconnectAttempts >= maxReconnectAttempts && (
        <button
          onClick={onManualReconnect}
          className={`
            flex items-center space-x-1 px-3 py-1.5 
            text-sm font-medium rounded-md
            bg-blue-500/20 text-blue-400 
            hover:bg-blue-500/30 transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;