/**
 * Analytics Service
 * 
 * Provides production analytics, metrics, and reporting
 */

import { offlineSync } from './offlineSync';

interface ProductionMetrics {
  date: string;
  workOrdersCompleted: number;
  totalQuantity: number;
  avgRecoveryRate: number;
  totalInputKg: number;
  totalOutputKg: number;
  wasteKg: number;
  downtimeMinutes: number;
  qualityPassRate: number;
}

interface RecoveryRateByType {
  batteryType: string;
  avgRecoveryRate: number;
  totalProcessed: number;
  cobaltRecovered: number;
  nickelRecovered: number;
  lithiumRecovered: number;
  manganeseRecovered: number;
}

interface QualityTrend {
  date: string;
  passCount: number;
  failCount: number;
  passRate: number;
  topDefects: Array<{ defect: string; count: number }>;
}

class AnalyticsService {
  /**
   * Get production metrics for date range
   */
  async getProductionMetrics(startDate: Date, endDate: Date): Promise<ProductionMetrics[]> {
    try {
      // Try to get from cache first (offline mode)
      const cached = await offlineSync.getCachedData('production_metrics');
      if (cached) {
        return cached as ProductionMetrics[];
      }

      // Fetch from API
      const response = await fetch(
        `/api/astra/metrics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();
      
      // Cache for offline use
      await offlineSync.cacheData('production_metrics', data.data || []);
      
      return data.data || [];
    } catch (error) {
      console.error('Failed to get production metrics:', error);
      return [];
    }
  }

  /**
   * Get recovery rates by battery type
   */
  async getRecoveryRatesByType(period: 'week' | 'month' | 'year'): Promise<RecoveryRateByType[]> {
    try {
      const cached = await offlineSync.getCachedData('recovery_rates');
      if (cached) {
        return cached as RecoveryRateByType[];
      }

      const response = await fetch(`/api/analytics/recovery-rates?period=${period}`);
      const data = await response.json();
      
      await offlineSync.cacheData('recovery_rates', data.data || []);
      
      return data.data || [];
    } catch (error) {
      console.error('Failed to get recovery rates:', error);
      return [];
    }
  }

  /**
   * Get quality trends
   */
  async getQualityTrend(days: number = 30): Promise<QualityTrend[]> {
    try {
      const cached = await offlineSync.getCachedData('quality_trend');
      if (cached) {
        return cached as QualityTrend[];
      }

      const response = await fetch(`/api/analytics/quality-trend?days=${days}`);
      const data = await response.json();
      
      await offlineSync.cacheData('quality_trend', data.data || []);
      
      return data.data || [];
    } catch (error) {
      console.error('Failed to get quality trends:', error);
      return [];
    }
  }

  /**
   * Calculate key performance indicators
   */
  async getKPIs(): Promise<{
    oee: number; // Overall Equipment Effectiveness
    throughput: number; // kg/hour
    yieldRate: number; // %
    onTimeDelivery: number; // %
  }> {
    try {
      // Calculate from production data
      const metrics = await this.getProductionMetrics(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      );

      const totalDays = metrics.length || 1;
      const totalOutput = metrics.reduce((sum, m) => sum + m.totalOutputKg, 0);
      const totalInput = metrics.reduce((sum, m) => sum + m.totalInputKg, 0);
      const totalDowntime = metrics.reduce((sum, m) => sum + m.downtimeMinutes, 0);
      const avgQualityPass = metrics.reduce((sum, m) => sum + m.qualityPassRate, 0) / totalDays;

      // OEE = Availability × Performance × Quality
      const availability = (720 - totalDowntime / totalDays) / 720; // 720 min = 12 hour shift
      const performance = totalOutput / (totalDays * 100); // Target 100kg/day
      const quality = avgQualityPass / 100;

      const oee = availability * performance * quality * 100;
      const throughput = totalOutput / (totalDays * 12); // kg/hour
      const yieldRate = (totalOutput / totalInput) * 100;

      return {
        oee: Math.round(oee * 100) / 100,
        throughput: Math.round(throughput * 100) / 100,
        yieldRate: Math.round(yieldRate * 100) / 100,
        onTimeDelivery: Math.round(avgQualityPass * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to calculate KPIs:', error);
      return {
        oee: 0,
        throughput: 0,
        yieldRate: 0,
        onTimeDelivery: 0,
      };
    }
  }

  /**
   * Get material recovery breakdown
   */
  async getMaterialBreakdown(batchId?: string): Promise<{
    cobalt: number;
    nickel: number;
    lithium: number;
    manganese: number;
    other: number;
  }> {
    try {
      const cached = await offlineSync.getCachedData('material_breakdown');
      if (cached) {
        return cached as any;
      }

      const endpoint = batchId 
        ? `/api/analytics/material-breakdown/${batchId}`
        : '/api/analytics/material-breakdown';

      const response = await fetch(endpoint);
      const data = await response.json();
      
      await offlineSync.cacheData('material_breakdown', data.data || {});
      
      return data.data || {
        cobalt: 0,
        nickel: 0,
        lithium: 0,
        manganese: 0,
        other: 0,
      };
    } catch (error) {
      console.error('Failed to get material breakdown:', error);
      return {
        cobalt: 0,
        nickel: 0,
        lithium: 0,
        manganese: 0,
        other: 0,
      };
    }
  }

  /**
   * Export analytics report
   */
  async exportReport(format: 'pdf' | 'csv' | 'xlsx', startDate: Date, endDate: Date): Promise<Blob> {
    const response = await fetch(
      `/api/analytics/export?format=${format}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
    return await response.blob();
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();
export default analytics;
