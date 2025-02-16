import React, { useState, useEffect } from 'react';
import { ArbitrageOpportunity } from '../types';
import { X, TrendingUp, ArrowRight, AlertTriangle, ChevronRight } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface TransactionPopupProps {
  opportunity: ArbitrageOpportunity;
  onClose: () => void;
}

const TransactionPopup: React.FC<TransactionPopupProps> = ({ opportunity, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    // Add escape key listener
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Match animation duration
  };

  const handleConfirm = () => {
    setIsConfirming(true);
    // Simulate transaction confirmation
    setTimeout(() => {
      setIsConfirming(false);
      handleClose();
    }, 2000);
  };

  const formatAmount = (amount: string | number, decimals: number = 18) => {
    return Number(amount).toFixed(decimals);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className={`
          w-full max-w-lg transform transition-all duration-300
          ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Card Content */}
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold">Arbitrage Opportunity</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-700/50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Profit Information */}
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-green-400">
                +{opportunity.profitPercentage.toFixed(2)}%
              </div>
              <p className="text-gray-400 mt-1">Estimated Profit</p>
            </div>

            {/* Transaction Path */}
            <div className="space-y-4">
              {opportunity.steps.map((step, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1 p-3 bg-gray-700/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-400">From</span>
                        <div className="font-semibold">{step.from}</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                      <div className="text-right">
                        <span className="text-sm text-gray-400">To</span>
                        <div className="font-semibold">{step.to}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      via {step.dex}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-1 text-sm text-gray-400 mt-4 hover:text-gray-300 transition-colors"
            >
              <ChevronRight 
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              />
              <span>Transaction Details</span>
            </button>

            {/* Additional Details */}
            {showDetails && (
              <div className="mt-4 space-y-3 text-sm text-gray-400 border-t border-gray-700 pt-4">
                <div className="flex justify-between">
                  <span>Initial Amount</span>
                  <span>{formatAmount(opportunity.initialAmount)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Return</span>
                  <span className="text-green-400">
                    {formatAmount(opportunity.expectedReturn)} USDC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gas Cost (est.)</span>
                  <span>{opportunity.gasCost || '~0.01'} MATIC</span>
                </div>
                <div className="flex items-center mt-2 p-2 bg-yellow-500/10 rounded text-yellow-400 text-xs">
                  <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
                  <span>
                    Actual returns may vary due to price movements and slippage
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-800/50 border-t border-gray-700">
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 rounded-md border border-gray-600 
                         hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className={`
                  flex-1 px-4 py-2 rounded-md 
                  bg-blue-500/20 text-blue-400 border border-blue-500/30
                  hover:bg-blue-500/30 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center space-x-2
                `}
              >
                {isConfirming ? (
                  <>
                    <LoadingSpinner size="sm" variant="dots" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>Execute Trade</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionPopup;