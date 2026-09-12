/**
 * Predictive Maintenance Service
 * 
 * Monitors equipment health and predicts maintenance needs
 */

import { offlineSync } from './offlineSync';

interface Equipment {
  id: string;
  name: string;
  type: 'shredder' | 'separator' | 'reactor' | 'centrifuge' | 'dryer';
  status: 'running' | 'idle' | 'maintenance' | 'error';
  healthScore: number; // 0-100
  lastMaintenance: Date;
  nextMaintenance: Date;
  totalOperatingHours: number;
}

interface MaintenancePrediction {
  equipmentId: string;
  predictedFailureDate: Date;
  confidence: number; // 0-1
  recommendedAction: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDowntime: number; // hours
  estimatedCost: number;
}

interface SensorReading {
  equipmentId: string;
  timestamp: Date;
  temperature?: number;
  vibration?: number;
  pressure?: number;
  powerConsumption?: number;
  rpm?: number;
}

class PredictiveMaintenanceService {
  private maintenanceThresholds = {
    shredder: { temperature: 85, vibration: 7.5, power: 150 },
    separator: { rpm: 3000, vibration: 5.0, power: 75 },
    reactor: { temperature: 95, pressure: 2.5, power: 200 },
    centrifuge: { rpm: 5000, vibration: 6.0, power: 100 },
    dryer: { temperature: 120, power: 80 },
  };

  /**
   * Get all equipment status
   */
  async getEquipmentStatus(): Promise<Equipment[]> {
    try {
      const cached = await offlineSync.getCachedData('equipment_status');
      if (cached) {
        return cached as Equipment[];
      }

      const response = await fetch('/api/maintenance/equipment');
      const data = await response.json();
      
      await offlineSync.cacheData('equipment_status', data.data || []);
      
      return data.data || [];
    } catch (error) {
      console.error('Failed to get equipment status:', error);
      return [];
    }
  }

  /**
   * Get maintenance predictions for all equipment
   */
  async getMaintenancePredictions(): Promise<MaintenancePrediction[]> {
    try {
      const cached = await offlineSync.getCachedData('maintenance_predictions');
      if (cached) {
        return cached as MaintenancePrediction[];
      }

      const response = await fetch('/api/maintenance/predictions');
      const data = await response.json();
      
      await offlineSync.cacheData('maintenance_predictions', data.data || []);
      
      return data.data || [];
    } catch (error) {
      console.error('Failed to get maintenance predictions:', error);
      return [];
    }
  }

  /**
   * Record sensor reading
   */
  async recordSensorReading(reading: SensorReading): Promise<void> {
    try {
      await offlineSync.queueAction({
        type: 'create',
        endpoint: '/api/maintenance/sensor-readings',
        data: reading,
      });
    } catch (error) {
      console.error('Failed to record sensor reading:', error);
    }
  }

  /**
   * Calculate equipment health score
   */
  calculateHealthScore(
    equipmentType: string,
    readings: SensorReading[]
  ): number {
    if (readings.length === 0) return 100;

    const thresholds = this.maintenanceThresholds[equipmentType as keyof typeof this.maintenanceThresholds];
    if (!thresholds) return 100;

    let healthScore = 100;
    const latestReading = readings[readings.length - 1];

    // Check each sensor against thresholds
    if (latestReading.temperature && thresholds.temperature) {
      const tempRatio = latestReading.temperature / thresholds.temperature;
      if (tempRatio > 1) healthScore -= (tempRatio - 1) * 30;
    }

    if (latestReading.vibration && thresholds.vibration) {
      const vibRatio = latestReading.vibration / thresholds.vibration;
      if (vibRatio > 1) healthScore -= (vibRatio - 1) * 25;
    }

    if (latestReading.powerConsumption && thresholds.power) {
      const powerRatio = latestReading.powerConsumption / thresholds.power;
      if (powerRatio > 1.2) healthScore -= (powerRatio - 1.2) * 20;
    }

    return Math.max(0, Math.min(100, Math.round(healthScore)));
  }

