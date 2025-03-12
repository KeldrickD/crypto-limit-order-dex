'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  Line,
  Legend,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';
import { MagnifyingGlassIcon as ZoomInIcon, MagnifyingGlassPlusIcon as ZoomOutIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import IndicatorSettings from './IndicatorSettings';
import type {
  AdvancedChartProps,
  ChartData,
  BollingerBands,
  IndicatorParams
} from '@/types/chart';

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startDomain: [number, number] | null;
  lastX: number;
  lastTime: number;
  velocity: number;
}

interface LocalCustomCandlestickProps {
  x: number;
  y: (value: number) => number;
  width: number;
  data: ChartData;
}

const CustomCandlestick = ({ x, y, width, data }: LocalCustomCandlestickProps) => {
  const candleWidth = width * 0.8;
  const wickWidth = 1;
  const isUp = data.close > data.open;
  const color = isUp ? '#10B981' : '#EF4444';
  const bodyHeight = Math.abs(y(data.close) - y(data.open));
  const bodyY = Math.min(y(data.close), y(data.open));

  return (
    <g>
      <line
        x1={x + width / 2}
        y1={y(data.high)}
        x2={x + width / 2}
        y2={y(data.low)}
        stroke={color}
        strokeWidth={wickWidth}
      />
      <rect
        x={x + (width - candleWidth) / 2}
        y={bodyY}
        width={candleWidth}
        height={Math.max(bodyHeight, 1)}
        fill={color}
        stroke="none"
      />
    </g>
  );
};

const calculateMA = (data: ChartData[], period: number): (number | null)[] => {
  return data.map((item, index) => {
    if (index < period - 1) return null;
    const slice = data.slice(index - period + 1, index + 1);
    const sum = slice.reduce((acc, curr) => {
      const closeValue = typeof curr.close === 'number' ? curr.close : 0;
      return acc + closeValue;
    }, 0);
    return sum / period;
  });
};

const calculateRSI = (data: ChartData[], period: number = 14): (number | null)[] => {
  const changes = data.map((item, index) => {
    if (index === 0) return { gain: 0, loss: 0 };
    const prevClose = data[index - 1]?.close;
    const currentClose = item.close;
    if (typeof prevClose !== 'number' || typeof currentClose !== 'number') {
      return { gain: 0, loss: 0 };
    }
    const change = currentClose - prevClose;
    return {
      gain: change > 0 ? change : 0,
      loss: change < 0 ? -change : 0,
    };
  });

  return data.map((_, index) => {
    if (index < period) return null;
    const slice = changes.slice(index - period + 1, index + 1);
    const avgGain = slice.reduce((sum, curr) => sum + curr.gain, 0) / period;
    const avgLoss = slice.reduce((sum, curr) => sum + curr.loss, 0) / period;
    const rs = avgGain / (avgLoss || 1);
    return 100 - (100 / (1 + rs));
  });
};

const calculateBollingerBands = (data: ChartData[], period: number = 20, stdDev: number = 2): (BollingerBands | null)[] => {
  const ma = calculateMA(data, period);
  return ma.map((maValue, index) => {
    if (maValue === null) return null;
    const slice = data.slice(index - period + 1, index + 1);
    const variance = slice.reduce((sum, curr) => {
      const closeValue = typeof curr.close === 'number' ? curr.close : 0;
      return sum + Math.pow(closeValue - maValue, 2);
    }, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    return {
      middle: maValue,
      upper: maValue + standardDeviation * stdDev,
      lower: maValue - standardDeviation * stdDev,
    };
  });
};

const generateMockData = (count: number): ChartData[] => {
  const now = Date.now();
  const data: ChartData[] = [];
  let lastClose = 100;

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (count - i) * 60000).toISOString();
    const open = lastClose + (Math.random() - 0.5) * 2;
    const high = open + Math.random() * 2;
    const low = open - Math.random() * 2;
    const close = (high + low) / 2;
    const volume = Math.floor(Math.random() * 1000000);

    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      time: new Date(timestamp).getTime()
    });

    lastClose = close;
  }

  return data;
};

