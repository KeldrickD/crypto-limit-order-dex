'use client';

import { Fragment } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';

interface WidgetSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  widget: {
    id: string;
    type: string;
    settings: {
      tokenPair?: string;
      timeframe?: string;
      metric?: string;
      refreshInterval?: number;
      chartType?: string;
      indicators?: string[];
      theme?: 'light' | 'dark' | 'system';
      alertThresholds?: {
        upper?: number;
        lower?: number;
      };
      [key: string]: unknown;
    };
  };
  onSettingsChange: (settings: WidgetSettingsProps['widget']['settings']) => void;
  availableTokenPairs: string[];
}

const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1d', '1w'];
const CHART_TYPES = ['line', 'candlestick', 'bar', 'area'];
const INDICATORS = ['MA', 'EMA', 'RSI', 'MACD', 'Bollinger Bands', 'Volume'];
const REFRESH_INTERVALS = [
  { label: '1 second', value: 1000 },
  { label: '5 seconds', value: 5000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '5 minutes', value: 300000 },
];

export default function WidgetSettings({
  isOpen,
  onClose,
  widget,
  onSettingsChange,
  availableTokenPairs
}: WidgetSettingsProps) {
  const handleChange = (key: string, value: unknown) => {
    onSettingsChange({
      ...widget.settings,
      [key]: value,
    });
  };

  const handleIndicatorToggle = (indicator: string) => {
    const currentIndicators = widget.settings.indicators || [];
    const newIndicators = currentIndicators.includes(indicator)
      ? currentIndicators.filter(i => i !== indicator)
      : [...currentIndicators, indicator];
    handleChange('indicators', newIndicators);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={onClose}
      >
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          <span
            className="inline-block h-screen align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
              >
                Widget Settings
              </Dialog.Title>

              <Tab.Group>
                <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-700 p-1 mt-4">
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                      ${
                        selected
                          ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/[0.12] hover:text-blue-600'
                      }`
                    }
                  >
                    General
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                      ${
                        selected
                          ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/[0.12] hover:text-blue-600'
                      }`
                    }
                  >
                    Display
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                      ${
                        selected
                          ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/[0.12] hover:text-blue-600'
                      }`
                    }
                  >
                    Advanced
                  </Tab>
                </Tab.List>

                <Tab.Panels className="mt-4">
                  <Tab.Panel className="space-y-4">
                    {/* General Settings */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Token Pair
                      </label>
                      <select
                        value={widget.settings.tokenPair}
                        onChange={(e) => handleChange('tokenPair', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700"
                      >
                        {availableTokenPairs.map((pair) => (
                          <option key={pair} value={pair}>
                            {pair}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Timeframe
                      </label>
                      <select
                        value={widget.settings.timeframe}
                        onChange={(e) => handleChange('timeframe', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700"
                      >
                        {TIMEFRAMES.map((timeframe) => (
                          <option key={timeframe} value={timeframe}>
                            {timeframe}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Refresh Interval
                      </label>
                      <select
                        value={widget.settings.refreshInterval}
                        onChange={(e) => handleChange('refreshInterval', Number(e.target.value))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700"
                      >
                        {REFRESH_INTERVALS.map(({ label, value }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Tab.Panel>

                  <Tab.Panel className="space-y-4">
                    {/* Display Settings */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Chart Type
                      </label>
                      <select
                        value={widget.settings.chartType}
                        onChange={(e) => handleChange('chartType', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700"
                      >
                        {CHART_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Indicators
                      </label>
                      <div className="space-y-2">
                        {INDICATORS.map((indicator) => (
                          <label
                            key={indicator}
                            className="inline-flex items-center mr-4"
                          >
                            <input
                              type="checkbox"
                              checked={(widget.settings.indicators || []).includes(indicator)}
                              onChange={() => handleIndicatorToggle(indicator)}
                              className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              {indicator}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </Tab.Panel>

                  <Tab.Panel className="space-y-4">
                    {/* Advanced Settings */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Alert Thresholds
                      </label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400">
                            Upper
                          </label>
                          <input
                            type="number"
                            value={widget.settings.alertThresholds?.upper || ''}
                            onChange={(e) =>
                              handleChange('alertThresholds', {
                                ...widget.settings.alertThresholds,
                                upper: Number(e.target.value),
                              })
                            }
                            className="mt-1 block w-full px-3 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400">
                            Lower
                          </label>
                          <input
                            type="number"
                            value={widget.settings.alertThresholds?.lower || ''}
                            onChange={(e) =>
                              handleChange('alertThresholds', {
                                ...widget.settings.alertThresholds,
                                lower: Number(e.target.value),
                              })
                            }
                            className="mt-1 block w-full px-3 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
} 