  /**
   * Predict failure based on trends
   */
  predictFailure(
    equipmentType: string,
    readings: SensorReading[],
    operatingHours: number
  ): MaintenancePrediction | null {
    const healthScore = this.calculateHealthScore(equipmentType, readings);
    
    if (healthScore > 80) {
      return null; // No immediate concern
    }

    // Calculate degradation rate
    const daysOfData = 30;
    const degradationRate = (100 - healthScore) / daysOfData;
    
    // Predict days until failure (health = 0)
    const daysUntilFailure = healthScore / degradationRate;
    const predictedFailureDate = new Date();
    predictedFailureDate.setDate(predictedFailureDate.getDate() + daysUntilFailure);

    // Determine priority
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (healthScore < 30) priority = 'critical';
    else if (healthScore < 50) priority = 'high';
    else if (healthScore < 70) priority = 'medium';

    // Estimate downtime and cost
    const estimatedDowntime = equipmentType === 'shredder' ? 8 : 4;
    const estimatedCost = estimatedDowntime * 500 + (equipmentType === 'reactor' ? 2000 : 500);

    return {
      equipmentId: readings[0]?.equipmentId || 'unknown',
      predictedFailureDate,
      confidence: Math.min(0.95, 0.5 + (100 - healthScore) / 200),
      recommendedAction: this.getRecommendedAction(equipmentType, healthScore),
      priority,
      estimatedDowntime,
      estimatedCost,
    };
  }

  /**
   * Get recommended maintenance action
   */
  private getRecommendedAction(equipmentType: string, healthScore: number): string {
    if (healthScore < 30) {
      return `Immediate maintenance required for ${equipmentType}. Stop operation and schedule emergency maintenance.`;
    } else if (healthScore < 50) {
      return `Schedule maintenance for ${equipmentType} within 48 hours. Monitor closely.`;
    } else if (healthScore < 70) {
      return `Plan maintenance for ${equipmentType} within the next week. Order required parts.`;
    } else {
      return `Continue normal operation. Next scheduled maintenance in ${Math.round((healthScore - 70) * 2)} days.`;
    }
  }

  /**
   * Schedule maintenance
   */
  async scheduleMaintenance(
    equipmentId: string,
    scheduledDate: Date,
    type: 'preventive' | 'corrective' | 'emergency'
  ): Promise<void> {
    try {
      await offlineSync.queueAction({
        type: 'create',
        endpoint: '/api/maintenance/schedule',
        data: {
          equipmentId,
          scheduledDate,
          type,
        },
      });
    } catch (error) {
      console.error('Failed to schedule maintenance:', error);
    }
  }

  /**
   * Get maintenance history
   */
  async getMaintenanceHistory(equipmentId: string, months: number = 6): Promise<any[]> {
    try {
      const cached = await offlineSync.getCachedData(`maintenance_history_${equipmentId}`);
      if (cached) {
        return cached as any[];
      }

      const response = await fetch(
        `/api/maintenance/history/${equipmentId}?months=${months}`
      );
      const data = await response.json();
      
      await offlineSync.cacheData(`maintenance_history_${equipmentId}`, data.data || []);
      
      return data.data || [];
    } catch (error) {
      console.error('Failed to get maintenance history:', error);
      return [];
    }
  }

  /**
   * Calculate maintenance cost savings
   */
  calculateCostSavings(predictions: MaintenancePrediction[]): number {
    // Compare predictive vs reactive maintenance costs
    const predictiveCost = predictions.reduce(
      (sum, p) => sum + p.estimatedCost,
      0
    );

    // Reactive maintenance typically costs 3-4x more
    const reactiveCost = predictiveCost * 3.5;

    return Math.round(reactiveCost - predictiveCost);
  }
}

// Export singleton instance
export const predictiveMaintenance = new PredictiveMaintenanceService();
export default predictiveMaintenance;
