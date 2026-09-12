/**
 * Offline Sync Service
 * 
 * Manages offline data synchronization for the mobile app
 * - Queues actions when offline
 * - Syncs when connection restored
 * - Conflict resolution
 */

import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SYNC_QUEUE_KEY = '@battery_erp:sync_queue';
const LAST_SYNC_KEY = '@battery_erp:last_sync';
const OFFLINE_CACHE_KEY = '@battery_erp:offline_cache';

interface SyncAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineCache {
  workOrders: any[];
  batches: any[];
  inventory: any[];
  lastUpdated: number;
}

class OfflineSyncService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private listeners: Set<(online: boolean) => void> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.checkConnection();
    this.startConnectionMonitoring();
    this.startAutoSync();
  }

  /**
   * Check current network status
   */
  async checkConnection(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      this.isOnline = networkState.isConnected ?? false;
      this.notifyListeners();
      return this.isOnline;
    } catch (error) {
      console.error('Network check failed:', error);
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Monitor network connectivity changes
   */
  private startConnectionMonitoring() {
    Network.addNetworkStateListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (!wasOnline && this.isOnline) {
        // Just came online - trigger sync
        console.log('🟢 Connection restored, syncing...');
        this.sync();
      } else if (wasOnline && !this.isOnline) {
        // Just went offline
        console.log('🔴 Connection lost, queuing actions');
      }
      
      this.notifyListeners();
    });
  }

  /**
   * Start automatic sync every 5 minutes when online
   */
  private startAutoSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Subscribe to online/offline status changes
   */
  subscribe(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isOnline); // Immediate callback with current status
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  /**
   * Queue an action for later sync
   */
  async queueAction(action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const syncAction: SyncAction = {
      ...action,
      id: `${action.type}_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    const queue = await this.getQueue();
    queue.push(syncAction);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

    console.log(`📝 Action queued: ${action.type} ${action.endpoint}`);

    // If online, try to sync immediately
    if (this.isOnline) {
      await this.sync();
    }
  }

  /**
   * Get pending sync queue
   */
  async getQueue(): Promise<SyncAction[]> {
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  }

  /**
   * Sync queued actions to server
   */
  async sync(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress...');
      return { success: 0, failed: 0 };
    }

    if (!this.isOnline) {
      console.log('⚠️ Cannot sync - offline');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    const queue = await this.getQueue();
    const result = { success: 0, failed: 0 };

    console.log(`🔄 Starting sync - ${queue.length} actions pending`);

    for (const action of queue) {
      try {
        await this.executeAction(action);
        result.success++;
      } catch (error: any) {
        console.error(`❌ Sync failed for ${action.id}:`, error.message);
        
        // Retry logic
        if (action.retryCount < 3) {
          action.retryCount++;
          queue.push(action); // Re-queue for later
        }
        result.failed++;
      }
    }

    // Clear successful actions from queue
    await AsyncStorage.setItem(
      SYNC_QUEUE_KEY,
      JSON.stringify(queue.filter(a => a.retryCount >= 3))
    );

    // Update last sync time
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    this.isSyncing = false;
    console.log(`✅ Sync complete: ${result.success} succeeded, ${result.failed} failed`);

    return result;
  }

  /**
   * Execute a single sync action
   */
  private async executeAction(action: SyncAction): Promise<void> {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    const token = await AsyncStorage.getItem('@battery_erp:token');

    const response = await fetch(`${baseUrl}${action.endpoint}`, {
      method: action.type === 'create' ? 'POST' : 
              action.type === 'update' ? 'PUT' : 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: action.type === 'delete' ? undefined : JSON.stringify(action.data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Cache data for offline access
   */
  async cacheData<T extends keyof OfflineCache>(
    key: T,
    data: OfflineCache[T]
  ): Promise<void> {
    const cache = await this.getCache();
    cache[key] = data;
    cache.lastUpdated = Date.now();
    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
  }

  /**
   * Get cached data
   */
  async getCachedData<T extends keyof OfflineCache>(key: T): Promise<OfflineCache[T] | null> {
    const cache = await this.getCache();
    return cache[key] || null;
  }

  /**
   * Get offline cache
   */
  private async getCache(): Promise<OfflineCache> {
    const cacheJson = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
    return cacheJson ? JSON.parse(cacheJson) : {
      workOrders: [],
      batches: [],
      inventory: [],
      lastUpdated: 0
    };
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<Date | null> {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? new Date(parseInt(lastSync)) : null;
  }

  /**
   * Clear all queued actions
   */
  async clearQueue(): Promise<void> {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
  }

  /**
   * Get sync stats
   */
  async getStats(): Promise<{
    queueLength: number;
    lastSync: Date | null;
    isOnline: boolean;
    isSyncing: boolean;
  }> {
    const queue = await this.getQueue();
    const lastSync = await this.getLastSyncTime();
    
    return {
      queueLength: queue.length,
      lastSync,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Export singleton instance
export const offlineSync = new OfflineSyncService();
export default offlineSync;
