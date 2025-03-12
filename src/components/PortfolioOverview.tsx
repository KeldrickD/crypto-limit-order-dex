'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

interface PortfolioAsset {
  token: string;
  value: number;
  amount: number;
  price: number;
  change24h: number;
}

interface PortfolioOverviewProps {
  refreshInterval?: number;
  onError?: (error: string) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function PortfolioOverview({
  refreshInterval = 60000,
  onError
}: PortfolioOverviewProps) {
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        // TODO: Replace with actual API call
        const mockAssets: PortfolioAsset[] = [
          {
            token: 'ETH',
            amount: 2.5,
            price: 2500 + Math.random() * 100,
            change24h: -2.5 + Math.random() * 5,
            value: 0 // Calculated below
          },
          {
            token: 'BTC',
            amount: 0.15,
            price: 45000 + Math.random() * 1000,
            change24h: 1.5 + Math.random() * 3,
            value: 0 // Calculated below
          },
          {
            token: 'USDC',
            amount: 5000,
            price: 1,
            change24h: 0,
            value: 0 // Calculated below
          }
        ].map(asset => ({
          ...asset,
          value: asset.amount * asset.price
        }));

        setAssets(mockAssets);
        setTotalValue(mockAssets.reduce((sum, asset) => sum + asset.value, 0));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch portfolio data';
        onError?.(errorMessage);
      }
    };

    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, onError]);

  return (
    <div className="p-4 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Portfolio Overview
        </h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${totalValue.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Value
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assets}
                dataKey="value"
                nameKey="token"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ token, value }) => `${token} (${((value / totalValue) * 100).toFixed(1)}%)`}
              >
                {assets.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF',
                  borderColor: theme === 'dark' ? '#4B5563' : '#E5E7EB',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    24h
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {assets.map((asset) => (
                  <tr key={asset.token}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {asset.token}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {asset.amount.toFixed(asset.token === 'USDC' ? 2 : 6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ${asset.value.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      asset.change24h >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {asset.change24h.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 