import { renderHook, act } from '@testing-library/react';
import { usePresets } from '../usePresets';
import { defaultPresets, CUSTOM_PRESETS_KEY } from '@/constants/indicatorPresets';

describe('usePresets', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should initialize with default presets', () => {
    const { result } = renderHook(() => usePresets());
    expect(result.current.presets).toEqual(defaultPresets);
  });

  it('should load custom presets from localStorage', () => {
    const customPreset = {
      name: 'Custom Strategy',
      description: 'My custom trading strategy',
      isCustom: true,
      MA: { periods: [10, 30] },
      RSI: { period: 10 }
    };

    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify([customPreset]));

    const { result } = renderHook(() => usePresets());
    expect(result.current.presets).toHaveLength(defaultPresets.length + 1);
    expect(result.current.presets).toEqual([...defaultPresets, customPreset]);
  });

  it('should save custom preset', () => {
    const { result } = renderHook(() => usePresets());

    const newPreset = {
      MA: { periods: [15, 45] },
      RSI: { period: 12 }
    };

    act(() => {
      result.current.saveCustomPreset('New Strategy', newPreset, 'Test description');
    });

    expect(result.current.presets).toHaveLength(defaultPresets.length + 1);
    expect(result.current.presets[defaultPresets.length]).toEqual({
      name: 'New Strategy',
      description: 'Test description',
      isCustom: true,
      ...newPreset
    });

    // Verify localStorage was updated
    const savedPresets = JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY) || '[]');
    expect(savedPresets).toHaveLength(1);
    expect(savedPresets[0]).toEqual({
      name: 'New Strategy',
      description: 'Test description',
      isCustom: true,
      ...newPreset
    });
  });

  it('should delete custom preset', () => {
    const customPreset = {
      name: 'Custom Strategy',
      description: 'My custom trading strategy',
      isCustom: true,
      MA: { periods: [10, 30] },
      RSI: { period: 10 }
    };

    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify([customPreset]));
    const { result } = renderHook(() => usePresets());

    act(() => {
      result.current.deleteCustomPreset('Custom Strategy');
    });

    expect(result.current.presets).toHaveLength(defaultPresets.length);
    expect(result.current.presets).toEqual(defaultPresets);

    // Verify localStorage was updated
    const savedPresets = JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY) || '[]');
    expect(savedPresets).toHaveLength(0);
  });

  it('should get preset parameters', () => {
    const { result } = renderHook(() => usePresets());

    const params = result.current.getPresetParams(defaultPresets[0].name);
    expect(params).toBeTruthy();
    expect(params).not.toHaveProperty('name');
    expect(params).not.toHaveProperty('description');
    expect(params).not.toHaveProperty('isCustom');
  });

  it('should handle selecting presets', () => {
    const { result } = renderHook(() => usePresets());

    act(() => {
      result.current.setSelectedPreset(defaultPresets[0].name);
    });

    expect(result.current.selectedPreset).toBe(defaultPresets[0].name);

    act(() => {
      result.current.setSelectedPreset(null);
    });

    expect(result.current.selectedPreset).toBeNull();
  });
}); 