const calculateMACD = (data: ChartData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} => {
  const fastMA = calculateMA(data, fastPeriod);
  const slowMA = calculateMA(data, slowPeriod);
  const macd = fastMA.map((fast, i) => {
    if (fast === null || slowMA[i] === null) return null;
    return fast - slowMA[i]!;
  });

  const signal = calculateMA(
    macd.map((value, index) => ({
      ...data[index],
      close: value ?? 0,
    })),
    signalPeriod
  );

  const histogram = macd.map((macdValue, i) => {
    if (macdValue === null || signal[i] === null) return null;
    return macdValue - signal[i]!;
  });

  return { macd, signal, histogram };
};

const calculateStochastic = (data: ChartData[], period: number = 14, smoothK: number = 3, smoothD: number = 3): {
  k: (number | null)[];
  d: (number | null)[];
} => {
  const stochValues = data.map((_, index) => {
    if (index < period - 1) return { k: null };
    
    const slice = data.slice(index - period + 1, index + 1);
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));
    const currentClose = data[index].close;
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    return { k };
  });

  // Calculate smooth K
  const smoothedK = stochValues.map((_, index) => {
    if (index < smoothK - 1) return null;
    const slice = stochValues.slice(index - smoothK + 1, index + 1);
    const validK = slice.filter(v => v.k !== null).map(v => v.k!);
    return validK.length ? validK.reduce((a, b) => a + b) / validK.length : null;
  });

  // Calculate D (SMA of smoothed K)
  const d = smoothedK.map((_, index) => {
    if (index < smoothD - 1) return null;
    const slice = smoothedK.slice(index - smoothD + 1, index + 1);
    const validValues = slice.filter(v => v !== null) as number[];
    return validValues.length ? validValues.reduce((a, b) => a + b) / validValues.length : null;
  });

  return { k: smoothedK, d };
};

const calculateADX = (data: ChartData[], period: number = 14): Array<{
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
}> => {
  // Calculate True Range and Directional Movement
  const trDm = data.map((candle, index) => {
    if (index === 0) return { tr: 0, plusDM: 0, minusDM: 0 };
    
    const previousCandle = data[index - 1];
    const tr = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousCandle.close),
      Math.abs(candle.low - previousCandle.close)
    );
    
    const plusDM = candle.high - previousCandle.high > previousCandle.low - candle.low
      ? Math.max(candle.high - previousCandle.high, 0)
      : 0;
    
    const minusDM = previousCandle.low - candle.low > candle.high - previousCandle.high
      ? Math.max(previousCandle.low - candle.low, 0)
      : 0;
    
    return { tr, plusDM, minusDM };
  });

  // Calculate smoothed values
  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;

  const indicators = trDm.map((values, index) => {
    if (index < period) {
      smoothedTR += values.tr;
      smoothedPlusDM += values.plusDM;
      smoothedMinusDM += values.minusDM;
      
      if (index === period - 1) {
        smoothedTR /= period;
        smoothedPlusDM /= period;
        smoothedMinusDM /= period;
      }
      return { adx: null, plusDI: null, minusDI: null };
    }

    smoothedTR = (smoothedTR * (period - 1) + values.tr) / period;
    smoothedPlusDM = (smoothedPlusDM * (period - 1) + values.plusDM) / period;
    smoothedMinusDM = (smoothedMinusDM * (period - 1) + values.minusDM) / period;

    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;
    
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    
    return { plusDI, minusDI, dx };
  });

  // Calculate ADX (smoothed DX)
  let adxSum = 0;
  const adxValues: (number | null)[] = indicators.map((values, index) => {
    if (index < period * 2 - 1 || !values.dx) return null;
    
    if (index === period * 2 - 1) {
      for (let i = period; i < period * 2; i++) {
        adxSum += indicators[i].dx!;
      }
      return adxSum / period;
    }
    
    const prevADX = adxValues[index - 1] ?? 0;
    return (prevADX * (period - 1) + values.dx) / period;
  });

  return indicators.map((values, index) => ({
    adx: adxValues[index],
    plusDI: values.plusDI ?? null,
    minusDI: values.minusDI ?? null,
  }));
};

