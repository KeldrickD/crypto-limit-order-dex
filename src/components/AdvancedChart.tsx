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

interface CandlestickData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorData {
  ma20?: number;
  ma50?: number;
  ma200?: number;
  rsi?: number;
  upperBand?: number;
  lowerBand?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  stochK?: number;
  stochD?: number;
  adx?: number;
  plusDI?: number;
  minusDI?: number;
}

type ChartData = CandlestickData & IndicatorData;

interface AdvancedChartProps {
  tokenPair: string;
  timeframe?: string;
  chartType?: string;
  indicators?: string[];
  refreshInterval?: number;
  onError?: (error: string) => void;
}

const calculateMA = (data: CandlestickData[], period: number) => {
  return data.map((item, index) => {
    if (index < period - 1) return null;
    const sum = data
      .slice(index - period + 1, index + 1)
      .reduce((acc, curr) => acc + curr.close, 0);
    return sum / period;
  });
};

const calculateRSI = (data: CandlestickData[], period: number = 14) => {
  const changes = data.map((item, index) => {
    if (index === 0) return { gain: 0, loss: 0 };
    const change = item.close - data[index - 1].close;
    return {
      gain: change > 0 ? change : 0,
      loss: change < 0 ? -change : 0,
    };
  });

  const avgGain = changes.map((_, index) => {
    if (index < period) return null;
    const gains = changes.slice(index - period + 1, index + 1).map(c => c.gain);
    return gains.reduce((acc, curr) => acc + curr, 0) / period;
  });

  const avgLoss = changes.map((_, index) => {
    if (index < period) return null;
    const losses = changes.slice(index - period + 1, index + 1).map(c => c.loss);
    return losses.reduce((acc, curr) => acc + curr, 0) / period;
  });

  return avgGain.map((gain, index) => {
    if (gain === null) return null;
    const loss = avgLoss[index]!;
    const rs = gain / loss;
    return 100 - (100 / (1 + rs));
  });
};

const calculateBollingerBands = (data: CandlestickData[], period: number = 20, stdDev: number = 2) => {
  const ma = calculateMA(data, period);
  const bands = ma.map((ma, index) => {
    if (ma === null) return { upper: null, lower: null };
    const slice = data.slice(index - period + 1, index + 1);
    const std = Math.sqrt(
      slice.reduce((acc, curr) => acc + Math.pow(curr.close - ma, 2), 0) / period
    );
    return {
      upper: ma + stdDev * std,
      lower: ma - stdDev * std,
    };
  });
  return bands;
};

const calculateMACD = (data: CandlestickData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const fastMA = calculateMA(data, fastPeriod);
  const slowMA = calculateMA(data, slowPeriod);
  const macd = fastMA.map((fast, index) => {
    if (fast === null || slowMA[index] === null) return null;
    return fast - slowMA[index]!;
  });

  const signal = calculateMA(
    macd.map((value, index) => ({ close: value || 0, timestamp: data[index].timestamp } as CandlestickData)),
    signalPeriod
  );

  const histogram = macd.map((value, index) => {
    if (value === null || signal[index] === null) return null;
    return value - signal[index]!;
  });

  return { macd, signal, histogram };
};

