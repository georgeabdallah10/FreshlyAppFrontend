/**
 * ============================================
 * INCOMING NOTIFICATION HANDLER
 * ============================================
 * Handles notification taps, routing, and actions
 * when users interact with notifications
 */

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import type { NotificationResponse, NotificationCategory } from './types';
import { clearBadgeCount } from './registerForPush';

// ============================================
// NOTIFICATION TAP HANDLER
// ============================================

/**
 * Setup listener for when user taps on a notification
 * Returns cleanup function to remove listener
 */
export function setupNotificationResponseListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse
  );

  console.log('[NotificationHandler] Response listener registered');

  // Return cleanup function
  return () => {
    subscription.remove();
    console.log('[NotificationHandler] Response listener removed');
  };
}

/**
 * Setup listener for notifications received while app is in foreground
 * Returns cleanup function to remove listener
 */
export function setupNotificationReceivedListener(): () => void {
  const subscription = Notifications.addNotificationReceivedListener(
    handleNotificationReceived
  );

  console.log('[NotificationHandler] Received listener registered');

  // Return cleanup function
  return () => {
    subscription.remove();
    console.log('[NotificationHandler] Received listener removed');
  };
}

// ============================================
// NOTIFICATION RECEIVED (FOREGROUND)
// ============================================

/**
 * Handle notification received while app is in foreground
 */
async function handleNotificationReceived(
  notification: Notifications.Notification
): Promise<void> {
  try {
    const { title, body, data } = notification.request.content;

    console.log('[NotificationHandler] Notification received in foreground:', {
      title,
      body,
      data,
    });

    // Handle daily pantry check silently
    if (data?.type === 'daily_check') {
      console.log('[NotificationHandler] Daily pantry check triggered');
      // Import and run pantry check
      const { schedulePantryExpirationNotifications } = await import('./schedulePantryNotifications');
      await schedulePantryExpirationNotifications();
      return;
    }

    // You can add custom handling here, such as:
    // - Showing in-app notifications
    // - Playing custom sounds
    // - Updating badge count
    // - Refreshing data
  } catch (error) {
    console.error('[NotificationHandler] Error handling received notification:', error);
  }
}

// ============================================
// NOTIFICATION RESPONSE (USER TAP)
// ============================================

/**
 * Handle notification tap
 * Routes user to appropriate screen based on notification type
 */
async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  try {
    const { notification } = response;
    const { data, title, body } = notification.request.content;

    console.log('[NotificationHandler] User tapped notification:', {
      title,
      body,
      data,
    });

    // Clear badge when user interacts with notification
    await clearBadgeCount();

    // Route based on notification category or type
    if (data?.category) {
      await routeNotification(data.category as NotificationCategory, data);
    } else if (data?.type) {
      await routeByType(data.type, data);
    } else {
      // Default: Navigate to notifications screen
      router.push('/(tabs)/notifications');
    }
  } catch (error) {
    console.error('[NotificationHandler] Error handling notification response:', error);
    // Fallback: Navigate to notifications screen
    router.push('/(tabs)/notifications');
  }
}

// ============================================
// ROUTING LOGIC
// ============================================

/**
 * Route user based on notification category
 */
async function routeNotification(
  category: NotificationCategory,
  data: Record<string, any>
): Promise<void> {
  console.log('[NotificationHandler] Routing notification:', category, data);

  switch (category) {
    case 'meal_request':
      await handleMealRequestNotification(data);
      break;

    case 'pantry_expiration':
      await handlePantryExpirationNotification(data);
      break;

    case 'user_message':
      await handleUserMessageNotification(data);
      break;

    case 'freshly_update':
      await handleFreshlyUpdateNotification(data);
      break;

    case 'system':
      await handleSystemNotification(data);
      break;

    default:
      // Navigate to notifications screen
      router.push('/(tabs)/notifications');
  }
}

/**
 * Route based on notification type (for backward compatibility)
 */
async function routeByType(type: string, data: Record<string, any>): Promise<void> {
  console.log('[NotificationHandler] Routing by type:', type, data);

  if (type === 'daily_check') {
    // Silent background task, don't navigate
    return;
  }

  // Default routing
  router.push('/(tabs)/notifications');
}

// ============================================
// CATEGORY-SPECIFIC HANDLERS
// ============================================

/**
 * Handle meal request notification tap
 * Navigate to meal details or requests screen
 */
async function handleMealRequestNotification(data: Record<string, any>): Promise<void> {
  try {
    const { mealId, requesterId } = data;

    if (mealId) {
      // Navigate to meal details
      router.push({
        pathname: '/(home)/meal/[id]',
        params: { id: mealId.toString() },
      });
    } else {
      // Navigate to notifications screen
      router.push('/(tabs)/notifications');
    }
  } catch (error) {
    console.error('[NotificationHandler] Error handling meal request:', error);
    router.push('/(tabs)/notifications');
  }
}