export default function AdvancedChart({
  data: initialData,
  width,
  height,
  onZoom,
  onPan,
  onError,
}: AdvancedChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>(() => {
    const data = initialData || generateMockData(100);
    return data.map(d => ({
      ...d,
      time: new Date(d.timestamp).getTime(),
    })) as ChartData[];
  });
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);
  const [indicatorParams, setIndicatorParams] = useState<IndicatorParams>({
    MA: { periods: [20, 50, 200] },
    RSI: { period: 14 },
    'Bollinger Bands': { period: 20, stdDev: 2 },
    MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    Stochastic: { period: 14, smoothK: 3, smoothD: 3 },
    ADX: { period: 14 },
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startDomain: null,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const { theme } = useTheme();
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        const newDomain: [number, number] = [0, chartData.length - 1];
        setZoomDomain(newDomain);
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [chartData.length]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent text selection
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const currentTime = Date.now();
    
    setDragState({
      isDragging: true,
      startX: clientX,
      startY: 0,
      startDomain: zoomDomain || [0, chartData.length - 1],
      lastX: clientX,
      lastTime: currentTime,
      velocity: 0,
    });
  }, [chartData.length, zoomDomain]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState.isDragging || !dragState.startDomain) return;

    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const currentTime = Date.now();
    const timeDelta = currentTime - dragState.lastTime;
    const velocity = timeDelta > 0 ? (clientX - dragState.lastX) / timeDelta : 0;

    const moveAmount = Math.round(((clientX - dragState.startX) / width) * chartData.length);

    if (moveAmount !== 0) {
      const newStart = Math.max(0, dragState.startDomain[0] - moveAmount);
      const newEnd = Math.min(chartData.length - 1, dragState.startDomain[1] - moveAmount);

      if (newStart !== dragState.startDomain[0] || newEnd !== dragState.startDomain[1]) {
        setZoomDomain([newStart, newEnd]);
        onPan?.([newStart, newEnd]);
      }
    }

    setDragState(prev => ({
      ...prev,
      lastX: clientX,
      lastTime: currentTime,
      velocity: velocity,
    }));
  }, [dragState, chartData.length, width, onPan]);

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging) return;

    // Apply momentum if velocity is significant
    if (Math.abs(dragState.velocity) > 0.5) {
      const momentum = dragState.velocity * 100; // Adjust this multiplier to control momentum strength
      const currentDomain = zoomDomain || [0, chartData.length - 1];
      const moveAmount = Math.round((momentum / width) * chartData.length);
      
      const newStart = Math.max(0, currentDomain[0] - moveAmount);
      const newEnd = Math.min(chartData.length - 1, currentDomain[1] - moveAmount);
      
      // Animate to final position
      requestAnimationFrame(() => {
        setZoomDomain([newStart, newEnd]);
        onPan?.([newStart, newEnd]);
      });
    }

    setDragState(prev => ({ ...prev, isDragging: false, velocity: 0 }));
  }, [dragState, chartData.length, width, zoomDomain, onPan]);

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Replace with actual API call
        const mockData: ChartData[] = Array.from({ length: 100 }, (_, i) => {
          const basePrice = 2500;
          const volatility = 50;
          const timestamp = new Date(Date.now() - (99 - i) * 3600000);
          const open = basePrice + (Math.random() - 0.5) * volatility;
          const close = basePrice + (Math.random() - 0.5) * volatility;
          const high = Math.max(open, close) + Math.random() * volatility * 0.5;
          const low = Math.min(open, close) - Math.random() * volatility * 0.5;
          const volume = Math.random() * 1000;

          return {
            timestamp: timestamp.toISOString(),
            open,
            high,
            low,
            close,
            volume,
            time: timestamp.getTime()
          };
        });

        // Calculate indicators
        const enrichedData: ChartData[] = mockData.map((candle, index) => {
          const enriched: ChartData = { ...candle };

          if (activeIndicators.includes('MA')) {
            const periods = indicatorParams.MA?.periods || [20, 50, 200];
            periods.forEach(period => {
              const ma = calculateMA(mockData, period)[index];
              if (ma !== null) enriched[`ma${period}`] = ma;
            });
          }

          if (activeIndicators.includes('RSI')) {
            const period = indicatorParams.RSI?.period || 14;
            const rsi = calculateRSI(mockData, period)[index];
            if (rsi !== null) enriched.rsi = rsi;
          }

          if (activeIndicators.includes('Bollinger Bands')) {
            const { period = 20, stdDev = 2 } = indicatorParams['Bollinger Bands'] || {};
            const bands = calculateBollingerBands(mockData, period, stdDev)[index];
            if (bands !== null) {
              enriched.upperBand = bands.upper;
              enriched.lowerBand = bands.lower;
              enriched.middleBand = bands.middle;
            }
          }

          if (activeIndicators.includes('MACD')) {
            const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = indicatorParams.MACD || {};
            const { macd, signal, histogram } = calculateMACD(mockData, fastPeriod, slowPeriod, signalPeriod);
            if (macd[index] !== null) enriched.macd = macd[index];
            if (signal[index] !== null) enriched.signal = signal[index];
            if (histogram[index] !== null) enriched.histogram = histogram[index];
          }

          if (activeIndicators.includes('Stochastic')) {
            const { period = 14, smoothK = 3, smoothD = 3 } = indicatorParams.Stochastic || {};
            const { k, d } = calculateStochastic(mockData, period, smoothK, smoothD);
            if (k[index] !== null) enriched.stochK = k[index];
            if (d[index] !== null) enriched.stochD = d[index];
          }

          if (activeIndicators.includes('ADX')) {
            const { period = 14 } = indicatorParams.ADX || {};
            const adxData = calculateADX(mockData, period)[index];
            if (adxData.adx !== null) enriched.adx = adxData.adx;
            if (adxData.plusDI !== null) enriched.plusDI = adxData.plusDI;
            if (adxData.minusDI !== null) enriched.minusDI = adxData.minusDI;
          }

          return enriched;
        });

        setChartData(enrichedData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chart data';
        onError?.(new Error(errorMessage));
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [activeIndicators, onError, indicatorParams]);

  const handleZoomIn = useCallback(() => {
    if (!chartData.length) return;
    const currentDomain = zoomDomain || [0, chartData.length - 1];
    const newDomain: [number, number] = [
      currentDomain[0] + Math.floor((currentDomain[1] - currentDomain[0]) * 0.25),
      currentDomain[1] - Math.floor((currentDomain[1] - currentDomain[0]) * 0.25),
    ];
    setZoomDomain(newDomain);
    onZoom?.(newDomain);
  }, [chartData.length, zoomDomain, onZoom]);

  const handleZoomOut = useCallback(() => {
    if (!chartData.length) return;
    const currentDomain = zoomDomain || [0, chartData.length - 1];
    const newDomain: [number, number] = [
      Math.max(0, currentDomain[0] - Math.floor((currentDomain[1] - currentDomain[0]) * 0.5)),
      Math.min(chartData.length - 1, currentDomain[1] + Math.floor((currentDomain[1] - currentDomain[0]) * 0.5)),
    ];
    setZoomDomain(newDomain);
  }, [chartData.length, zoomDomain]);

  const handleResetZoom = useCallback(() => {
    setZoomDomain(null);
  }, []);

  const calculateIndicators = (data: ChartData[], params: IndicatorParams) => {
    const updatedData = data.map(point => {
      const newPoint = { ...point };
      
      // Calculate Moving Averages
      if (params.MA?.periods) {
        params.MA.periods.forEach(period => {
          const values = data
            .slice(Math.max(0, data.indexOf(point) - period + 1), data.indexOf(point) + 1)
            .map(d => d.close);
          const ma = values.reduce((sum, val) => sum + val, 0) / values.length;
          newPoint[`ma${period}`] = ma;
        });
      }

      // Calculate RSI
      if (params.RSI?.period) {
        const period = params.RSI.period;
        if (data.indexOf(point) >= period) {
          const changes = data
            .slice(data.indexOf(point) - period, data.indexOf(point))
            .map((d, i, arr) => i > 0 ? d.close - arr[i - 1].close : 0);
          
          const gains = changes.filter(change => change > 0);
          const losses = changes.filter(change => change < 0).map(loss => Math.abs(loss));
          
          const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
          const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;
          
          const rs = avgGain / (avgLoss || 1);
          newPoint.rsi = 100 - (100 / (1 + rs));
        }
      }

      // Calculate Bollinger Bands
      if (params['Bollinger Bands']?.period && params['Bollinger Bands']?.stdDev) {
        const { period, stdDev } = params['Bollinger Bands'];
        if (data.indexOf(point) >= period) {
          const bands = calculateBollingerBands(data, period, stdDev)[data.indexOf(point)];
          if (bands) {
            newPoint.upperBand = bands.upper;
            newPoint.lowerBand = bands.lower;
            newPoint.middleBand = bands.middle;
          }
        }
      }
      
      // Calculate MACD
      if (params.MACD) {
        const { fastPeriod, slowPeriod, signalPeriod } = params.MACD;
        const macdData = calculateMACD(data, fastPeriod, slowPeriod, signalPeriod);
        const index = data.indexOf(point);
        if (macdData.macd[index] !== null) newPoint.macd = macdData.macd[index];
        if (macdData.signal[index] !== null) newPoint.signal = macdData.signal[index];
        if (macdData.histogram[index] !== null) newPoint.histogram = macdData.histogram[index];
      }

      // Calculate Stochastic
      if (params.Stochastic) {
        const { period, smoothK, smoothD } = params.Stochastic;
        const stochData = calculateStochastic(data, period, smoothK, smoothD);
        const index = data.indexOf(point);
        if (stochData.k[index] !== null) newPoint.stochK = stochData.k[index];
        if (stochData.d[index] !== null) newPoint.stochD = stochData.d[index];
      }

      // Calculate ADX
      if (params.ADX) {
        const { period } = params.ADX;
        const adxData = calculateADX(data, period)[data.indexOf(point)];
        if (adxData.adx !== null) newPoint.adx = adxData.adx;
        if (adxData.plusDI !== null) newPoint.plusDI = adxData.plusDI;
        if (adxData.minusDI !== null) newPoint.minusDI = adxData.minusDI;
      }
      
      return newPoint;
    });

    setChartData(updatedData);
  };

  const handleIndicatorParamsChange = (newParams: IndicatorParams) => {
    setIndicatorParams(newParams);
    calculateIndicators(chartData, newParams);
  };

  const renderCandlestick = () => {
    return (
      <g>
        {chartData.map((entry, index) => {
          const xPos = (index * width) / chartData.length;
          const yScale = (value: number) => {
            const [min, max] = [
              Math.min(...chartData.map(d => d.low)),
              Math.max(...chartData.map(d => d.high))
            ];
            const chartHeight = height - 20; // Leave space for x-axis
            return chartHeight - ((value - min) / (max - min)) * chartHeight;
          };

          return (
            <CustomCandlestick
              key={`candle-${index}`}
              data={entry}
              x={xPos}
              y={yScale}
              width={width / chartData.length}
            />
          );
        })}
      </g>
    );
  };

  const renderVolume = () => (
    <Bar
      dataKey="volume"
      fill={theme === 'dark' ? '#4B5563' : '#E5E7EB'}
      opacity={0.3}
      yAxisId="volume"
    />
  );

  const renderIndicators = () => {
    const elements = [];

    if (activeIndicators.includes('MA')) {
      elements.push(
        <Line
          key="ma20"
          type="monotone"
          dataKey="ma20"
          stroke="#3B82F6"
          dot={false}
          strokeWidth={1}
          name="MA(20)"
          yAxisId="price"
        />,
        <Line
          key="ma50"
          type="monotone"
          dataKey="ma50"
          stroke="#8B5CF6"
          dot={false}
          strokeWidth={1}
          name="MA(50)"
          yAxisId="price"
        />,
        <Line
          key="ma200"
          type="monotone"
          dataKey="ma200"
          stroke="#EC4899"
          dot={false}
          strokeWidth={1}
          name="MA(200)"
          yAxisId="price"
        />
      );
    }

    if (activeIndicators.includes('Bollinger Bands')) {
      elements.push(
        <Line
          key="upperBand"
          type="monotone"
          dataKey="upperBand"
          stroke="#9CA3AF"
          dot={false}
          strokeWidth={1}
          strokeDasharray="3 3"
          name="Upper BB"
          yAxisId="price"
        />,
        <Line
          key="lowerBand"
          type="monotone"
          dataKey="lowerBand"
          stroke="#9CA3AF"
          dot={false}
          strokeWidth={1}
          strokeDasharray="3 3"
          name="Lower BB"
          yAxisId="price"
        />
      );
    }

    if (activeIndicators.includes('Stochastic')) {
      elements.push(
        <Line
          key="stochK"
          type="monotone"
          dataKey="stochK"
          stroke="#F59E0B"
          dot={false}
          strokeWidth={1}
          name="%K"
          yAxisId="secondary"
        />,
        <Line
          key="stochD"
          type="monotone"
          dataKey="stochD"
          stroke="#10B981"
          dot={false}
          strokeWidth={1}
          name="%D"
          yAxisId="secondary"
        />
      );
    }

    if (activeIndicators.includes('ADX')) {
      elements.push(
        <Line
          key="adx"
          type="monotone"
          dataKey="adx"
          stroke="#6366F1"
          dot={false}
          strokeWidth={1}
          name="ADX"
          yAxisId="secondary"
        />,
        <Line
          key="plusDI"
          type="monotone"
          dataKey="plusDI"
          stroke="#10B981"
          dot={false}
          strokeWidth={1}
          name="+DI"
          yAxisId="secondary"
        />,
        <Line
          key="minusDI"
          type="monotone"
          dataKey="minusDI"
          stroke="#EF4444"
          dot={false}
          strokeWidth={1}
          name="-DI"
          yAxisId="secondary"
        />
      );
    }

    return elements;
  };

  const handleIndicatorToggle = (indicator: string) => {
    setActiveIndicators(current => {
      const newIndicators = current.includes(indicator)
        ? current.filter(i => i !== indicator)
        : [...current, indicator];
      return newIndicators;
    });
  };

  // Add cursor styles during drag
  const chartStyle = {
    cursor: dragState.isDragging ? 'grabbing' : 'grab',
    touchAction: dragState.isDragging ? 'none' : 'auto',
    userSelect: 'none' as const,
  };

  return (
    <div className="relative w-full h-full">
      <div 
        className="h-full flex flex-col" 
        ref={chartRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        style={chartStyle}
      >
        <div className="flex justify-end space-x-2 mb-2">
          <button
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Zoom In"
          >
            <ZoomInIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Zoom Out"
          >
            <ZoomOutIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Reset Zoom"
          >
            <ArrowsPointingOutIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                stroke={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
                domain={zoomDomain || ['auto', 'auto']}
              />
              <YAxis
                yAxisId="price"
                orientation="right"
                stroke={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
                domain={['auto', 'auto']}
              />
              <YAxis
                yAxisId="volume"
                orientation="left"
                stroke={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
                domain={['auto', 'auto']}
              />
              <YAxis
                yAxisId="secondary"
                orientation="left"
                stroke={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
                domain={[0, 100]}
                hide={!activeIndicators.includes('Stochastic') && !activeIndicators.includes('ADX')}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF',
                  borderColor: theme === 'dark' ? '#4B5563' : '#E5E7EB',
                }}
                formatter={(value: number) => [
                  `$${value.toFixed(2)}`,
                  typeof value === 'number' ? 'Price' : '',
                ]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{
                  paddingBottom: '20px',
                  color: theme === 'dark' ? '#9CA3AF' : '#4B5563',
                }}
              />
              {renderCandlestick()}
              {renderVolume()}
              {renderIndicators()}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-300 rounded-md shadow hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Indicator Settings
        </button>
        {['MA', 'RSI', 'Bollinger Bands', 'MACD', 'Stochastic', 'ADX'].map(indicator => (
          <button
            key={indicator}
            onClick={() => handleIndicatorToggle(indicator)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              activeIndicators.includes(indicator)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {indicator}
          </button>
        ))}
      </div>

      <IndicatorSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeIndicators={activeIndicators}
        params={indicatorParams}
        onChange={handleIndicatorParamsChange}
      />
    </div>
  );
} 