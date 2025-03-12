'use client';

interface OrderBookProps {
  tokenPair: string;
}

export default function OrderBook({ tokenPair }: OrderBookProps) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Order Book - {tokenPair}
      </h3>
      {/* Implement order book functionality */}
    </div>
  );
} 