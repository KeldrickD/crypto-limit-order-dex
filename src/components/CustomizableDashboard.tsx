'use client';

import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useUserSettings } from '@/context/UserSettingsContext';
import { dashboardService } from '@/services/DashboardService';
import { Dialog } from '@headlessui/react';
import PredictiveAnalytics from './PredictiveAnalytics';
import OrderBook from './OrderBook';
import TradeHistory from './TradeHistory';
import MarketDepth from './MarketDepth';
import AlertsWidget from './AlertsWidget';
import DraggableWidget from './DraggableWidget';
import VolumeAnalysis from './VolumeAnalysis';
import TradingPairs from './TradingPairs';
import PortfolioOverview from './PortfolioOverview';
import NewsWidget from './NewsWidget';

interface ShareDialogState {
  isOpen: boolean;
  users: string[];
  permission: 'view' | 'edit';
}

interface WidgetBase {
  id: string;
  type: keyof typeof widgetComponents;
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
  resizable: boolean;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  settings: {
    tokenPair?: string;
    timeframe?: string;
    metric?: string;
    refreshInterval?: number;
    chartType?: string;
    indicators?: string[];
    theme?: 'light' | 'dark' | 'system';
    alertThresholds?: {
      upper?: number;
      lower?: number;
    };
    [key: string]: unknown;
  };
}

interface DashboardData {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  widgets: WidgetBase[];
  sharedWith: string[];
  permissions: {
    canEdit: string[];
    canView: string[];
  };
}

const widgetComponents = {
  'predictive-analytics': PredictiveAnalytics,
  'order-book': OrderBook,
  'trade-history': TradeHistory,
  'market-depth': MarketDepth,
  'alerts': AlertsWidget,
  'volume-analysis': VolumeAnalysis,
  'trading-pairs': TradingPairs,
  'portfolio-overview': PortfolioOverview,
  'news': NewsWidget,
} as const;

const defaultWidgetSettings: Record<keyof typeof widgetComponents, Partial<WidgetBase['settings']>> = {
  'predictive-analytics': {
    timeframe: '24h',
    metric: 'price',
    chartType: 'line',
    indicators: ['MA', 'RSI'],
    refreshInterval: 60000,
  },
  'order-book': {
    refreshInterval: 1000,
  },
  'trade-history': {
    refreshInterval: 5000,
  },
  'market-depth': {
    refreshInterval: 5000,
    chartType: 'area',
  },
  'alerts': {
    refreshInterval: 30000,
  },
  'volume-analysis': {
    timeframe: '24h',
    chartType: 'bar',
    refreshInterval: 300000,
  },
  'trading-pairs': {
    refreshInterval: 10000,
  },
  'portfolio-overview': {
    refreshInterval: 60000,
    chartType: 'pie',
  },
  'news': {
    refreshInterval: 300000,
  },
};

