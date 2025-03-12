'use client';

interface AlertsWidgetProps {
  tokenPair?: string;
}

export default function AlertsWidget({ tokenPair }: AlertsWidgetProps) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Alerts {tokenPair ? `- ${tokenPair}` : ''}
      </h3>
      {/* Implement alerts functionality */}
    </div>
  );
} 