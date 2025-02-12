import React from 'react';
import { ArbitrageOpportunity } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import numeral from 'numeral';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/solid';

interface ArbitrageTableProps {
  opportunities: ArbitrageOpportunity[];
}

function ArbitrageTable({ opportunities }: ArbitrageTableProps) {
  const [sortConfig, setSortConfig] = React.useState<{
    key: keyof ArbitrageOpportunity | 'dexs';
    direction: 'asc' | 'desc';
  }>({
    key: 'profitPercentage',
    direction: 'desc',
  });

  const sortedOpportunities = React.useMemo(() => {
    if (!opportunities) return [];
    
    const sorted = [...opportunities].sort((a, b) => {
      if (sortConfig.key === 'dexs') {
        const aDexs = a.steps.map(step => step.dex).join(' → ');
        const bDexs = b.steps.map(step => step.dex).join(' → ');
        return aDexs.localeCompare(bDexs);
      }

      if (a[sortConfig.key] < b[sortConfig.key]) return -1;
      if (a[sortConfig.key] > b[sortConfig.key]) return 1;
      return 0;
    });

    if (sortConfig.direction === 'desc') {
      sorted.reverse();
    }

    return sorted;
  }, [opportunities, sortConfig]);

  const requestSort = (key: keyof ArbitrageOpportunity | 'dexs') => {
    setSortConfig(current => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderSortIcon = (key: keyof ArbitrageOpportunity | 'dexs') => {
    if (sortConfig.key !== key) return null;

    return sortConfig.direction === 'desc' ? (
      <ArrowDownIcon className="h-4 w-4 text-blue-500" />
    ) : (
      <ArrowUpIcon className="h-4 w-4 text-blue-500" />
    );
  };

  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma oportunidade de arbitragem encontrada
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 table-auto">
        <thead className="bg-gray-50">
          <tr>
            <th
              onClick={() => requestSort('route')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center space-x-1">
                <span>Rota</span>
                {renderSortIcon('route')}
              </div>
            </th>
            <th
              onClick={() => requestSort('profit')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center space-x-1">
                <span>Lucro</span>
                {renderSortIcon('profit')}
              </div>
            </th>
            <th
              onClick={() => requestSort('dexs')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center space-x-1">
                <span>DEXs</span>
                {renderSortIcon('dexs')}
              </div>
            </th>
            <th
              onClick={() => requestSort('flashLoanAmount')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center space-x-1">
                <span>Flash Loan</span>
                {renderSortIcon('flashLoanAmount')}
              </div>
            </th>
            <th
              onClick={() => requestSort('profitPercentage')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center space-x-1">
                <span>Lucro %</span>
                {renderSortIcon('profitPercentage')}
              </div>
            </th>
            <th
              onClick={() => requestSort('timestamp')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center space-x-1">
                <span>Data/Hora</span>
                {renderSortIcon('timestamp')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedOpportunities.map((opportunity, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{opportunity.route}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className={`font-medium ${opportunity.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {numeral(opportunity.profit).format('$0,0.00')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600 flex items-center space-x-1">
                  {opportunity.steps.map((step, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span className="px-2 py-1 bg-gray-100 rounded">{step.dex}</span>
                      {idx < arr.length - 1 && (
                        <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-gray-900">
                  {numeral(opportunity.flashLoanAmount).format('0,0.00')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className={`font-medium ${opportunity.profitPercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {numeral(opportunity.profitPercentage / 100).format('0.00%')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600">
                  {format(new Date(opportunity.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ArbitrageTable;