/**
 * Handle pantry expiration notification tap
 * Navigate to pantry screen or specific item
 */
async function handlePantryExpirationNotification(data: Record<string, any>): Promise<void> {
  try {
    const { itemId } = data;

    if (itemId) {
      // Navigate to pantry with item highlighted
      router.push({
        pathname: '/(tabs)/pantry',
        params: { highlightItem: itemId.toString() },
      });
    } else {
      // Navigate to pantry screen
      router.push('/(tabs)/pantry');
    }
  } catch (error) {
    console.error('[NotificationHandler] Error handling pantry expiration:', error);
    router.push('/(tabs)/pantry');
  }
}

/**
 * Handle user message notification tap
 * Navigate to chat or messages screen
 */
async function handleUserMessageNotification(data: Record<string, any>): Promise<void> {
  try {
    const { senderId, conversationId } = data;

    if (conversationId) {
      // Navigate to specific conversation
      router.push({
        pathname: '/(home)/chat',
        params: { conversationId: conversationId.toString() },
      });
    } else if (senderId) {
      // Navigate to chat with specific user
      router.push({
        pathname: '/(home)/chat',
        params: { userId: senderId.toString() },
      });
    } else {
      // Navigate to messages/chat list
      router.push('/(home)/chat');
    }
  } catch (error) {
    console.error('[NotificationHandler] Error handling user message:', error);
    router.push('/(home)/chat');
  }
}

/**
 * Handle Freshly update notification tap
 * Navigate to specific URL or updates screen
 */
async function handleFreshlyUpdateNotification(data: Record<string, any>): Promise<void> {
  try {
    const { actionUrl, updateType } = data;

    // If there's an action URL, you could open it in a webview or external browser
    // For now, navigate to notifications screen to show the update
    router.push('/(tabs)/notifications');
  } catch (error) {
    console.error('[NotificationHandler] Error handling Freshly update:', error);
    router.push('/(tabs)/notifications');
  }
}

/**
 * Handle system notification tap
 * Navigate to appropriate screen based on context
 */
async function handleSystemNotification(data: Record<string, any>): Promise<void> {
  try {
    // Navigate to notifications screen
    router.push('/(tabs)/notifications');
  } catch (error) {
    console.error('[NotificationHandler] Error handling system notification:', error);
    router.push('/(tabs)/notifications');
  }
}

// ============================================
// NOTIFICATION ACTIONS
// ============================================

/**
 * Setup notification categories with actions (iOS)
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

    console.log('[NotificationHandler] Notification categories configured');
  } catch (error) {
    console.error('[NotificationHandler] Error setting up notification categories:', error);
  }
}

// ============================================
// NOTIFICATION PERMISSIONS CHECK
// ============================================

/**
 * Check if user has tapped "Don't Allow" and show settings prompt
 */
export async function checkAndPromptForPermissions(): Promise<boolean> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();

    if (status !== 'granted') {
      if (canAskAgain) {
        // Can request permission again
        const { status: newStatus } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        return newStatus === 'granted';
      } else {
        // User has denied, prompt to go to settings
        console.log('[NotificationHandler] Permission denied, cannot ask again');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[NotificationHandler] Error checking permissions:', error);
    return false;
  }
}

// ============================================
// LAST NOTIFICATION INFO
// ============================================

/**
 * Get the last notification that opened the app
 * Useful for handling deep links from notifications
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response;
  } catch (error) {
    console.error('[NotificationHandler] Error getting last notification response:', error);
    return null;
  }
}

/**
 * Handle any pending notification that opened the app
 * Call this during app initialization
 */
export async function handlePendingNotification(): Promise<void> {
  try {
    const lastResponse = await getLastNotificationResponse();

    if (lastResponse) {
      console.log('[NotificationHandler] Handling pending notification');
      await handleNotificationResponse(lastResponse);
    }
  } catch (error) {
    console.error('[NotificationHandler] Error handling pending notification:', error);
  }
}

// ============================================
// DEEP LINK HELPERS
// ============================================

/**
 * Parse notification data for deep linking
 */
export function parseNotificationDeepLink(data: Record<string, any>): {
  screen: string;
  params?: Record<string, string>;
} | null {
  try {
    const { category } = data;

    switch (category) {
      case 'meal_request':
        return {
          screen: '/(home)/meal/[id]',
          params: { id: data.mealId?.toString() },
        };

      case 'pantry_expiration':
        return {
          screen: '/(tabs)/pantry',
          params: { highlightItem: data.itemId?.toString() },
        };

      case 'user_message':
        return {
          screen: '/(home)/chat',
          params: { conversationId: data.conversationId?.toString() },
        };

      default:
        return {
          screen: '/(tabs)/notifications',
        };
    }
  } catch (error) {
    console.error('[NotificationHandler] Error parsing deep link:', error);
    return null;
  }
}
