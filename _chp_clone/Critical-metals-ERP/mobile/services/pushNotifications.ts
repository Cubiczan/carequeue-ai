/**
 * Push Notification Service
 * 
 * Manages push notifications for the mobile app
 * - Request permissions
 * - Register for notifications
 * - Handle notification taps
 * - Schedule local notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineSync } from './offlineSync';

const PUSH_TOKEN_KEY = '@battery_erp:push_token';

interface NotificationConfig {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  badge?: number;
  priority?: 'default' | 'high';
}

class PushNotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications not available on simulator');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push notification permission denied');
      return null;
    }

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Get or create push token
    const pushToken = await this.getOrCreatePushToken();

    // Setup listeners
    this.setupListeners();

    console.log('✅ Push notifications initialized');
    return pushToken;
  }

  /**
   * Get or create push token
   */
  private async getOrCreatePushToken(): Promise<string | null> {
    try {
      // Check if we already have a token
      let token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

      if (!token) {
        // Get new token from Expo/Firebase
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });
        token = tokenData.data;
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      }

      console.log('📱 Push token:', token);
      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Setup notification listeners
   */
  private setupListeners() {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received:', notification);
      
      // Handle notification data
      const data = notification.request.content.data;
      this.handleNotificationData(data);
    });

    // Listen for user tapping on notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data);
    });
  }

  /**
   * Handle notification data when received
   */
  private handleNotificationData(data: any) {
    // Sync relevant data based on notification type
    switch (data?.type) {
      case 'work_order_updated':
        offlineSync.sync(); // Sync work orders
        break;
      case 'inventory_low':
        offlineSync.sync(); // Sync inventory
        break;
      case 'compliance_alert':
        offlineSync.sync(); // Sync hazmat data
        break;
    }
  }

  /**
   * Handle notification tap - navigate to relevant screen
   */
  private handleNotificationTap(data: any) {
    // This would integrate with your navigation system
    console.log('Navigating based on notification:', data);
    
    // Example navigation:
    // if (data?.type === 'work_order') {
    //   navigation.navigate('WorkOrderDetail', { id: data.id });
    // }
  }

  /**
   * Send local notification immediately
   */
  async sendNotification(config: NotificationConfig): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: config.title,
        body: config.body,
        data: config.data,
        sound: config.sound ?? true,
        badge: config.badge,
        priority: config.priority === 'high' 
          ? Notifications.AndroidNotificationPriority.HIGH 
          : Notifications.AndroidNotificationPriority.DEFAULT,
        categoryIdentifier: 'battery-erp',
      },
      trigger: null, // Send immediately
    });

    console.log('📤 Notification sent:', notificationId);
    return notificationId;
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    config: NotificationConfig,
    trigger: Date | number
  ): Promise<string> {
    const triggerConfig = trigger instanceof Date
      ? { date: trigger }
      : { seconds: trigger };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: config.title,
        body: config.body,
        data: config.data,
        sound: config.sound ?? true,
      },
      trigger: triggerConfig,
    });

    console.log('⏰ Notification scheduled:', notificationId);
    return notificationId;
  }

  /**
   * Schedule recurring notification
   */
  async scheduleRecurringNotification(
    config: NotificationConfig,
    options: {
      hour: number;
      minute: number;
      weekday?: number; // 1-7 (Sunday-Saturday)
    }
  ): Promise<string> {
    const trigger: Notifications.CalendarTriggerInput = {
      hour: options.hour,
      minute: options.minute,
      repeats: true,
      ...(options.weekday && { weekday: options.weekday }),
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: config.title,
        body: config.body,
        data: config.data,
        sound: config.sound ?? true,
      },
      trigger,
    });

    console.log('🔄 Recurring notification scheduled:', notificationId);
    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('❌ Notification cancelled:', notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('❌ All notifications cancelled');
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Clear all notification badges
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Open notification settings
   */
  async openSettings(): Promise<void> {
    await Notifications.openNotificationSettingsAsync();
  }

  /**
   * Cleanup listeners
   */
  destroy() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

// Export singleton instance
export const pushNotifications = new PushNotificationService();
export default pushNotifications;
