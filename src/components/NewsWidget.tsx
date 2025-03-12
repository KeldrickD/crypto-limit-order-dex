'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface NewsWidgetProps {
  refreshInterval?: number;
  onError?: (error: string) => void;
}

export default function NewsWidget({
  refreshInterval = 300000,
  onError
}: NewsWidgetProps) {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // TODO: Replace with actual API call
        const mockNews: NewsItem[] = [
          {
            id: '1',
            title: 'Major Exchange Lists New DeFi Token',
            summary: 'A leading cryptocurrency exchange has announced the listing of a promising new DeFi token, causing market excitement.',
            source: 'CryptoNews',
            url: '#',
            publishedAt: new Date(Date.now() - 3600000).toISOString(),
            sentiment: 'positive'
          },
          {
            id: '2',
            title: 'Market Analysis: Bitcoin Price Movement',
            summary: 'Technical analysis suggests Bitcoin may be forming a new support level after recent price action.',
            source: 'TradingView',
            url: '#',
            publishedAt: new Date(Date.now() - 7200000).toISOString(),
            sentiment: 'neutral'
          },
          {
            id: '3',
            title: 'Regulatory Updates in Crypto Markets',
            summary: 'New regulatory framework proposed for cryptocurrency trading and exchanges.',
            source: 'CryptoDaily',
            url: '#',
            publishedAt: new Date(Date.now() - 10800000).toISOString(),
            sentiment: 'negative'
          }
        ];
        
        setNews(mockNews);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch news';
        onError?.(errorMessage);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, onError]);

  const getSentimentColor = (sentiment: NewsItem['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'negative':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-4 h-full">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Market News
      </h3>
      <div className="space-y-4 overflow-y-auto max-h-[calc(100%-2rem)]">
        {news.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-base font-medium text-gray-900 dark:text-white">
                {item.title}
              </h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(item.sentiment)}`}>
                {item.sentiment}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {item.summary}
            </p>
            <div className="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500">
              <span>{item.source}</span>
              <span>{formatTimeAgo(item.publishedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 