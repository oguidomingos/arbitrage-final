import React from 'react';
import { ArbitrageOpportunity } from '../types';
import { ArrowRightLeft, ChevronRight, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface ArbitrageTableProps {
  opportunities: ArbitrageOpportunity[];
  onRowClick?: (opportunity: ArbitrageOpportunity) => void;
  isLoading?: boolean;
}

const ArbitrageTable: React.FC<ArbitrageTableProps> = ({ 
  opportunities, 
  onRowClick,
  isLoading = false 
}) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRoute = (steps: ArbitrageOpportunity['steps']) => {
    return steps.map(step => step.dex).join(' → ');
  };

  const formatCurrency = (value: number | string | undefined) => {
    if (!value) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const formatPercentage = (value: number | undefined) => {
    if (typeof value !== 'number') return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <LoadingSpinner size="lg" variant="dots" />
      </div>
    );
  }

  if (!opportunities.length) {
    return (
      <div className="min-h-[200px] flex flex-col items-center justify-center text-gray-400 space-y-2">
        <AlertCircle className="w-8 h-8" />
        <p>No arbitrage opportunities found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700/30">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Route
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
              Profit
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
              Volume
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700 bg-gray-800/30">
          {opportunities.map((opportunity, index) => (
            <tr
              key={`${opportunity.timestamp}-${index}`}
              onClick={() => onRowClick?.(opportunity)}
              className={`
                transition-colors duration-150 
                ${onRowClick ? 'cursor-pointer hover:bg-gray-700/30' : ''}
              `}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {formatTimestamp(opportunity.timestamp)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                <div className="flex items-center space-x-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                  <span>{formatRoute(opportunity.steps)}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                <span className={`
                  font-medium
                  ${opportunity.profitPercentage > 0 ? 'text-green-400' : 'text-red-400'}
                `}>
                  {formatPercentage(opportunity.profitPercentage)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-300">
                {formatCurrency(opportunity.initialAmount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <Status status={opportunity.executionStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Status: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;

  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <span className={`
      px-2 py-1 text-xs rounded-full border
      ${getStatusStyles()}
    `}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default ArbitrageTable;
