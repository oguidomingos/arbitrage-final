import React from 'react';
import { ArbitrageOpportunity } from '../types';
import { ArrowLeftRight, TrendingUp } from 'lucide-react';

interface ArbitrageTableProps {
  opportunities: ArbitrageOpportunity[];
}

function ArbitrageTable({ opportunities }: ArbitrageTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="overflow-x-auto">
      {opportunities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <ArrowLeftRight className="w-12 h-12 mb-4" />
          <p>Nenhuma oportunidade encontrada</p>
        </div>
      ) : (
        <table className="w-full divide-y divide-gray-700">
          <thead className="bg-gray-700/20">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 tracking-wider">
                Rota
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 tracking-wider">
                DEXs
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 tracking-wider">
                Lucro
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 tracking-wider">
                Total Movimentado
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 tracking-wider">
                Retorno
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {opportunities.map((op, index) => (
              <tr
                key={index}
                className="hover:bg-gray-700/20 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-400 mr-2" />
                    {op.route}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {op.steps[0].dex}
                    </span>
                    <span>→</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {op.steps[1].dex}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-400">
                  {formatCurrency(op.profit)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300">
                  {formatCurrency(op.totalMovimentado)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {formatPercent(op.profitPercentage)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ArbitrageTable;
