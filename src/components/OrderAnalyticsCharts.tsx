'use client';

import { useOrders } from '@/context/OrderContext';
import { useTheme } from '@/context/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function OrderAnalyticsCharts() {
  const { theme } = useTheme();
  const { getOrderAnalytics } = useOrders();
  const analytics = getOrderAnalytics();

  // Colors for dark and light themes
  const colors = {
    light: {
      text: '#374151',
      background: '#F9FAFB',
      border: '#E5E7EB',
      primary: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      chart: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
    },
    dark: {
      text: '#D1D5DB',
      background: '#1F2937',
      border: '#374151',
      primary: '#60A5FA',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
      chart: ['#60A5FA', '#34D399', '#FBBF24', '#F87171']
    }
  };

  const currentTheme = theme === 'dark' ? colors.dark : colors.light;

  // Prepare data for status distribution pie chart
  const statusData = [
    { name: 'Pending', value: analytics.pendingOrders },
    { name: 'Executed', value: analytics.executedOrders },
    { name: 'Cancelled', value: analytics.cancelledOrders },
    { name: 'Partially Filled', value: analytics.partiallyFilledOrders }
  ].filter(item => item.value > 0);

  // Prepare data for execution time bar chart
  const executionTimeData = analytics.executionTimeDistribution.map(item => ({
    range: `${item.min}-${item.max}s`,
    count: item.count
  }));

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{analytics.totalOrders}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Orders</h3>
          <p className="mt-2 text-3xl font-semibold text-yellow-600 dark:text-yellow-400">{analytics.pendingOrders}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Executed Orders</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">{analytics.executedOrders}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Execution Time</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600 dark:text-blue-400">{analytics.averageExecutionTime}s</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Status Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Order Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill={currentTheme.primary}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={currentTheme.chart[index % currentTheme.chart.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: currentTheme.background,
                    borderColor: currentTheme.border,
                    color: currentTheme.text
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execution Time Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Execution Time Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={executionTimeData}>
                <XAxis
                  dataKey="range"
                  tick={{ fill: currentTheme.text }}
                  axisLine={{ stroke: currentTheme.border }}
                />
                <YAxis
                  tick={{ fill: currentTheme.text }}
                  axisLine={{ stroke: currentTheme.border }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: currentTheme.background,
                    borderColor: currentTheme.border,
                    color: currentTheme.text
                  }}
                />
                <Bar dataKey="count" fill={currentTheme.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
} 