'use client';

import { useEffect, useState } from 'react';

interface TradingPair {
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

interface TradingPairsProps {
  refreshInterval?: number;
  onError?: (error: string) => void;
}

export default function TradingPairs({
  refreshInterval = 10000,
  onError
}: TradingPairsProps) {
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TradingPair;
    direction: 'asc' | 'desc';
  }>({ key: 'pair', direction: 'asc' });

  useEffect(() => {
    const fetchPairs = async () => {
      try {
        // TODO: Replace with actual API call
        const mockPairs: TradingPair[] = [
          {
            pair: 'ETH/USD',
            price: 2500 + Math.random() * 100,
            change24h: -2.5 + Math.random() * 5,
            volume24h: 1000000 + Math.random() * 500000,
            high24h: 2600,
            low24h: 2400
          },
          {
            pair: 'BTC/USD',
            price: 45000 + Math.random() * 1000,
            change24h: 1.5 + Math.random() * 3,
            volume24h: 5000000 + Math.random() * 1000000,
            high24h: 46000,
            low24h: 44000
          },
          // Add more mock pairs as needed
        ];
        setPairs(mockPairs);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trading pairs';
        onError?.(errorMessage);
      }
    };

    fetchPairs();
    const interval = setInterval(fetchPairs, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, onError]);

  const handleSort = (key: keyof TradingPair) => {
    setSortConfig(current => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedPairs = [...pairs].sort((a, b) => {
    if (sortConfig.direction === 'asc') {
      return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
    }
    return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
  });

  return (
    <div className="p-4 h-full overflow-hidden">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Trading Pairs
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['Pair', 'Price', '24h Change', '24h Volume', '24h High', '24h Low'].map((header, index) => (
                <th
                  key={header}
                  onClick={() => handleSort(Object.keys(pairs[0])[index] as keyof TradingPair)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {header}
                  {sortConfig.key === Object.keys(pairs[0])[index] && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedPairs.map((pair) => (
              <tr key={pair.pair} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {pair.pair}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${pair.price.toFixed(2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                  pair.change24h >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {pair.change24h.toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${(pair.volume24h / 1000000).toFixed(2)}M
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${pair.high24h.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${pair.low24h.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 