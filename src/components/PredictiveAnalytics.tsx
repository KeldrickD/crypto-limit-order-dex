'use client';

import { useEffect, useState, useRef } from 'react';
import { useUserSettings } from '@/context/UserSettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { marketPredictionService, PredictionResult, PredictionParameters } from '@/services/MarketPredictionService';
import { analyticsExportService, HistoricalPrediction, PerformanceMetrics } from '@/services/AnalyticsExportService';
import { Dialog } from '@headlessui/react';

interface SettingsFormData {
  windowSize: number;
  confidenceLevel: number;
  smoothingFactor: number;
  outlierThreshold: number;
  upperThreshold: number;
  lowerThreshold: number;
  notificationChannel: string;
}

interface FeedbackFormData {
  type: 'bug' | 'feature' | 'accuracy';
  content: string;
  metadata?: {
    browser: string;
    timestamp: number;
    predictionId?: string;
    metricType?: string;
  };
}

export default function PredictiveAnalytics() {
  const { settings: userSettings } = useUserSettings();
  const { theme } = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalPrediction[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'price' | 'volume' | 'success_rate' | 'execution_time'>('price');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedPair, setSelectedPair] = useState(userSettings.tokenPairs[0] || 'ETH/USDC');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistorical, setShowHistorical] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormData>({
    type: 'accuracy',
    content: ''
  });
  const [formData, setFormData] = useState<SettingsFormData>(() => {
    const params = marketPredictionService.getPredictionParameters();
    return {
      ...params,
      upperThreshold: 0,
      lowerThreshold: 0,
      notificationChannel: userSettings.notificationChannels.priceAlert
    };
  });

  useEffect(() => {
    if (!userSettings.predictiveAnalyticsEnabled) return;

    const fetchData = async () => {
      try {
        const newPredictions = await marketPredictionService.generatePredictions(
          selectedPair,
          selectedMetric,
          timeframe
        );
        setPredictions(newPredictions);

        // Archive predictions for historical analysis
        analyticsExportService.archivePrediction(
          selectedPair,
          selectedMetric,
          newPredictions[0]
        );

        // Update performance metrics
        const metrics = analyticsExportService.calculatePerformanceMetrics(
          selectedPair,
          selectedMetric,
          {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        );
        setPerformanceMetrics(metrics);

        // Check for alerts if thresholds are set
        if (formData.upperThreshold || formData.lowerThreshold) {
          await marketPredictionService.checkPredictionAlerts(
            newPredictions,
            selectedMetric,
            {
              upper: formData.upperThreshold,
              lower: formData.lowerThreshold
            },
            {
              channel: formData.notificationChannel,
              email: userSettings.emailNotifications
            }
          );
        }
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, userSettings.pollingInterval);
    return () => clearInterval(interval);
  }, [
    selectedPair,
    selectedMetric,
    timeframe,
    userSettings.predictiveAnalyticsEnabled,
    userSettings.pollingInterval,
    formData.upperThreshold,
    formData.lowerThreshold,
    formData.notificationChannel
  ]);

  useEffect(() => {
    // Load historical data when showing historical view
    if (showHistorical) {
      const data = analyticsExportService.getHistoricalPredictions(
        selectedPair,
        selectedMetric
      );
      setHistoricalData(data);
    }
  }, [showHistorical, selectedPair, selectedMetric]);

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const predictionParams: PredictionParameters = {
      windowSize: formData.windowSize,
      confidenceLevel: formData.confidenceLevel,
      smoothingFactor: formData.smoothingFactor,
      outlierThreshold: formData.outlierThreshold
    };
    marketPredictionService.updatePredictionParameters(predictionParams);
    setShowSettings(false);
  };

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!chartRef.current) return;
    setExportLoading(true);
    try {
      const fileName = `${selectedPair}-${selectedMetric}-${timeframe}-${Date.now()}`;
      if (type === 'image') {
        await analyticsExportService.exportChartAsImage('prediction-chart', fileName);
      } else {
        await analyticsExportService.exportToPDF('prediction-chart', fileName);
      }
    } catch (error) {
      console.error('Failed to export chart:', error);
    }
    setExportLoading(false);
  };

  const handleShare = async (platform: 'twitter' | 'linkedin') => {
    if (!chartRef.current) return;
    try {
      const imageUrl = await analyticsExportService.exportChartAsImage('prediction-chart', 'temp');
      await analyticsExportService.shareToPlatform(platform, {
        title: `${selectedPair} ${selectedMetric} Prediction`,
        description: `Check out this ${selectedMetric} prediction for ${selectedPair} on our DEX!`,
        imageUrl
      });
    } catch (error) {
      console.error('Failed to share chart:', error);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyticsExportService.submitFeedback({
      userId: 'current-user', // In a real app, get this from auth context
      ...feedbackForm
    });
    setShowFeedback(false);
    setFeedbackForm({ type: 'accuracy', content: '' });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return timeframe === '24h'
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString();
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'price':
        return 'Price';
      case 'volume':
        return 'Trading Volume';
      case 'success_rate':
        return 'Success Rate (%)';
      case 'execution_time':
        return 'Avg. Execution Time (s)';
      default:
        return metric;
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {userSettings.tokenPairs.map(pair => (
              <option key={pair} value={pair}>{pair}</option>
            ))}
          </select>

          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as 'price' | 'volume' | 'success_rate' | 'execution_time')}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="price">Price</option>
            <option value="volume">Trading Volume</option>
            <option value="success_rate">Success Rate</option>
            <option value="execution_time">Execution Time</option>
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as '24h' | '7d' | '30d')}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showSettings ? 'Hide Settings' : 'Show Settings'}
          </button>

          <button
            onClick={() => setShowHistorical(!showHistorical)}
            className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            {showHistorical ? 'Show Live' : 'Show Historical'}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowFeedback(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Feedback
            </button>
          </div>

          <div className="relative">
            <button
              disabled={exportLoading}
              onClick={() => handleExport('image')}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Export PNG
            </button>
          </div>

          <div className="relative">
            <button
              disabled={exportLoading}
              onClick={() => handleExport('pdf')}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Export PDF
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => handleShare('twitter')}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-400 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
            >
              Share Twitter
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Prediction Settings</h4>
          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Window Size (hours)
                </label>
                <input
                  type="number"
                  value={formData.windowSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, windowSize: +e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                  min="1"
                  max="168"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confidence Level
                </label>
                <select
                  value={formData.confidenceLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, confidenceLevel: +e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                >
                  <option value="0.99">99%</option>
                  <option value="0.95">95%</option>
                  <option value="0.90">90%</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Smoothing Factor
                </label>
                <input
                  type="number"
                  value={formData.smoothingFactor}
                  onChange={(e) => setFormData(prev => ({ ...prev, smoothingFactor: +e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                  min="0"
                  max="1"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Outlier Threshold (std dev)
                </label>
                <input
                  type="number"
                  value={formData.outlierThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, outlierThreshold: +e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                  min="1"
                  max="5"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Upper Alert Threshold
                </label>
                <input
                  type="number"
                  value={formData.upperThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, upperThreshold: +e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lower Alert Threshold
                </label>
                <input
                  type="number"
                  value={formData.lowerThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, lowerThreshold: +e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alert Channel
                </label>
                <select
                  value={formData.notificationChannel}
                  onChange={(e) => setFormData(prev => ({ ...prev, notificationChannel: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                >
                  <option value="none">None</option>
                  <option value="push">Push Notification</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply Settings
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        {/* Performance Metrics */}
        {performanceMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Accuracy</h4>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {(performanceMetrics.accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Mean Error</h4>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {(performanceMetrics.meanError * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Confidence Reliability</h4>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {(performanceMetrics.confidenceReliability * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Predictions</h4>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {performanceMetrics.totalPredictions}
              </p>
            </div>
          </div>
        )}

        {/* Predictions Chart */}
        <div id="prediction-chart" ref={chartRef} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            {getMetricLabel(selectedMetric)} {showHistorical ? 'History' : 'Forecast'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={showHistorical ? historicalData : predictions}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTimestamp}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  labelFormatter={formatTimestamp}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#374151' : '#E5E7EB'
                  }}
                  formatter={(value: number) => [value.toFixed(2), '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={showHistorical ? 'actualOutcome' : 'actual'}
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={showHistorical}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey={showHistorical ? 'prediction.predicted' : 'predicted'}
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={showHistorical}
                  name="Predicted"
                />
                {!showHistorical && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="upper"
                      stroke="#6B7280"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name="Upper Bound"
                    />
                    <Line
                      type="monotone"
                      dataKey="lower"
                      stroke="#6B7280"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name="Lower Bound"
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Level Indicator */}
        {!showHistorical && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Prediction Confidence
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${(predictions[0]?.confidence || 0) * 100}%`
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                {((predictions[0]?.confidence || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Dialog */}
      <Dialog
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Submit Feedback
            </Dialog.Title>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Feedback Type
                </label>
                <select
                  value={feedbackForm.type}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, type: e.target.value as 'bug' | 'feature' | 'accuracy' }))}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                >
                  <option value="accuracy">Prediction Accuracy</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={feedbackForm.content}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                  placeholder="Please describe your feedback..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedback(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
  );
} 