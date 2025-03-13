import type { IndicatorParams } from '@/types/chart';

export interface PresetConfig extends IndicatorParams {
  name: string;
  description: string;
  isCustom?: boolean;
}

export const defaultPresets: PresetConfig[] = [
  {
    name: 'Trend Following',
    description: 'Moving averages and ADX for trend identification',
    MA: { periods: [20, 50, 200] },
    ADX: { period: 14 }
  },
  {
    name: 'Momentum Trading',
    description: 'RSI and MACD for momentum analysis',
    RSI: { period: 14 },
    MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
  },
  {
    name: 'Volatility Trading',
    description: 'Bollinger Bands and Stochastic for volatility analysis',
    'Bollinger Bands': { period: 20, stdDev: 2 },
    Stochastic: { period: 14, smoothK: 3, smoothD: 3 }
  }
];

export const CUSTOM_PRESETS_KEY = 'chartCustomPresets'; 