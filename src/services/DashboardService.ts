import { encrypt, decrypt } from '@/utils/encryption';
import { v4 as uuidv4 } from 'uuid';

export interface WidgetConfig {
  id: string;
  type: 'predictive-analytics' | 'order-book' | 'trade-history' | 'market-depth' | 'alerts';
  position: { x: number; y: number; w: number; h: number };
  settings: {
    tokenPair?: string;
    timeframe?: string;
    metric?: string;
    chartType?: string;
    indicators?: string[];
    alertThresholds?: { upper?: number; lower?: number };
    refreshInterval?: number;
  };
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  widgets: WidgetConfig[];
  sharedWith: string[];
  permissions: {
    canEdit: string[];
    canView: string[];
  };
  locale?: string;
}

export interface ModelInsight {
  metricType: string;
  tokenPair: string;
  accuracy: number;
  recommendations: string[];
  lastUpdated: Date;
}

interface EncryptedWidget extends Omit<WidgetConfig, 'settings'> {
  settings: string;
}

interface EncryptedDashboard extends Omit<DashboardConfig, 'widgets'> {
  widgets: EncryptedWidget[];
}

interface DecryptedWidget extends Omit<WidgetConfig, 'settings'> {
  settings: WidgetConfig['settings'];
}

interface DecryptedDashboard extends Omit<DashboardConfig, 'widgets'> {
  widgets: DecryptedWidget[];
}

class DashboardService {
  private static instance: DashboardService;
  private readonly storageKey = 'dex_dashboards';
  private readonly insightsKey = 'model_insights';

  private constructor() {}

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  async saveDashboard(config: Omit<DecryptedDashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const dashboards = await this.getAllDashboards();
    const newDashboard: DecryptedDashboard = {
      ...config,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const encryptedConfig = this.encryptDashboardData(newDashboard);
    dashboards.push(encryptedConfig);
    await this.persistDashboards(dashboards);
    return newDashboard.id;
  }

  async updateDashboard(id: string, updates: Partial<DecryptedDashboard>): Promise<void> {
    const dashboards = await this.getAllDashboards();
    const index = dashboards.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Dashboard not found');

    const dashboard = this.decryptDashboardData(dashboards[index]);
    if (!this.canEditDashboard(dashboard)) {
      throw new Error('Insufficient permissions');
    }

    const updatedDashboard = {
      ...dashboard,
      ...updates,
      updatedAt: new Date()
    };

    dashboards[index] = this.encryptDashboardData(updatedDashboard);
    await this.persistDashboards(dashboards);
  }

  async shareDashboard(id: string, users: string[], permission: 'view' | 'edit'): Promise<void> {
    const dashboards = await this.getAllDashboards();
    const dashboard = dashboards.find(d => d.id === id);
    if (!dashboard) throw new Error('Dashboard not found');

    const decryptedDashboard = this.decryptDashboardData(dashboard);
    if (!this.canEditDashboard(decryptedDashboard)) {
      throw new Error('Insufficient permissions');
    }

    const updatedDashboard = {
      ...decryptedDashboard,
      sharedWith: Array.from(new Set([...decryptedDashboard.sharedWith, ...users])),
      permissions: {
        ...decryptedDashboard.permissions,
        [permission === 'edit' ? 'canEdit' : 'canView']: Array.from(
          new Set([...decryptedDashboard.permissions[permission === 'edit' ? 'canEdit' : 'canView'], ...users])
        )
      },
      updatedAt: new Date()
    };

    await this.updateDashboard(id, updatedDashboard);
  }

  async getDashboard(id: string): Promise<DecryptedDashboard> {
    const dashboards = await this.getAllDashboards();
    const dashboard = dashboards.find(d => d.id === id);
    if (!dashboard) throw new Error('Dashboard not found');

    const decryptedDashboard = this.decryptDashboardData(dashboard);
    if (!this.canViewDashboard(decryptedDashboard)) {
      throw new Error('Insufficient permissions');
    }

    return decryptedDashboard;
  }

  async getUserDashboards(userId: string): Promise<DecryptedDashboard[]> {
    const dashboards = await this.getAllDashboards();
    return dashboards
      .filter(d => {
        const decrypted = this.decryptDashboardData(d);
        return (
          decrypted.createdBy === userId ||
          decrypted.sharedWith.includes(userId) ||
          decrypted.isPublic
        );
      })
      .map(d => this.decryptDashboardData(d));
  }

  async saveModelInsights(insights: ModelInsight[]): Promise<void> {
    const encryptedInsights = insights.map(insight => ({
      ...insight,
      recommendations: encrypt(JSON.stringify(insight.recommendations))
    }));
    localStorage.setItem(this.insightsKey, JSON.stringify(encryptedInsights));
  }

  async getModelInsights(metricType: string, tokenPair: string): Promise<ModelInsight | null> {
    const storedInsights = localStorage.getItem(this.insightsKey);
    if (!storedInsights) return null;

    const insights: ModelInsight[] = JSON.parse(storedInsights).map((insight: ModelInsight & { recommendations: string }) => ({
      ...insight,
      recommendations: JSON.parse(decrypt(insight.recommendations))
    }));

    return insights.find(i => i.metricType === metricType && i.tokenPair === tokenPair) || null;
  }

  private async getAllDashboards(): Promise<EncryptedDashboard[]> {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  private async persistDashboards(dashboards: EncryptedDashboard[]): Promise<void> {
    localStorage.setItem(this.storageKey, JSON.stringify(dashboards));
  }

  private canEditDashboard(dashboard: DecryptedDashboard): boolean {
    const currentUser = 'current-user'; // Replace with actual user ID from auth
    return dashboard.createdBy === currentUser || dashboard.permissions.canEdit.includes(currentUser);
  }

  private canViewDashboard(dashboard: DecryptedDashboard): boolean {
    const currentUser = 'current-user'; // Replace with actual user ID from auth
    return (
      dashboard.isPublic ||
      dashboard.createdBy === currentUser ||
      dashboard.sharedWith.includes(currentUser)
    );
  }

  private encryptDashboardData(dashboard: DecryptedDashboard): EncryptedDashboard {
    return {
      ...dashboard,
      widgets: dashboard.widgets.map(widget => ({
        ...widget,
        settings: encrypt(JSON.stringify(widget.settings))
      }))
    };
  }

  private decryptDashboardData(dashboard: EncryptedDashboard): DecryptedDashboard {
    return {
      ...dashboard,
      widgets: dashboard.widgets.map(widget => ({
        ...widget,
        settings: JSON.parse(decrypt(widget.settings))
      }))
    };
  }
}

export const dashboardService = DashboardService.getInstance(); 