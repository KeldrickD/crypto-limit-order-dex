export interface ChartData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
  ma20?: number;
  ma50?: number;
  ma200?: number;
  rsi?: number;
  upperBand?: number;
  lowerBand?: number;
  middleBand?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  stochK?: number;
  stochD?: number;
  adx?: number;
  plusDI?: number;
  minusDI?: number;
}

export interface BollingerBands {
  upper: number;
  lower: number;
  middle: number;
}

export interface ChartData extends ChartData {
  [key: string]: string | number | undefined | BollingerBands;
}

export interface MAParams {
  periods: number[];
}

export interface RSIParams {
  period: number;
}

export interface BollingerBandsParams {
  period: number;
  stdDev: number;
}

export interface MACDParams {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export interface StochasticParams {
  period: number;
  smoothK: number;
  smoothD: number;
}

export interface ADXParams {
  period: number;
}

export interface IndicatorParams {
  MA?: MAParams;
  RSI?: RSIParams;
  'Bollinger Bands'?: BollingerBandsParams;
  MACD?: MACDParams;
  Stochastic?: StochasticParams;
  ADX?: ADXParams;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startDomain: [number, number] | null;
}

export interface AdvancedChartProps {
  data?: ChartData[];
  width?: number;
  height?: number;
  onZoom?: (domain: [number, number]) => void;
  onPan?: (domain: [number, number]) => void;
  onError?: (error: Error) => void;
}

export interface CustomCandlestickProps {
  x: number;
  y: (value: number) => number;
  width: number;
  data: ChartData;
}

export interface IndicatorSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicators: string[];
  params: IndicatorParams;
  onChange: (params: IndicatorParams) => void;
} 