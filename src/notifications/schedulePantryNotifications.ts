 /**
 * ============================================
 * PANTRY EXPIRATION NOTIFICATIONS
 * ============================================
 * Schedules local notifications for pantry items
 * that are expiring soon or already expired
 */

import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import { getAllPantryItems, PantryItem } from '../services/pantry.service';

// ============================================
// TYPES
// ============================================

interface PantryItemExpirationData {
  itemId: number;
  itemName: string;
  expirationDate: string;
  daysUntilExpiration: number;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

// ============================================
// CONSTANTS
// ============================================

const EXPIRATION_WARNING_DAYS = 3; // Alert when 3 days or less until expiration
const NOTIFICATION_IDENTIFIER_PREFIX = 'pantry-expiration-';
const DAILY_CHECK_HOUR = 9; // 9 AM daily check
const DAILY_CHECK_MINUTE = 0;

// ============================================
// MAIN SCHEDULING FUNCTION
// ============================================

/**
 * Check all pantry items and schedule notifications for expiring items
 * This should be called:
 * - When app starts
 * - When pantry items are added/updated
 * - Once daily via background task
 */
export async function schedulePantryExpirationNotifications(): Promise<void> {
  try {
    console.log('[PantryNotifications] Starting pantry expiration check...');

    // Cancel all existing pantry notifications first
    await cancelAllPantryNotifications();

    // Fetch all pantry items
    const pantryItems = await getAllPantryItems();

    if (!pantryItems || pantryItems.length === 0) {
      console.log('[PantryNotifications] No pantry items found');
      return;
    }

    const now = new Date();
    let scheduledCount = 0;
    let expiredCount = 0;

    for (const item of pantryItems) {
      if (!item.expirationDate) {
        continue; // Skip items without expiration dates
      }

      const expirationDate = new Date(item.expirationDate);
      const daysUntilExpiration = calculateDaysUntilExpiration(expirationDate, now);

      // Schedule notification if item is expiring soon or expired
      if (daysUntilExpiration <= EXPIRATION_WARNING_DAYS) {
        const isExpired = daysUntilExpiration < 0;

        if (isExpired) {
          // Schedule immediate notification for expired items
          await scheduleExpiredItemNotification(item, Math.abs(daysUntilExpiration));
          expiredCount++;
        } else {
          // Schedule notification for expiring soon items
          await scheduleExpiringSoonNotification(item, daysUntilExpiration);
          scheduledCount++;
        }
      }
    }

    console.log(
      `[PantryNotifications] Scheduled ${scheduledCount} expiring notifications, ${expiredCount} expired notifications`
    );

    // Schedule next daily check
    await scheduleDailyPantryCheck();
  } catch (error) {
    console.log('[PantryNotifications] Error scheduling pantry notifications:', error);
    throw error;
  }
}

// ============================================
// EXPIRING SOON NOTIFICATION
// ============================================

/**
 * Schedule notification for item expiring soon
 */
async function scheduleExpiringSoonNotification(
  item: PantryItem,
  daysUntilExpiration: number
): Promise<void> {
  try {
    const identifier = `${NOTIFICATION_IDENTIFIER_PREFIX}${item.id}`;

    const title =
      daysUntilExpiration === 0 ? "Pantry Item Expires Today" : "Pantry Item Expiring Soon";

    const body = daysUntilExpiration === 0
      ? `${item.name} expires today! Use it before it goes bad.`
      : `${item.name} expires in ${daysUntilExpiration} day${daysUntilExpiration > 1 ? 's' : ''}. Plan to use it soon!`;

    const data: PantryItemExpirationData = {
      itemId: item.id,
      itemName: item.name,
      expirationDate: item.expirationDate!,
      daysUntilExpiration,
    };

    // Schedule for 9 AM on the day it's expiring (or same day if expiring today)
    const triggerDate = new Date(item.expirationDate!);
    triggerDate.setHours(DAILY_CHECK_HOUR, DAILY_CHECK_MINUTE, 0, 0);

    // If the trigger date is in the past, schedule for now
    if (triggerDate < new Date()) {
      triggerDate.setTime(Date.now() + 5000); // 5 seconds from now
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        data: data as Record<string, unknown>,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && {
          channelId: 'default',
        }),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    console.log(`[PantryNotifications] Scheduled expiring notification for ${item.name}`);
  } catch (error) {
    console.log('[PantryNotifications] Error scheduling expiring notification:', error);
  }
}

// ============================================
// EXPIRED ITEM NOTIFICATION
// ============================================

/**
 * Schedule immediate notification for already expired item
 */
async function scheduleExpiredItemNotification(
  item: PantryItem,
  daysExpired: number
): Promise<void> {
  try {
    const identifier = `${NOTIFICATION_IDENTIFIER_PREFIX}expired-${item.id}`;

    const title = "Expired Pantry Item";
    const body = daysExpired === 0
      ? `${item.name} expired today. Check if it's still safe to use.`
      : `${item.name} expired ${daysExpired} day${daysExpired > 1 ? 's' : ''} ago. Consider removing it.`;

    const data: PantryItemExpirationData = {
      itemId: item.id,
      itemName: item.name,
      expirationDate: item.expirationDate!,
      daysUntilExpiration: -daysExpired,
    };

    // Schedule for immediate delivery (5 seconds from now to ensure delivery)
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        data: data as Record<string, unknown>,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && {
          channelId: 'default',
        }),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });

    console.log(`[PantryNotifications] Scheduled expired notification for ${item.name}`);
  } catch (error) {
    console.log('[PantryNotifications] Error scheduling expired notification:', error);
  }
}