export default function CustomizableDashboard() {
  const { settings: userSettings } = useUserSettings();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [shareDialog, setShareDialog] = useState<ShareDialogState>({
    isOpen: false,
    users: [],
    permission: 'view'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        const dashboards = await dashboardService.getUserDashboards('current-user');
        if (dashboards.length > 0) {
          setDashboard(dashboards[0] as DashboardData);
        } else {
          // Create a default dashboard
          const defaultDashboard = {
            name: 'My Dashboard',
            description: 'Default trading dashboard',
            createdBy: 'current-user',
            isPublic: false,
            widgets: [
              {
                id: 'widget-1',
                type: 'predictive-analytics' as const,
                position: { x: 0, y: 0, w: 2, h: 2 },
                visible: true,
                resizable: true,
                settings: {
                  tokenPair: userSettings.tokenPairs[0],
                  timeframe: '24h',
                  metric: 'price',
                  chartType: 'line',
                  indicators: ['MA', 'RSI'],
                  refreshInterval: 60000,
                }
              },
              {
                id: 'widget-2',
                type: 'order-book' as const,
                position: { x: 2, y: 0, w: 1, h: 2 },
                visible: true,
                resizable: true,
                settings: {
                  tokenPair: userSettings.tokenPairs[0],
                  refreshInterval: 1000,
                }
              }
            ],
            sharedWith: [],
            permissions: {
              canEdit: [],
              canView: []
            }
          };
          const dashboardId = await dashboardService.saveDashboard(defaultDashboard);
          const newDashboard = await dashboardService.getDashboard(dashboardId);
          setDashboard(newDashboard as DashboardData);
        }
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [userSettings.tokenPairs]);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!dashboard) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = dashboard.widgets.findIndex(w => w.id === active.id);
    const newIndex = dashboard.widgets.findIndex(w => w.id === over.id);

    const updatedWidgets = arrayMove(dashboard.widgets, oldIndex, newIndex);
    const updatedDashboard = { ...dashboard, widgets: updatedWidgets };
    
    try {
      await dashboardService.updateDashboard(dashboard.id, updatedDashboard);
      setDashboard(updatedDashboard);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update widget positions';
      setError(errorMessage);
    }
  };

  const handleWidgetSettingsChange = async (widgetId: string, settings: WidgetBase['settings']) => {
    if (!dashboard) return;

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return;

    const updatedWidgets = [...dashboard.widgets];
    updatedWidgets[widgetIndex] = {
      ...updatedWidgets[widgetIndex],
      settings: {
        ...updatedWidgets[widgetIndex].settings,
        ...settings
      }
    };

    const updatedDashboard = { ...dashboard, widgets: updatedWidgets };
    try {
      await dashboardService.updateDashboard(dashboard.id, updatedDashboard);
      setDashboard(updatedDashboard);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update widget settings';
      setError(errorMessage);
    }
  };

  const handleToggleWidget = async (widgetId: string) => {
    if (!dashboard) return;

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return;

    const updatedWidgets = [...dashboard.widgets];
    updatedWidgets[widgetIndex] = {
      ...updatedWidgets[widgetIndex],
      visible: !updatedWidgets[widgetIndex].visible
    };

    const updatedDashboard = { ...dashboard, widgets: updatedWidgets };
    try {
      await dashboardService.updateDashboard(dashboard.id, updatedDashboard);
      setDashboard(updatedDashboard);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle widget';
      setError(errorMessage);
    }
  };

  const handleShare = async () => {
    if (!dashboard) return;

    try {
      await dashboardService.shareDashboard(
        dashboard.id,
        shareDialog.users,
        shareDialog.permission
      );
      setShareDialog({ isOpen: false, users: [], permission: 'view' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share dashboard';
      setError(errorMessage);
    }
  };

  const handleAddWidget = async (type: keyof typeof widgetComponents) => {
    if (!dashboard) return;

    const newWidget: WidgetBase = {
      id: `widget-${Date.now()}`,
      type,
      position: { x: 0, y: 0, w: 1, h: 1 },
      visible: true,
      resizable: true,
      settings: {
        tokenPair: userSettings.tokenPairs[0],
        ...defaultWidgetSettings[type],
      },
    };

    const updatedDashboard = {
      ...dashboard,
      widgets: [...dashboard.widgets, newWidget],
    };

    try {
      await dashboardService.updateDashboard(dashboard.id, updatedDashboard);
      setDashboard(updatedDashboard);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add widget';
      setError(errorMessage);
    }
  };

  const handleResizeWidget = async (widgetId: string, newSize: { w: number; h: number }) => {
    if (!dashboard || isResizing) return;

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return;

    const widget = dashboard.widgets[widgetIndex];
    if (!widget.resizable) return;

    const updatedWidget = {
      ...widget,
      position: {
        ...widget.position,
        w: Math.max(widget.minW || 1, Math.min(newSize.w, widget.maxW || 4)),
        h: Math.max(widget.minH || 1, Math.min(newSize.h, widget.maxH || 4)),
      },
    };

    const updatedWidgets = [...dashboard.widgets];
    updatedWidgets[widgetIndex] = updatedWidget;

    const updatedDashboard = { ...dashboard, widgets: updatedWidgets };
    try {
      setIsResizing(true);
      await dashboardService.updateDashboard(dashboard.id, updatedDashboard);
      setDashboard(updatedDashboard);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resize widget';
      setError(errorMessage);
    } finally {
      setIsResizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-md">
        {error}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-100 rounded-md">
        No dashboard available
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {dashboard.name}
          </h1>
          {dashboard.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {dashboard.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsConfiguring('add')}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Add Widget
          </button>
          <button
            onClick={() => setShareDialog({ ...shareDialog, isOpen: true })}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Share
          </button>
        </div>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(event) => {
          setIsDragging(false);
          handleDragEnd(event);
        }}
      >
        <div className="grid grid-cols-4 gap-4 min-h-[600px]">
          <SortableContext
            items={dashboard?.widgets.map(w => w.id) || []}
            strategy={rectSortingStrategy}
          >
            {dashboard?.widgets
              .filter(widget => widget.visible)
              .map(widget => (
                <DraggableWidget
                  key={widget.id}
                  widget={widget}
                  onSettingsChange={(settings) => handleWidgetSettingsChange(widget.id, settings)}
                  onToggle={(id) => handleToggleWidget(id)}
                  onResize={(size) => handleResizeWidget(widget.id, size)}
                  isDragging={isDragging}
                >
                  {React.createElement(widgetComponents[widget.type], {
                    ...widget.settings,
                    onError: (error: string) => setError(error),
                  })}
                </DraggableWidget>
              ))}
          </SortableContext>
        </div>
      </DndContext>

      <Dialog
        open={isConfiguring === 'add'}
        onClose={() => setIsConfiguring(null)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Add Widget
            </Dialog.Title>

            <div className="grid grid-cols-2 gap-4">
              {Object.keys(widgetComponents).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    handleAddWidget(type as keyof typeof widgetComponents);
                    setIsConfiguring(null);
                  }}
                  className="p-4 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </h4>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={shareDialog.isOpen}
        onClose={() => setShareDialog({ ...shareDialog, isOpen: false })}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Share Dashboard
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Users (comma-separated emails)
                </label>
                <input
                  type="text"
                  value={shareDialog.users.join(', ')}
                  onChange={(e) => setShareDialog({
                    ...shareDialog,
                    users: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Permission Level
                </label>
                <select
                  value={shareDialog.permission}
                  onChange={(e) => setShareDialog({
                    ...shareDialog,
                    permission: e.target.value as 'view' | 'edit'
                  })}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShareDialog({ ...shareDialog, isOpen: false })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
} 