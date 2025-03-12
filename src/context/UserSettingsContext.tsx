'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type NotificationChannel = 'push' | 'email' | 'none';
export type NotificationEvent = 'executed' | 'cancelled' | 'partiallyFilled' | 'priceAlert';
export type ChartType = 'pie' | 'bar' | 'line' | 'area';

export interface DashboardWidget {
  id: string;
  type: 'analytics' | 'orderBook' | 'chart' | 'predictive';
  position: number;
  visible: boolean;
  settings?: Record<string, any>;
}

export interface UserSettings {
  pollingInterval: number;
  notificationChannels: Record<NotificationEvent, NotificationChannel>;
  emailNotifications: string;
  preferredChartTypes: Record<string, ChartType>;
  dashboardLayout: DashboardWidget[];
  tokenPairs: string[];
  exportFormat: 'csv' | 'pdf' | 'excel';
  predictiveAnalyticsEnabled: boolean;
}

const defaultSettings: UserSettings = {
  pollingInterval: 10000, // 10 seconds
  notificationChannels: {
    executed: 'push',
    cancelled: 'push',
    partiallyFilled: 'push',
    priceAlert: 'email'
  },
  emailNotifications: '',
  preferredChartTypes: {
    statusDistribution: 'pie',
    executionTime: 'bar',
    priceHistory: 'line',
    volumeAnalysis: 'area'
  },
  dashboardLayout: [
    { id: 'analytics', type: 'analytics', position: 0, visible: true },
    { id: 'orderBook', type: 'orderBook', position: 1, visible: true },
    { id: 'priceChart', type: 'chart', position: 2, visible: true },
    { id: 'predictive', type: 'predictive', position: 3, visible: true }
  ],
  tokenPairs: ['ETH/USDC', 'WBTC/USDC', 'USDT/USDC'],
  exportFormat: 'csv',
  predictiveAnalyticsEnabled: true
};

interface UserSettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateDashboardLayout: (widgets: DashboardWidget[]) => void;
  toggleWidget: (widgetId: string) => void;
  updateNotificationChannel: (event: NotificationEvent, channel: NotificationChannel) => void;
  updatePollingInterval: (interval: number) => void;
  addTokenPair: (pair: string) => void;
  removeTokenPair: (pair: string) => void;
  updateChartType: (chartId: string, type: ChartType) => void;
  resetSettings: () => void;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('userSettings');
      return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    }
    return defaultSettings;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSettings', JSON.stringify(settings));
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateDashboardLayout = (widgets: DashboardWidget[]) => {
    setSettings(prev => ({ ...prev, dashboardLayout: widgets }));
  };

  const toggleWidget = (widgetId: string) => {
    setSettings(prev => ({
      ...prev,
      dashboardLayout: prev.dashboardLayout.map(widget =>
        widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
      )
    }));
  };

  const updateNotificationChannel = (event: NotificationEvent, channel: NotificationChannel) => {
    setSettings(prev => ({
      ...prev,
      notificationChannels: { ...prev.notificationChannels, [event]: channel }
    }));
  };

  const updatePollingInterval = (interval: number) => {
    setSettings(prev => ({ ...prev, pollingInterval: interval }));
  };

  const addTokenPair = (pair: string) => {
    setSettings(prev => ({
      ...prev,
      tokenPairs: [...new Set([...prev.tokenPairs, pair])]
    }));
  };

  const removeTokenPair = (pair: string) => {
    setSettings(prev => ({
      ...prev,
      tokenPairs: prev.tokenPairs.filter(p => p !== pair)
    }));
  };

  const updateChartType = (chartId: string, type: ChartType) => {
    setSettings(prev => ({
      ...prev,
      preferredChartTypes: { ...prev.preferredChartTypes, [chartId]: type }
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <UserSettingsContext.Provider value={{
      settings,
      updateSettings,
      updateDashboardLayout,
      toggleWidget,
      updateNotificationChannel,
      updatePollingInterval,
      addTokenPair,
      removeTokenPair,
      updateChartType,
      resetSettings
    }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
} 