// ============================================
// DAILY CHECK SCHEDULING
// ============================================

/**
 * Schedule a daily notification check at 9 AM
 * This ensures notifications are updated even if app isn't opened
 */
async function scheduleDailyPantryCheck(): Promise<void> {
  try {
    const identifier = 'daily-pantry-check';

    // Cancel existing daily check
    await Notifications.cancelScheduledNotificationAsync(identifier);

    // Schedule daily trigger at 9 AM
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Pantry Check',
        body: 'Checking your pantry for expiring items...',
        data: { type: 'daily_check' },
        sound: false, // Silent notification
        priority: Notifications.AndroidNotificationPriority.LOW,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.CALENDAR,
        hour: DAILY_CHECK_HOUR,
        minute: DAILY_CHECK_MINUTE,
        repeats: true,
      },
    });

    console.log('[PantryNotifications] Daily pantry check scheduled for 9 AM');
  } catch (error) {
    console.log('[PantryNotifications] Error scheduling daily check:', error);
  }
}

// ============================================
// NOTIFICATION CANCELLATION
// ============================================

/**
 * Cancel all pantry-related notifications
 */
export async function cancelAllPantryNotifications(): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      if (notification.identifier.startsWith(NOTIFICATION_IDENTIFIER_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    console.log('[PantryNotifications] All pantry notifications cancelled');
  } catch (error) {
    console.log('[PantryNotifications] Error cancelling notifications:', error);
  }
}

/**
 * Cancel notification for a specific pantry item
 */
export async function cancelPantryItemNotification(itemId: number): Promise<void> {
  try {
    const identifier = `${NOTIFICATION_IDENTIFIER_PREFIX}${itemId}`;
    const expiredIdentifier = `${NOTIFICATION_IDENTIFIER_PREFIX}expired-${itemId}`;

    await Notifications.cancelScheduledNotificationAsync(identifier);
    await Notifications.cancelScheduledNotificationAsync(expiredIdentifier);

    console.log(`[PantryNotifications] Cancelled notifications for item ${itemId}`);
  } catch (error) {
    console.log('[PantryNotifications] Error cancelling item notification:', error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate days until expiration
 * Returns negative number if already expired
 */
function calculateDaysUntilExpiration(expirationDate: Date, currentDate: Date = new Date()): number {
  const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day

  // Reset hours to compare dates only
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - current.getTime();
  const diffDays = Math.round(diffTime / oneDay);

  return diffDays;
}

/**
 * Get expiring items summary
 * Useful for displaying in UI
 */
export async function getExpiringItemsSummary(): Promise<{
  expiringToday: PantryItem[];
  expiringSoon: PantryItem[];
  expired: PantryItem[];
}> {
  try {
    const pantryItems = await getAllPantryItems();
    const now = new Date();

    const expiringToday: PantryItem[] = [];
    const expiringSoon: PantryItem[] = [];
    const expired: PantryItem[] = [];

    for (const item of pantryItems) {
      if (!item.expirationDate) continue;

      const expirationDate = new Date(item.expirationDate);
      const daysUntilExpiration = calculateDaysUntilExpiration(expirationDate, now);

      if (daysUntilExpiration < 0) {
        expired.push(item);
      } else if (daysUntilExpiration === 0) {
        expiringToday.push(item);
      } else if (daysUntilExpiration <= EXPIRATION_WARNING_DAYS) {
        expiringSoon.push(item);
      }
    }

    return {
      expiringToday,
      expiringSoon,
      expired,
    };
  } catch (error) {
    console.log('[PantryNotifications] Error getting expiring items summary:', error);
    return {
      expiringToday: [],
      expiringSoon: [],
      expired: [],
    };
  }
}

/**
 * Check if a specific item is expiring soon
 */
export function isItemExpiringSoon(item: PantryItem): boolean {
  if (!item.expirationDate) return false;

  const expirationDate = new Date(item.expirationDate);
  const daysUntilExpiration = calculateDaysUntilExpiration(expirationDate);

  return daysUntilExpiration <= EXPIRATION_WARNING_DAYS && daysUntilExpiration >= 0;
}

/**
 * Check if a specific item is expired
 */
export function isItemExpired(item: PantryItem): boolean {
  if (!item.expirationDate) return false;

  const expirationDate = new Date(item.expirationDate);
  const daysUntilExpiration = calculateDaysUntilExpiration(expirationDate);

  return daysUntilExpiration < 0;
}

/**
 * Get all scheduled pantry notifications
 * Useful for debugging
 */
export async function getScheduledPantryNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    return allScheduled.filter((n) =>
      n.identifier.startsWith(NOTIFICATION_IDENTIFIER_PREFIX)
    );
  } catch (error) {
    console.log('[PantryNotifications] Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Reschedule notifications for a specific pantry item
 * Call this when an item is updated
 */
export async function reschedulePantryItemNotification(itemId: number): Promise<void> {
  try {
    // Cancel existing notifications for this item
    await cancelPantryItemNotification(itemId);

    // Reschedule all pantry notifications
    await schedulePantryExpirationNotifications();
  } catch (error) {
    console.log('[PantryNotifications] Error rescheduling item notification:', error);
  }
}
