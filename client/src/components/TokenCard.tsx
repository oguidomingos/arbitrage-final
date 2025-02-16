import React, { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface TokenCardProps {
  symbol: string;
  address: string;
  decimals: number;
  isActive: boolean;
  lastOpportunity?: {
    profit: number;
    timestamp: number;
  };
}

const TokenCard: React.FC<TokenCardProps> = ({
  symbol,
  address,
  decimals,
  isActive,
  lastOpportunity
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showProfit, setShowProfit] = useState(false);

  // Animate when new opportunity is detected
  useEffect(() => {
    if (lastOpportunity) {
      setIsUpdating(true);
      setShowProfit(false); // Reset before showing new profit
      setShowProfit(true);
      const timer = setTimeout(() => {
        setIsUpdating(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [lastOpportunity?.timestamp]);

  // Auto-hide profit after delay
  useEffect(() => {
    if (showProfit) {
      const timer = setTimeout(() => {
        setShowProfit(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showProfit]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border backdrop-blur-sm token-card
        ${isActive ? 'border-blue-500/50 shadow-glow' : 'border-gray-700'}
        ${isUpdating ? 'animate-pulse-glow' : ''}
        glass-effect p-4 transition-all
        hover:border-gray-500 hover:shadow-lg
        transform hover:-translate-y-1
      `}
      onClick={() => setShowProfit(true)}
    >
      {/* Loading/Updating Overlay */}
      {isUpdating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 loading-overlay bg-gray-900/50 backdrop-blur-sm">
          <LoadingSpinner 
            size="sm" 
            variant="bars"
            color="text-blue-400"
            className="transform scale-75"
          />
          <span className="text-xs text-blue-400">Updating...</span>
        </div>
      )}

      {/* Token Info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-lg font-bold">{symbol.slice(0, 2)}</span>
            </div>
            {isActive && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-blue-500 animate-pulse">
                <div 
                  className="absolute inset-0 rounded-full bg-blue-500 animate-ping"
                  style={{ animationDuration: '2s' }}
                />
                <div className="absolute inset-0 rounded-full bg-blue-400/50 animate-pulse" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold">{symbol}</h3>
            <p className="text-xs text-gray-400">
              {`${address.slice(0, 6)}...${address.slice(-4)}`}
            </p>
          </div>
        </div>

        {/* Profit Display */}
        {lastOpportunity && showProfit && (
          <div className="profit-display">
            <span 
              className="text-sm font-bold text-green-400 profit-flash"
              style={{ textShadow: '0 0 10px rgba(74, 222, 128, 0.5)' }}
            >
              +{lastOpportunity.profit.toFixed(2)}%
            </span>
            <span className="text-xs text-gray-400 block mt-1">
              {new Date(lastOpportunity.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* DEX Info and Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Decimals</span>
          <span>{decimals}</span>
        </div>

        {lastOpportunity && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Last Opportunity</span>
            <span className="text-gray-300">
              {new Date(lastOpportunity.timestamp).toLocaleString()}
            </span>
          </div>
        )}

        {/* Token Actions */}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md
              transition-all duration-200 transform hover:scale-105
              ${isActive
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700/70'
              }
              hover:shadow-md
            `}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedTokenCard = React.memo(TokenCard, (prevProps, nextProps) => {
  return prevProps.isActive === nextProps.isActive &&
         prevProps.lastOpportunity?.timestamp === nextProps.lastOpportunity?.timestamp &&
         prevProps.decimals === nextProps.decimals;
});

export default MemoizedTokenCard;