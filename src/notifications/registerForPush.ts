/**
 * ============================================
 * EXPO PUSH NOTIFICATION REGISTRATION
 * ============================================
 * Handles permission requests, token registration,
 * and Android notification channel setup
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { supabase } from '../supabase/client';
import { Storage } from '../utils/storage';
import type { PushNotificationPermissionStatus } from './types';

// ============================================
// CONSTANTS
// ============================================

const ANDROID_CHANNEL_ID = 'freshly-default';
const EXPO_PUSH_TOKEN_KEY = 'expo_push_token';

// ============================================
// NOTIFICATION HANDLER
// ============================================

/**
 * Configure how notifications are handled when app is in foreground
 */
export function setupNotificationHandler() {
  if (typeof Notifications?.setNotificationHandler !== "function") {
    console.warn(
      "[Notifications] setNotificationHandler is not available in this environment."
    );
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ============================================
// ANDROID NOTIFICATION CHANNELS
// ============================================

/**
 * Create Android notification channels with proper importance levels
 */
async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      // Default channel
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Freshly Notifications',
        description: 'General notifications from Freshly app',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FD8100',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Pantry expiration channel (high priority)
      await Notifications.setNotificationChannelAsync('freshly-pantry', {
        name: 'Pantry Alerts',
        description: 'Alerts for expiring pantry items',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF5630',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Meal requests channel
      await Notifications.setNotificationChannelAsync('freshly-meals', {
        name: 'Meal Requests',
        description: 'Meal requests from family members',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FD8100',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Updates channel (default priority)
      await Notifications.setNotificationChannelAsync('freshly-updates', {
        name: 'Freshly Updates',
        description: 'News and updates from Freshly team',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#00A86B',
        sound: 'default',
        enableVibrate: false,
        showBadge: true,
      });

      console.log('[Notifications] Android channels created successfully');
    } catch (error) {
      console.error('[Notifications] Error setting up Android channels:', error);
      throw error;
    }
  }
}

// ============================================
// PERMISSION HANDLING
// ============================================

/**
 * Request notification permissions for iOS and Android
 * Returns permission status with platform-specific details
 */
export async function requestNotificationPermissions(): Promise<PushNotificationPermissionStatus> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If not granted, request permission
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    const canAskAgain = existingStatus === 'undetermined' || existingStatus === 'denied';

    // Get platform-specific permission details
    const permissionResponse = await Notifications.getPermissionsAsync();

    const permissionStatus: PushNotificationPermissionStatus = {
      granted,
      canAskAgain,
    };

    if (Platform.OS === 'ios') {
      permissionStatus.ios = {
        status: permissionResponse.status === 'granted' ? 1 : 0,
        allowsAlert: permissionResponse.ios?.allowsAlert ?? false,
        allowsBadge: permissionResponse.ios?.allowsBadge ?? false,
        allowsSound: permissionResponse.ios?.allowsSound ?? false,
      };
    }

    if (Platform.OS === 'android') {
      permissionStatus.android = {
        importance: permissionResponse.android?.importance ?? 0,
      };
    }

    if (!granted) {
      console.warn('[Notifications] Permission not granted:', finalStatus);

      // Show user-friendly message
      if (!canAskAgain) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings to receive important updates about your pantry and meals.',
          [{ text: 'OK' }]
        );
      }
    } else {
      console.log('[Notifications] Permission granted successfully');
    }

    return permissionStatus;
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    throw new Error('Failed to request notification permissions');
  }
}

// ============================================
// EXPO PUSH TOKEN REGISTRATION
// ============================================

/**
 * Register device for Expo push notifications
 * Returns the Expo push token or null if registration fails
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if running on physical device
    if (!Device.isDevice) {
      console.warn('[Notifications] Push notifications require a physical device');
      Alert.alert(
        'Simulator Detected',
        'Push notifications are only available on physical devices, not simulators.',
        [{ text: 'OK' }]
      );
      return null;
    }

    // Setup Android channels first
    await setupAndroidChannels();

    // Request permissions
    const permissionStatus = await requestNotificationPermissions();
    if (!permissionStatus.granted) {
      console.warn('[Notifications] Permission denied, cannot register for push');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // TODO: Replace with actual project ID from app.json
    });

    const token = tokenData.data;
    console.log('[Notifications] Expo push token obtained:', token);

    // Store token locally
    await Storage.setItem(EXPO_PUSH_TOKEN_KEY, token);

    // Store token in Supabase
    await storePushTokenInDatabase(token);

    return token;
  } catch (error: any) {
    console.error('[Notifications] Error registering for push notifications:', error);

    // User-friendly error handling
    if (error.message?.includes('projectId')) {
      console.error('[Notifications] Missing projectId in app.json. Add "projectId" to extra section.');
    } else if (error.message?.includes('network')) {
      Alert.alert(
        'Connection Error',
        'Unable to register for notifications. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Registration Failed',
        'Unable to register for push notifications. Please try again later.',
        [{ text: 'OK' }]
      );
    }

    throw error;
  }
}

// ============================================
// TOKEN STORAGE IN SUPABASE
// ============================================

/**
 * Store or update Expo push token in Supabase
 */
