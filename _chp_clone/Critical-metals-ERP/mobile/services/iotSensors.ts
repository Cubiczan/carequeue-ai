/**
 * IoT Sensor Integration Service
 * 
 * Connects to IoT sensors on shop floor equipment
 * - Real-time sensor data streaming
 * - WebSocket connection management
 * - Sensor data aggregation
 * - Alert thresholds
 */

import { offlineSync } from './offlineSync';

interface SensorData {
  sensorId: string;
  equipmentId: string;
  timestamp: Date;
  temperature?: number;
  vibration?: number;
  pressure?: number;
  humidity?: number;
  powerConsumption?: number;
  rpm?: number;
  status: 'normal' | 'warning' | 'critical';
}

interface SensorThreshold {
  sensorId: string;
  parameter: string;
  min: number;
  max: number;
  unit: string;
}

interface SensorAlert {
  alertId: string;
  sensorId: string;
  equipmentId: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  parameter: string;
  value: number;
  threshold: number;
  message: string;
  acknowledged: boolean;
}

class IoTSensorService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private sensors: Map<string, SensorData> = new Map();
  private thresholds: Map<string, SensorThreshold> = new Map();
  private alertListeners: Set<(alert: SensorAlert) => void> = new Set();

  /**
   * Connect to IoT sensor network
   */
  async connect(wsUrl: string): Promise<void> {
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🟢 IoT sensor connection established');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleSensorData(data);
      };

      this.ws.onclose = () => {
        console.log('🔴 IoT sensor connection closed');
        this.attemptReconnect(wsUrl);
      };

      this.ws.onerror = (error) => {
        console.error('IoT sensor error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to IoT sensors:', error);
      throw error;
    }
  }

  /**
   * Handle incoming sensor data
   */
  private handleSensorData(data: SensorData): void {
    // Update sensor cache
    this.sensors.set(data.sensorId, data);

    // Check thresholds
    this.checkThresholds(data);

    // Queue for offline sync
    offlineSync.queueAction({
      type: 'create',
      endpoint: '/api/iot/sensor-readings',
      data,
    });
  }

  /**
   * Check sensor data against thresholds
   */
  private checkThresholds(data: SensorData): void {
    const thresholds = [
      { param: 'temperature', value: data.temperature, defaultMax: 85 },
      { param: 'vibration', value: data.vibration, defaultMax: 7.5 },
      { param: 'pressure', value: data.pressure, defaultMax: 2.5 },
      { param: 'powerConsumption', value: data.powerConsumption, defaultMax: 150 },
    ];

    for (const threshold of thresholds) {
      if (threshold.value !== undefined) {
        const limit = this.thresholds.get(`${data.sensorId}_${threshold.param}`)?.max || threshold.defaultMax;
        
        if (threshold.value > limit * 1.2) {
          this.generateAlert(data, threshold.param, threshold.value, limit, 'critical');
        } else if (threshold.value > limit) {
          this.generateAlert(data, threshold.param, threshold.value, limit, 'high');
        }
      }
    }
  }

  /**
   * Generate alert for threshold violation
   */
  private generateAlert(
    data: SensorData,
    parameter: string,
    value: number,
    threshold: number,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    const alert: SensorAlert = {
      alertId: `ALERT-${Date.now()}-${data.sensorId}`,
      sensorId: data.sensorId,
      equipmentId: data.equipmentId,
      timestamp: new Date(),
      severity,
      parameter,
      value,
      threshold,
      message: `${parameter} exceeded threshold: ${value} > ${threshold}`,
      acknowledged: false,
    };

    console.warn('⚠️ Sensor Alert:', alert.message);

    // Notify listeners
    this.alertListeners.forEach(listener => listener(alert));
  }

  /**
   * Attempt to reconnect if connection lost
   */
  private attemptReconnect(wsUrl: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(wsUrl);
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  /**
   * Send heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get real-time sensor data
   */
  getSensorData(sensorId: string): SensorData | undefined {
    return this.sensors.get(sensorId);
  }

  /**
   * Get all sensors for equipment
   */
  getEquipmentSensors(equipmentId: string): SensorData[] {
    return Array.from(this.sensors.values()).filter(
      sensor => sensor.equipmentId === equipmentId
    );
  }

  /**
   * Set alert threshold for sensor parameter
   */
  setThreshold(threshold: SensorThreshold): void {
    const key = `${threshold.sensorId}_${threshold.parameter}`;
    this.thresholds.set(key, threshold);
  }

  /**
   * Subscribe to sensor alerts
   */
  onAlert(callback: (alert: SensorAlert) => void): () => void {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    await offlineSync.queueAction({
      type: 'update',
      endpoint: `/api/iot/alerts/${alertId}/acknowledge`,
      data: { acknowledged: true, acknowledgedAt: new Date() },
    });
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<SensorAlert[]> {
    try {
      const response = await fetch('/api/iot/alerts?active=true');
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Disconnect from IoT network
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const iotSensors = new IoTSensorService();
export default iotSensors;
