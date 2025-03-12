import { useState, useEffect, useCallback } from 'react';
import type { IndicatorParams } from '@/types/chart';
import { defaultPresets, PresetConfig, CUSTOM_PRESETS_KEY } from '@/constants/indicatorPresets';

export function usePresets() {
  const [presets, setPresets] = useState<PresetConfig[]>([...defaultPresets]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Load custom presets from localStorage
  useEffect(() => {
    const loadCustomPresets = () => {
      try {
        const savedPresets = localStorage.getItem(CUSTOM_PRESETS_KEY);
        if (savedPresets) {
          const customPresets = JSON.parse(savedPresets) as PresetConfig[];
          setPresets([...defaultPresets, ...customPresets]);
        }
      } catch (error) {
        console.error('Error loading custom presets:', error);
      }
    };

    loadCustomPresets();
  }, []);

  // Save custom presets to localStorage
  const saveCustomPreset = useCallback((name: string, params: IndicatorParams, description: string = '') => {
    try {
      const customPresets = presets.filter(p => p.isCustom);
      const newPreset: PresetConfig = {
        name,
        description,
        ...params,
        isCustom: true,
      };

      // Replace if preset with same name exists
      const existingIndex = customPresets.findIndex(p => p.name === name);
      if (existingIndex >= 0) {
        customPresets[existingIndex] = newPreset;
      } else {
        customPresets.push(newPreset);
      }

      localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(customPresets));
      setPresets([...defaultPresets, ...customPresets]);
      return true;
    } catch (error) {
      console.error('Error saving custom preset:', error);
      return false;
    }
  }, [presets]);

  // Delete a custom preset
  const deleteCustomPreset = useCallback((name: string) => {
    try {
      const customPresets = presets.filter(p => p.isCustom && p.name !== name);
      localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(customPresets));
      setPresets([...defaultPresets, ...customPresets]);
      if (selectedPreset === name) {
        setSelectedPreset(null);
      }
      return true;
    } catch (error) {
      console.error('Error deleting custom preset:', error);
      return false;
    }
  }, [presets, selectedPreset]);

  // Get preset parameters by name
  const getPresetParams = useCallback((name: string): IndicatorParams | null => {
    const preset = presets.find(p => p.name === name);
    if (!preset) return null;

    // Extract only the indicator parameters
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: _name, description: _desc, isCustom: _custom, ...params } = preset;
    return params;
  }, [presets]);

  return {
    presets,
    selectedPreset,
    setSelectedPreset,
    saveCustomPreset,
    deleteCustomPreset,
    getPresetParams,
  };
} 