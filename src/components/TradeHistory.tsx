'use client';

interface TradeHistoryProps {
  tokenPair: string;
}

export default function TradeHistory({ tokenPair }: TradeHistoryProps) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Trade History - {tokenPair}
      </h3>
      {/* Implement trade history functionality */}
    </div>
  );
} 