'use client';

interface MarketDepthProps {
  tokenPair: string;
}

export default function MarketDepth({ tokenPair }: MarketDepthProps) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Market Depth - {tokenPair}
      </h3>
      {/* Implement market depth functionality */}
    </div>
  );
} 