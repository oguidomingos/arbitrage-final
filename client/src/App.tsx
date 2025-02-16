import React, { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import LogsPanel from './components/LogsPanel';
import LoadingSpinner from './components/LoadingSpinner';
import ConnectionStatus from './components/ConnectionStatus';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const {
    logs,
    isConnected,
    isLoading,
    lastUpdate,
    opportunities,
    reconnectAttempts,
    maxReconnectAttempts,
    manualReconnect
  } = useWebSocket();

  // Local state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                {isSidebarOpen ? '✕' : '☰'}
              </button>
              <ArrowRightLeft className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">
                Polygon Arbitrage Scanner
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <ConnectionStatus
                isConnected={isConnected}
                reconnectAttempts={reconnectAttempts}
                maxReconnectAttempts={maxReconnectAttempts}
                onManualReconnect={manualReconnect}
                lastUpdate={lastUpdate}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex space-x-6">
          {/* Main Area */}
          <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'w-2/3' : 'w-full'}`}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-400">Loading data...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-6">
                  Found {opportunities.length} opportunities
                </h2>
                {opportunities.map((opp, index) => (
                  <div
                    key={`${opp.route}-${index}`}
                    className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800/70 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-lg">{opp.route}</h3>
                        <p className={`text-sm ${opp.profit != null && opp.profit > 0 
                          ? 'text-green-400' 
                          : 'text-red-400'}`}>
                          {opp.profit != null && opp.profit > 0 ? '+' : ''}
                          {(opp.profit ?? 0).toFixed(6)} USDC ({(opp.profitPercentage ?? 0).toFixed(4)}%)
                        </p>
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(opp.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logs Panel */}
          {isSidebarOpen && (
            <div className="w-1/3">
              <LogsPanel 
                logs={logs}
                isConnected={isConnected}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
