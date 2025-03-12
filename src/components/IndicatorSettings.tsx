'use client';

import { Fragment, useState, useCallback, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type {
  IndicatorParams,
  IndicatorSettingsProps,
  MAParams,
  RSIParams,
  BollingerBandsParams,
  MACDParams,
  StochasticParams,
  ADXParams
} from '@/types/chart';

interface ValidationRules {
  [key: string]: {
    [param: string]: {
      min: number;
      max: number;
      step: number;
      description: string;
    };
  };
}

const validationRules: ValidationRules = {
  MA: {
    periods: {
      min: 1,
      max: 500,
      step: 1,
      description: 'Number of periods to calculate the moving average. Common values are 20 (short-term), 50 (medium-term), and 200 (long-term) periods.'
    }
  },
  RSI: {
    period: {
      min: 2,
      max: 100,
      step: 1,
      description: 'Number of periods used to calculate RSI. Standard is 14 periods. Lower values increase sensitivity.'
    }
  },
  'Bollinger Bands': {
    period: {
      min: 5,
      max: 100,
      step: 1,
      description: 'Number of periods for the moving average. Standard is 20 periods.'
    },
    stdDev: {
      min: 0.1,
      max: 5,
      step: 0.1,
      description: 'Number of standard deviations for the bands. Standard is 2. Higher values create wider bands.'
    }
  },
  MACD: {
    fastPeriod: {
      min: 2,
      max: 100,
      step: 1,
      description: 'Number of periods for the fast EMA. Standard is 12 periods.'
    },
    slowPeriod: {
      min: 2,
      max: 100,
      step: 1,
      description: 'Number of periods for the slow EMA. Standard is 26 periods.'
    },
    signalPeriod: {
      min: 2,
      max: 100,
      step: 1,
      description: 'Number of periods for the signal line. Standard is 9 periods.'
    }
  },
  Stochastic: {
    period: {
      min: 1,
      max: 100,
      step: 1,
      description: 'Look-back period for highest high and lowest low. Standard is 14 periods.'
    },
    smoothK: {
      min: 1,
      max: 10,
      step: 1,
      description: 'Smoothing for %K line. Standard is 3 periods.'
    },
    smoothD: {
      min: 1,
      max: 10,
      step: 1,
      description: 'Smoothing for %D line. Standard is 3 periods.'
    }
  },
  ADX: {
    period: {
      min: 2,
      max: 100,
      step: 1,
      description: 'Number of periods for ADX calculation. Standard is 14 periods.'
    }
  }
} as const;

const defaultParams: Required<IndicatorParams> = {
  MA: { periods: [20, 50, 200] },
  RSI: { period: 14 },
  'Bollinger Bands': { period: 20, stdDev: 2 },
  MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  Stochastic: { period: 14, smoothK: 3, smoothD: 3 },
  ADX: { period: 14 },
};

type FullIndicatorParams = {
  MA: MAParams;
  RSI: RSIParams;
  'Bollinger Bands': BollingerBandsParams;
  MACD: MACDParams;
  Stochastic: StochasticParams;
  ADX: ADXParams;
};

export default function IndicatorSettings({
  isOpen,
  onClose,
  activeIndicators,
  params,
  onChange,
}: IndicatorSettingsProps) {
  const [localParams, setLocalParams] = useState<FullIndicatorParams>(() => ({
    ...defaultParams,
    ...params,
  }));
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [showTooltip, setShowTooltip] = useState<{indicator: string; param: string} | null>(null);

  useEffect(() => {
    setLocalParams(prev => ({
      ...prev,
      ...params,
    }));
  }, [params]);

  const validateAndUpdate = useCallback((
    indicator: keyof FullIndicatorParams,
    param: string,
    value: string | number
  ) => {
    const newParams = { ...localParams };
    const newErrors = { ...errors };

    if (indicator === 'MA' && param === 'periods') {
      const periods = String(value).split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
      const rules = validationRules[indicator][param];
      const invalidPeriods = periods.filter(p => p < rules.min || p > rules.max);
      
      if (invalidPeriods.length > 0) {
        newErrors[indicator] = {
          ...newErrors[indicator],
          [param]: `Periods must be between ${rules.min} and ${rules.max}`
        };
      } else {
        delete newErrors[indicator]?.[param];
        newParams[indicator].periods = periods;
      }
    } else {
      const rules = validationRules[indicator][param];
      const numValue = typeof value === 'string' ? parseFloat(value) : value;

      if (isNaN(numValue) || numValue < rules.min || numValue > rules.max) {
        newErrors[indicator] = {
          ...newErrors[indicator],
          [param]: `Value must be between ${rules.min} and ${rules.max}`
        };
      } else {
        delete newErrors[indicator]?.[param];
        if (indicator === 'RSI' || indicator === 'ADX') {
          (newParams[indicator] as { period: number }).period = numValue;
        } else if (indicator === 'Bollinger Bands') {
          const bb = newParams[indicator] as BollingerBandsParams;
          if (param === 'period') bb.period = numValue;
          if (param === 'stdDev') bb.stdDev = numValue;
        } else if (indicator === 'MACD') {
          const macd = newParams[indicator] as MACDParams;
          if (param === 'fastPeriod') macd.fastPeriod = numValue;
          if (param === 'slowPeriod') macd.slowPeriod = numValue;
          if (param === 'signalPeriod') macd.signalPeriod = numValue;
        } else if (indicator === 'Stochastic') {
          const stoch = newParams[indicator] as StochasticParams;
          if (param === 'period') stoch.period = numValue;
          if (param === 'smoothK') stoch.smoothK = numValue;
          if (param === 'smoothD') stoch.smoothD = numValue;
        }
      }
    }

    if (newErrors[indicator] && Object.keys(newErrors[indicator]).length === 0) {
      delete newErrors[indicator];
    }

    setErrors(newErrors);
    setLocalParams(newParams);

    // Only trigger onChange if there are no errors
    if (Object.keys(newErrors).length === 0) {
      onChange(newParams);
    }
  }, [localParams, errors, onChange]);

  const renderTooltip = (indicator: string, param: string) => {
    if (showTooltip?.indicator === indicator && showTooltip?.param === param) {
      return (
        <div className="absolute z-50 w-64 p-2 text-sm bg-gray-900 text-white rounded shadow-lg mt-1">
          {validationRules[indicator][param].description}
        </div>
      );
    }
    return null;
  };

  const renderInput = (
    indicator: keyof FullIndicatorParams,
    param: string,
    value: number | number[],
    type: 'number' | 'text' = 'number'
  ) => {
    const rules = validationRules[indicator][param];
    const error = errors[indicator]?.[param];

    return (
      <div className="relative">
        <div className="flex items-center">
          <label className="block text-sm text-gray-600 dark:text-gray-400">
            {param.charAt(0).toUpperCase() + param.slice(1)}
          </label>
          <button
            type="button"
            className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onMouseEnter={() => setShowTooltip({ indicator, param })}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <InformationCircleIcon className="h-4 w-4" />
          </button>
        </div>
        {renderTooltip(indicator, param)}
        <input
          type={type}
          step={rules.step}
          min={rules.min}
          max={rules.max}
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => validateAndUpdate(indicator, param, e.target.value)}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-sm
            ${error 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'}
            dark:bg-gray-700`}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
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

          <span className="inline-block h-screen align-middle" aria-hidden="true">
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
                Indicator Settings
              </Dialog.Title>

              <div className="mt-4 space-y-6">
                {activeIndicators.includes('MA') && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Moving Averages</h4>
                    <div className="mt-2">
                      {renderInput('MA', 'periods', localParams.MA.periods, 'text')}
                    </div>
                  </div>
                )}

                {activeIndicators.includes('RSI') && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">RSI</h4>
                    <div className="mt-2">
                      {renderInput('RSI', 'period', localParams.RSI.period)}
                    </div>
                  </div>
                )}

                {activeIndicators.includes('Bollinger Bands') && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Bollinger Bands</h4>
                    <div className="mt-2 space-y-3">
                      {renderInput('Bollinger Bands', 'period', localParams['Bollinger Bands'].period)}
                      {renderInput('Bollinger Bands', 'stdDev', localParams['Bollinger Bands'].stdDev)}
                    </div>
                  </div>
                )}

                {activeIndicators.includes('MACD') && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">MACD</h4>
                    <div className="mt-2 space-y-3">
                      {renderInput('MACD', 'fastPeriod', localParams.MACD.fastPeriod)}
                      {renderInput('MACD', 'slowPeriod', localParams.MACD.slowPeriod)}
                      {renderInput('MACD', 'signalPeriod', localParams.MACD.signalPeriod)}
                    </div>
                  </div>
                )}

                {activeIndicators.includes('Stochastic') && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Stochastic</h4>
                    <div className="mt-2 space-y-3">
                      {renderInput('Stochastic', 'period', localParams.Stochastic.period)}
                      {renderInput('Stochastic', 'smoothK', localParams.Stochastic.smoothK)}
                      {renderInput('Stochastic', 'smoothD', localParams.Stochastic.smoothD)}
                    </div>
                  </div>
                )}

                {activeIndicators.includes('ADX') && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">ADX</h4>
                    <div className="mt-2">
                      {renderInput('ADX', 'period', localParams.ADX.period)}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setLocalParams({
                      ...defaultParams,
                      ...params,
                    });
                    setErrors({});
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (Object.keys(errors).length === 0) {
                      onChange(localParams);
                      onClose();
                    }
                  }}
                  disabled={Object.keys(errors).length > 0}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${Object.keys(errors).length > 0
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Apply
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
} 