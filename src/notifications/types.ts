/**
 * ============================================
 * NOTIFICATION TYPES & INTERFACES
 * ============================================
 * Central type definitions for the notification system
 */


// ============================================
// NOTIFICATION CATEGORIES
// ============================================

export type NotificationCategory =
  | 'meal_request'        // Meal requests from family members
  | 'freshly_update'      // Updates from Freshly team
  | 'user_message'        // Messages from other users
  | 'pantry_expiration'   // Pantry item expiring soon
  | 'system';             // General system notifications

export type FreshlyUpdateType =
  | 'feature_update'
  | 'maintenance'
  | 'promo'
  | 'warning';

// ============================================
// NOTIFICATION DATA INTERFACES
// ============================================

export interface BaseNotificationData {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: Record<string, any>;
}

export interface MealRequestNotification extends BaseNotificationData {
  category: 'meal_request';
  data: {
    requesterName: string;
    requesterId: number;
    mealId: number;
    mealName?: string;
  };
}

export interface FreshlyUpdateNotification extends BaseNotificationData {
  category: 'freshly_update';
  data: {
    updateType: FreshlyUpdateType;
    actionUrl?: string;
    imageUrl?: string;
  };
}

export interface UserMessageNotification extends BaseNotificationData {
  category: 'user_message';
  data: {
    senderName: string;
    senderId: number;
    messagePreview: string;
    conversationId?: number;
  };
}

export interface PantryExpirationNotification extends BaseNotificationData {
  category: 'pantry_expiration';
  data: {
    itemName: string;
    itemId: number;
    expirationDate: string;
    daysUntilExpiration: number;
    isExpired: boolean;
  };
}

export interface SystemNotification extends BaseNotificationData {
  category: 'system';
  data?: Record<string, any>;
}

// Union type for all notification types
export type AppNotification =
  | MealRequestNotification
  | FreshlyUpdateNotification
  | UserMessageNotification
  | PantryExpirationNotification
  | SystemNotification;

// ============================================
// PUSH NOTIFICATION TYPES
// ============================================

export interface ExpoPushToken {
  type: 'expo';
  data: string;
}

export interface PushNotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  ios?: {
    status: number;
    allowsAlert: boolean;
    allowsBadge: boolean;
    allowsSound: boolean;
  };
  android?: {
    importance: number;
  };
}

export interface NotificationTrigger {
  type: 'push' | 'calendar' | 'timeInterval' | 'daily';
  channelId?: string;
  repeats?: boolean;
  seconds?: number;
  hour?: number;
  minute?: number;
  date?: Date;
}

// ============================================
// LOCAL NOTIFICATION SCHEDULING
// ============================================

export interface ScheduledNotificationInput {
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger: NotificationTrigger;
  categoryIdentifier?: string;
  sound?: boolean | string;
  badge?: number;
}

export interface PantryItemExpirationData {
  itemId: number;
  itemName: string;
  expirationDate: string;
  daysUntilExpiration: number;
}

// ============================================
// NOTIFICATION HANDLER TYPES
// ============================================

export interface NotificationResponse {
  notification: {
    request: {
      identifier: string;
      content: {
        title: string;
        body: string;
        data: Record<string, any>;
      };
    };
  };
  actionIdentifier: string;
}

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean | string;
  badge?: number;
  categoryIdentifier?: string;
}

// ============================================
// SUPABASE NOTIFICATION STORAGE
// ============================================

export interface SupabaseNotification {
  id: number;
  user_id: number;
  category: NotificationCategory;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPushToken {
  user_id: number;
  expo_push_token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
  updated_at: string;
}

// ============================================
// HOOK STATE TYPES
// ============================================

export interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  permissionStatus: PushNotificationPermissionStatus | null;
  expoPushToken: string | null;
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

export interface NotificationPreferences {
  userId: number;
  enablePush: boolean;
  enableMealRequests: boolean;
  enableFreshlyUpdates: boolean;
  enableUserMessages: boolean;
  enablePantryAlerts: boolean;
  pantryAlertDays: number; // Days before expiration to alert
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;   // HH:MM format
}

// ============================================
// CATEGORY METADATA
// ============================================

export interface NotificationCategoryConfig {
  color: string;
  icon: string;
  priority: 'high' | 'default' | 'low';
}

export const NOTIFICATION_CATEGORY_CONFIG: Record<NotificationCategory, NotificationCategoryConfig> = {
  meal_request: {
    color: '#FD8100',  // Orange
    icon: 'restaurant',
    priority: 'high',
  },
  freshly_update: {
    color: '#00A86B',  // Green
    icon: 'information-circle',
    priority: 'default',
  },
  user_message: {
    color: '#4C9AFF',  // Blue
    icon: 'chatbubbles',
    priority: 'high',
  },
  pantry_expiration: {
    color: '#FF5630',  // Red
    icon: 'warning',
    priority: 'default',
  },
  system: {
    color: '#6B778C',  // Gray
    icon: 'settings',
    priority: 'low',
  },
};

// ============================================
// UTILITY TYPE GUARDS
// ============================================

export function isMealRequestNotification(
  notification: AppNotification
): notification is MealRequestNotification {
  return notification.category === 'meal_request';
}

export function isFreshlyUpdateNotification(
  notification: AppNotification
): notification is FreshlyUpdateNotification {
  return notification.category === 'freshly_update';
}

export function isUserMessageNotification(
  notification: AppNotification
): notification is UserMessageNotification {
  return notification.category === 'user_message';
}

export function isPantryExpirationNotification(
  notification: AppNotification
): notification is PantryExpirationNotification {
  return notification.category === 'pantry_expiration';
}

export function isSystemNotification(
  notification: AppNotification
): notification is SystemNotification {
  return notification.category === 'system';
}