const calculateStochastic = (data: CandlestickData[], period: number = 14, smoothK: number = 3, smoothD: number = 3) => {
  const stochValues = data.map((_, index) => {
    if (index < period - 1) return { k: null, d: null };
    
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

const calculateADX = (data: CandlestickData[], period: number = 14): Array<{
  adx: number | undefined;
  plusDI: number | undefined;
  minusDI: number | undefined;
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
  const adx: Array<number | undefined> = indicators.map((values, index) => {
    if (index < period * 2 - 1 || !values.dx) return undefined;
    
    if (index === period * 2 - 1) {
      for (let i = period; i < period * 2; i++) {
        adxSum += indicators[i].dx!;
      }
      return adxSum / period;
    }
    
    const prevADX: number = adx[index - 1] ?? 0;
    return (prevADX * (period - 1) + values.dx) / period;
  });

  return indicators.map((values, index) => ({
    adx: adx[index],
    plusDI: values.plusDI ?? undefined,
    minusDI: values.minusDI ?? undefined,
  }));
};

interface CustomCandlestickProps {
  x: number;
  y: (value: number) => number;
  width: number;
  data: ChartData;
}

const CustomCandlestick = ({ x, y, width, data }: CustomCandlestickProps) => {
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

export default function AdvancedChart({
  tokenPair,
  timeframe = '1h',
  chartType = 'candlestick',
  indicators = ['MA'],
  refreshInterval = 60000,
  onError
}: AdvancedChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const { theme } = useTheme();
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        setChartDimensions({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Replace with actual API call
        const mockData: CandlestickData[] = Array.from({ length: 100 }, (_, i) => {
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
          };
        });

        // Calculate indicators
        const enrichedData: ChartData[] = mockData.map((candle, index) => {
          const enriched: ChartData = { ...candle };

          if (indicators.includes('MA')) {
            const ma20 = calculateMA(mockData, 20)[index];
            const ma50 = calculateMA(mockData, 50)[index];
            const ma200 = calculateMA(mockData, 200)[index];
            if (ma20) enriched.ma20 = ma20;
            if (ma50) enriched.ma50 = ma50;
            if (ma200) enriched.ma200 = ma200;
          }

          if (indicators.includes('RSI')) {
            const rsi = calculateRSI(mockData)[index];
            if (rsi) enriched.rsi = rsi;
          }

          if (indicators.includes('Bollinger Bands')) {
            const bands = calculateBollingerBands(mockData)[index];
            if (bands.upper) enriched.upperBand = bands.upper;
            if (bands.lower) enriched.lowerBand = bands.lower;
          }

          if (indicators.includes('MACD')) {
            const { macd, signal, histogram } = calculateMACD(mockData);
            if (macd[index]) enriched.macd = macd[index];
            if (signal[index]) enriched.signal = signal[index];
            if (histogram[index]) enriched.histogram = histogram[index];
          }

          if (indicators.includes('Stochastic')) {
            const { k, d } = calculateStochastic(mockData);
            if (k[index]) enriched.stochK = k[index];
            if (d[index]) enriched.stochD = d[index];
          }

          if (indicators.includes('ADX')) {
            const adxData = calculateADX(mockData)[index];
            if (adxData) {
              enriched.adx = adxData.adx;
              enriched.plusDI = adxData.plusDI;
              enriched.minusDI = adxData.minusDI;
            }
          }

          return enriched;
        });

        setData(enrichedData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chart data';
        onError?.(errorMessage);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [tokenPair, timeframe, indicators, refreshInterval, onError]);

  const handleZoomIn = useCallback(() => {
    if (!data.length) return;
    const currentDomain = zoomDomain || [0, data.length - 1];
    const newDomain: [number, number] = [
      currentDomain[0] + Math.floor((currentDomain[1] - currentDomain[0]) * 0.25),
      currentDomain[1] - Math.floor((currentDomain[1] - currentDomain[0]) * 0.25),
    ];
    setZoomDomain(newDomain);
  }, [data.length, zoomDomain]);

  const handleZoomOut = useCallback(() => {
    if (!data.length) return;
    const currentDomain = zoomDomain || [0, data.length - 1];
    const newDomain: [number, number] = [
      Math.max(0, currentDomain[0] - Math.floor((currentDomain[1] - currentDomain[0]) * 0.5)),
      Math.min(data.length - 1, currentDomain[1] + Math.floor((currentDomain[1] - currentDomain[0]) * 0.5)),
    ];
    setZoomDomain(newDomain);
  }, [data.length, zoomDomain]);

  const handleResetZoom = useCallback(() => {
    setZoomDomain(null);
  }, []);

  const renderCandlestick = () => {
    if (chartType === 'candlestick' && chartDimensions.width > 0 && chartDimensions.height > 0) {
      return (
        <g>
          {data.map((entry, index) => {
            const xPos = (index * chartDimensions.width) / data.length;
            const yScale = (value: number) => {
              const [min, max] = [
                Math.min(...data.map(d => d.low)),
                Math.max(...data.map(d => d.high))
              ];
              const chartHeight = chartDimensions.height - 20; // Leave space for x-axis
              return chartHeight - ((value - min) / (max - min)) * chartHeight;
            };

            return (
              <CustomCandlestick
                key={`candle-${index}`}
                data={entry}
                x={xPos}
                y={yScale}
                width={chartDimensions.width / data.length}
              />
            );
          })}
        </g>
      );
    }

    return (
      <Line
        type="monotone"
        dataKey="close"
        stroke={theme === 'dark' ? '#10B981' : '#047857'}
        dot={false}
        strokeWidth={2}
        yAxisId="price"
      />
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

    if (indicators.includes('MA')) {
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

    if (indicators.includes('Bollinger Bands')) {
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

    if (indicators.includes('Stochastic')) {
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

    if (indicators.includes('ADX')) {
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

  return (
    <div className="h-full flex flex-col" ref={chartRef}>
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
          <ComposedChart data={data}>
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
              hide={!indicators.includes('Stochastic') && !indicators.includes('ADX')}
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
  );
} 