async function storePushTokenInDatabase(token: string): Promise<void> {
  try {
    const userId = await Storage.getItem('user_id');

    if (!userId) {
      console.warn('[Notifications] No user ID found, skipping token storage');
      return;
    }

    const platform = Platform.OS as 'ios' | 'android' | 'web';
    const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;

    // Upsert token (insert or update if exists)
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: parseInt(userId),
          expo_push_token: token,
          platform,
          device_name: deviceName,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      );

    if (error) {
      console.error('[Notifications] Error storing push token:', error);
      throw error;
    }

    console.log('[Notifications] Push token stored in database successfully');
  } catch (error) {
    console.error('[Notifications] Failed to store push token in database:', error);
    // Don't throw - token registration can still work locally
  }
}

// ============================================
// TOKEN RETRIEVAL
// ============================================

/**
 * Get stored Expo push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  try {
    const token = await Storage.getItem(EXPO_PUSH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('[Notifications] Error retrieving stored push token:', error);
    return null;
  }
}

/**
 * Check if push notifications are enabled
 */
export async function isPushNotificationEnabled(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Notifications] Error checking notification status:', error);
    return false;
  }
}

// ============================================
// TOKEN REMOVAL (FOR LOGOUT)
// ============================================

/**
 * Remove push token from database and local storage
 * Call this when user logs out
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const userId = await Storage.getItem('user_id');
    const token = await getStoredPushToken();

    if (userId && token) {
      const platform = Platform.OS;

      // Remove from database
      await supabase
        .from('user_push_tokens')
        .delete()
        .match({
          user_id: parseInt(userId),
          platform,
        });
    }

    // Remove from local storage
    await Storage.removeItem(EXPO_PUSH_TOKEN_KEY);

    console.log('[Notifications] Push token unregistered successfully');
  } catch (error) {
    console.error('[Notifications] Error unregistering push token:', error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get notification channel ID for a specific category
 */
export function getChannelIdForCategory(category: string): string {
  switch (category) {
    case 'pantry_expiration':
      return 'freshly-pantry';
    case 'meal_request':
      return 'freshly-meals';
    case 'freshly_update':
      return 'freshly-updates';
    default:
      return ANDROID_CHANNEL_ID;
  }
}

/**
 * Clear all notifications from notification center
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    console.log('[Notifications] All notifications cleared');
  } catch (error) {
    console.error('[Notifications] Error clearing notifications:', error);
  }
}

/**
 * Clear specific notification by identifier
 */
export async function clearNotification(identifier: string): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(identifier);
    console.log('[Notifications] Notification cleared:', identifier);
  } catch (error) {
    console.error('[Notifications] Error clearing notification:', error);
  }
}

/**
 * Set badge count (iOS)
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('[Notifications] Error setting badge count:', error);
  }
}

/**
 * Clear badge count (iOS)
 */
export async function clearBadgeCount(): Promise<void> {
  await setBadgeCount(0);
}

// ============================================
// NOTIFICATION CATEGORIES (iOS ACTION BUTTONS)
// ============================================

/**
 * Setup notification categories with action buttons (iOS)
 * Call this during app initialization
 */
export async function setupNotificationCategories(): Promise<void> {
  try {
    // Meal request actions
    await Notifications.setNotificationCategoryAsync('meal_request', [
      {
        identifier: 'view_meal',
        buttonTitle: 'View Meal',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    // Pantry expiration actions
    await Notifications.setNotificationCategoryAsync('pantry_expiration', [
      {
        identifier: 'view_pantry',
        buttonTitle: 'View Pantry',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'snooze',
        buttonTitle: 'Remind Later',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    // User message actions
    await Notifications.setNotificationCategoryAsync('user_message', [
      {
        identifier: 'reply',
        buttonTitle: 'Reply',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'mark_read',
        buttonTitle: 'Mark Read',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    console.log('[Notifications] Notification categories configured');
  } catch (error) {
    console.error('[Notifications] Error setting up notification categories:', error);
  }
}
