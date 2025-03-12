'use client';

import { Fragment, useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { InformationCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import debounce from 'lodash/debounce';
import { usePresets } from '@/hooks/usePresets';
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
  onPreview,
}: IndicatorSettingsProps & { onPreview?: (params: IndicatorParams) => void }) {
  const [localParams, setLocalParams] = useState<FullIndicatorParams>(() => ({
    ...defaultParams,
    ...params,
  }));
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [showTooltip, setShowTooltip] = useState<{indicator: string; param: string} | null>(null);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);
  const [presetSearch, setPresetSearch] = useState('');
  const [showPresetPreview, setShowPresetPreview] = useState<string | null>(null);

  const {
    presets,
    selectedPreset,
    setSelectedPreset,
    saveCustomPreset,
    deleteCustomPreset,
    getPresetParams,
  } = usePresets();

  const debouncedPreview = useMemo(
    () => debounce((params: IndicatorParams) => {
      if (onPreview && isPreviewEnabled) {
        onPreview(params);
      }
    }, 300),
    [onPreview, isPreviewEnabled]
  );

  useEffect(() => {
    return () => {
      debouncedPreview.cancel();
    };
  }, [debouncedPreview]);

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

    if (Object.keys(newErrors).length === 0) {
      debouncedPreview(newParams);
    }
  }, [localParams, errors, debouncedPreview]);

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

  const handlePresetSelect = useCallback((presetName: string | null) => {
    if (!presetName) {
      setSelectedPreset(null);
      return;
    }

    const presetParams = getPresetParams(presetName);
    if (presetParams) {
      setSelectedPreset(presetName);
      setLocalParams(prev => ({
        ...prev,
        ...presetParams,
      }));
      if (isPreviewEnabled) {
        debouncedPreview(presetParams);
      }
    }
  }, [getPresetParams, setSelectedPreset, debouncedPreview, isPreviewEnabled]);

  const handleSavePreset = useCallback(() => {
    if (!newPresetName.trim()) return;

    const success = saveCustomPreset(
      newPresetName.trim(),
      localParams,
      newPresetDescription.trim()
    );

    if (success) {
      setNewPresetName('');
      setNewPresetDescription('');
      setShowSavePreset(false);
      setSelectedPreset(newPresetName.trim());
    }
  }, [newPresetName, newPresetDescription, localParams, saveCustomPreset, setSelectedPreset]);

  const handleDeletePreset = useCallback((name: string) => {
    const success = deleteCustomPreset(name);
    if (success) {
      setPresetToDelete(null);
    }
  }, [deleteCustomPreset]);

  const handleExportPresets = useCallback(() => {
    const customPresets = presets.filter(p => p.isCustom);
    const dataStr = JSON.stringify(customPresets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'indicator-presets.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [presets]);

  const handleImportPresets = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedPresets = JSON.parse(e.target?.result as string);
        importedPresets.forEach((preset: PresetConfig) => {
          saveCustomPreset(preset.name, preset, preset.description);
        });
      } catch (error) {
        console.error('Error importing presets:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }, [saveCustomPreset]);

  const filteredPresets = useMemo(() => {
    const searchTerm = presetSearch.toLowerCase();
    return presets.filter(preset => 
      preset.name.toLowerCase().includes(searchTerm) ||
      preset.description?.toLowerCase().includes(searchTerm)
    );
  }, [presets, presetSearch]);

  const renderPresetPreview = (preset: PresetConfig) => {
    if (showPresetPreview !== preset.name) return null;

    const params = getPresetParams(preset.name);
    if (!params) return null;

    return (
      <div className="absolute z-50 w-72 p-3 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
        <h5 className="font-medium text-sm mb-2 text-gray-900 dark:text-white">Preset Settings</h5>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          {Object.entries(params).map(([indicator, settings]) => (
            <div key={indicator}>
              <span className="font-medium">{indicator}:</span>{' '}
              {Object.entries(settings).map(([key, value]) => (
                <span key={key}>
                  {key}: {Array.isArray(value) ? value.join(', ') : value}
                </span>
              )).join(', ')}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPresetSelector = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Presets</h4>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={presetSearch}
            onChange={(e) => setPresetSearch(e.target.value)}
            placeholder="Search presets..."
            className="px-3 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            type="button"
            onClick={() => setShowSavePreset(true)}
            className="inline-flex items-center px-2 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Save Current
          </button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportPresets}
              className="hidden"
              id="preset-import"
            />
            <label
              htmlFor="preset-import"
              className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer"
            >
              Import
            </label>
          </div>
          <button
            type="button"
            onClick={handleExportPresets}
            className="px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Export
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {filteredPresets.map((preset) => (
          <div
            key={preset.name}
            className={`relative group p-2 rounded-md cursor-pointer border ${
              selectedPreset === preset.name
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
            }`}
            onClick={() => handlePresetSelect(preset.name)}
            onMouseEnter={() => setShowPresetPreview(preset.name)}
            onMouseLeave={() => setShowPresetPreview(null)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-gray-900 dark:text-white">
                {preset.name}
              </span>
              {preset.isCustom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPresetToDelete(preset.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {preset.description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {preset.description}
              </p>
            )}
            {renderPresetPreview(preset)}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      {presetToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setPresetToDelete(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Delete Preset
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete the preset &ldquo;{presetToDelete}&rdquo;? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setPresetToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePreset(presetToDelete)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Preset Dialog */}
      {showSavePreset && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowSavePreset(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Save Current Settings as Preset
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Preset Name
                  </label>
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-sm dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Enter preset name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description (optional)
                  </label>
                  <textarea
                    value={newPresetDescription}
                    onChange={(e) => setNewPresetDescription(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm text-sm dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                    placeholder="Enter preset description"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowSavePreset(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    disabled={!newPresetName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save Preset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

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
                {renderPresetSelector()}

                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Live Preview</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isPreviewEnabled}
                      onChange={(e) => setIsPreviewEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                      Enable live preview
                    </span>
                  </label>
                </div>

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
                    setSelectedPreset(null);
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