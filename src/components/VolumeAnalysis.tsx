'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

interface VolumeAnalysisProps {
  tokenPair?: string;
  timeframe?: string;
  refreshInterval?: number;
  onError?: (error: string) => void;
}

interface VolumeData {
  timestamp: string;
  volume: number;
  buyVolume: number;
  sellVolume: number;
}

export default function VolumeAnalysis({
  tokenPair = 'ETH/USD',
  timeframe = '24h',
  refreshInterval = 300000,
  onError
}: VolumeAnalysisProps) {
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchVolumeData = async () => {
      try {
        // TODO: Replace with actual API call
        const mockData: VolumeData[] = Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          volume: Math.random() * 1000,
          buyVolume: Math.random() * 600,
          sellVolume: Math.random() * 400
        })).reverse();
        
        setVolumeData(mockData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch volume data';
        onError?.(errorMessage);
      }
    };

    fetchVolumeData();
    const interval = setInterval(fetchVolumeData, refreshInterval);
    return () => clearInterval(interval);
  }, [tokenPair, timeframe, refreshInterval, onError]);

  return (
    <div className="p-4 h-full">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Volume Analysis - {tokenPair}
      </h3>
      <div className="h-[calc(100%-2rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={volumeData}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              stroke={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
            />
            <YAxis
              stroke={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
              tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF',
                borderColor: theme === 'dark' ? '#4B5563' : '#E5E7EB',
                color: theme === 'dark' ? '#F3F4F6' : '#1F2937'
              }}
              formatter={(value: number) => [`${value.toFixed(2)}`, 'Volume']}
            />
            <Bar
              dataKey="buyVolume"
              stackId="volume"
              fill="#10B981"
              name="Buy Volume"
            />
            <Bar
              dataKey="sellVolume"
              stackId="volume"
              fill="#EF4444"
              name="Sell Volume"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 