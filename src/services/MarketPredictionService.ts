import { notificationService } from './NotificationService';
import { useUserSettings } from '@/context/UserSettingsContext';

export interface MarketData {
  timestamp: number;
  price: number;
  volume: number;
  success_rate: number;
  execution_time: number;
}

export interface PredictionResult {
  timestamp: string;
  actual: number | null;
  predicted: number;
  lower: number;
  upper: number;
  confidence: number;
}

export interface PredictionParameters {
  windowSize: number;
  confidenceLevel: number;
  smoothingFactor: number;
  outlierThreshold: number;
}

class MarketPredictionService {
  private static instance: MarketPredictionService;
  private historicalData: Map<string, MarketData[]> = new Map();
  private predictionParams: PredictionParameters = {
    windowSize: 24,
    confidenceLevel: 0.95,
    smoothingFactor: 0.2,
    outlierThreshold: 2.5
  };

  private constructor() {}

  public static getInstance(): MarketPredictionService {
    if (!MarketPredictionService.instance) {
      MarketPredictionService.instance = new MarketPredictionService();
    }
    return MarketPredictionService.instance;
  }

  public async fetchLiveMarketData(
    tokenPair: string,
    timeframe: '24h' | '7d' | '30d'
  ): Promise<MarketData[]> {
    try {
      // In a real implementation, this would fetch from your market data API
      // For now, we'll simulate live data
      const endTime = Date.now();
      const startTime = this.getStartTime(timeframe);
      const interval = this.getInterval(timeframe);
      
      const data: MarketData[] = [];
      for (let time = startTime; time <= endTime; time += interval) {
        data.push({
          timestamp: time,
          price: this.simulatePrice(time, tokenPair),
          volume: this.simulateVolume(time),
          success_rate: this.simulateSuccessRate(time),
          execution_time: this.simulateExecutionTime(time)
        });
      }

      this.historicalData.set(tokenPair, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      throw error;
    }
  }

  public async generatePredictions(
    tokenPair: string,
    metric: 'price' | 'volume' | 'success_rate' | 'execution_time',
    timeframe: '24h' | '7d' | '30d'
  ): Promise<PredictionResult[]> {
    const historicalData = this.historicalData.get(tokenPair) || [];
    if (historicalData.length === 0) {
      await this.fetchLiveMarketData(tokenPair, timeframe);
    }

    const data = this.historicalData.get(tokenPair) || [];
    return this.predictMetric(data, metric);
  }

  public updatePredictionParameters(params: Partial<PredictionParameters>): void {
    this.predictionParams = { ...this.predictionParams, ...params };
  }

  public getPredictionParameters(): PredictionParameters {
    return { ...this.predictionParams };
  }

  private predictMetric(data: MarketData[], metric: string): PredictionResult[] {
    const values = data.map(d => d[metric as keyof MarketData] as number);
    const timestamps = data.map(d => d.timestamp);

    // Simple exponential smoothing for prediction
    const predictions: PredictionResult[] = [];
    const { smoothingFactor, confidenceLevel, outlierThreshold } = this.predictionParams;

    let lastSmoothed = values[0];
    const now = Date.now();
    const futurePoints = 24; // Predict next 24 points

    // Calculate standard deviation for confidence intervals
    const std = this.calculateStandardDeviation(values);
    const zScore = this.getZScore(confidenceLevel);

    // Generate predictions
    for (let i = 0; i < futurePoints; i++) {
      const timestamp = new Date(now + i * 3600000).toISOString();
      const actual = i === 0 ? values[values.length - 1] : null;

      // Exponential smoothing prediction
      lastSmoothed = smoothingFactor * (actual || lastSmoothed) + (1 - smoothingFactor) * lastSmoothed;
      
      // Add some randomness for simulation
      const noise = (Math.random() - 0.5) * std * 0.1;
      const predicted = lastSmoothed + noise;

      // Calculate confidence intervals
      const margin = zScore * std;
      const confidence = 1 - (margin / predicted);

      predictions.push({
        timestamp,
        actual,
        predicted,
        lower: predicted - margin,
        upper: predicted + margin,
        confidence
      });
    }

    return predictions;
  }

  private getStartTime(timeframe: '24h' | '7d' | '30d'): number {
    const now = Date.now();
    switch (timeframe) {
      case '24h':
        return now - 24 * 60 * 60 * 1000;
      case '7d':
        return now - 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return now - 30 * 24 * 60 * 60 * 1000;
    }
  }

  private getInterval(timeframe: '24h' | '7d' | '30d'): number {
    switch (timeframe) {
      case '24h':
        return 5 * 60 * 1000; // 5 minutes
      case '7d':
        return 60 * 60 * 1000; // 1 hour
      case '30d':
        return 4 * 60 * 60 * 1000; // 4 hours
    }
  }

  private simulatePrice(timestamp: number, tokenPair: string): number {
    // Simulate price based on sine wave with some randomness
    const basePrice = tokenPair.includes('BTC') ? 50000 : 2000;
    const amplitude = basePrice * 0.1;
    const period = 24 * 60 * 60 * 1000; // 24 hours
    return basePrice + amplitude * Math.sin(2 * Math.PI * timestamp / period) + 
           (Math.random() - 0.5) * amplitude;
  }

  private simulateVolume(timestamp: number): number {
    return 1000 + Math.random() * 9000;
  }

  private simulateSuccessRate(timestamp: number): number {
    return 85 + Math.random() * 15;
  }

  private simulateExecutionTime(timestamp: number): number {
    return 10 + Math.random() * 50;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squaredDiffs = values.map(x => Math.pow(x - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / values.length);
  }

  private getZScore(confidenceLevel: number): number {
    // Approximate z-scores for common confidence levels
    if (confidenceLevel >= 0.99) return 2.576;
    if (confidenceLevel >= 0.98) return 2.326;
    if (confidenceLevel >= 0.95) return 1.96;
    if (confidenceLevel >= 0.90) return 1.645;
    return 1.0;
  }

  public async checkPredictionAlerts(
    predictions: PredictionResult[],
    metric: string,
    thresholds: { upper: number; lower: number },
    notificationSettings: { channel: string; email?: string }
  ): Promise<void> {
    const latestPrediction = predictions[0];
    if (!latestPrediction) return;

    if (latestPrediction.predicted > thresholds.upper) {
      await notificationService.notify(
        notificationSettings.channel as any,
        notificationSettings.email,
        {
          title: `${metric} Alert: High Prediction`,
          message: `${metric} is predicted to reach ${latestPrediction.predicted.toFixed(2)} (above ${thresholds.upper})`,
          type: 'priceAlert',
          orderId: 0,
          timestamp: new Date(),
          data: { metric, prediction: latestPrediction }
        }
      );
    } else if (latestPrediction.predicted < thresholds.lower) {
      await notificationService.notify(
        notificationSettings.channel as any,
        notificationSettings.email,
        {
          title: `${metric} Alert: Low Prediction`,
          message: `${metric} is predicted to fall to ${latestPrediction.predicted.toFixed(2)} (below ${thresholds.lower})`,
          type: 'priceAlert',
          orderId: 0,
          timestamp: new Date(),
          data: { metric, prediction: latestPrediction }
        }
      );
    }
  }
}

export const marketPredictionService = MarketPredictionService.getInstance(); 