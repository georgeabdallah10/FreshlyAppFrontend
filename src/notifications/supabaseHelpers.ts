/**
 * ============================================
 * SUPABASE NOTIFICATION HELPERS
 * ============================================
 * Database operations for notification storage and syncing
 */

import { supabase } from '../supabase/client';
import { Storage } from '../utils/storage';
import type {
  SupabaseNotification,
  UserPushToken,
  NotificationCategory,
  NotificationPreferences,
} from './types';

// ============================================
// PUSH TOKEN OPERATIONS
// ============================================

/**
 * Store or update Expo push token in database
 */
export async function savePushToken(
  userId: number,
  expoPushToken: string,
  platform: 'ios' | 'android' | 'web',
  deviceName?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          platform,
          device_name: deviceName,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      );

    if (error) {
      console.error('[Supabase] Error saving push token:', error);
      throw error;
    }

    console.log('[Supabase] Push token saved successfully');
  } catch (error) {
    console.error('[Supabase] Failed to save push token:', error);
    throw error;
  }
}

/**
 * Get user's push token from database
 */
export async function getUserPushToken(
  userId: number,
  platform: 'ios' | 'android' | 'web'
): Promise<UserPushToken | null> {
  try {
    const { data, error } = await supabase
      .from('user_push_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned"
      console.error('[Supabase] Error fetching push token:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[Supabase] Failed to fetch push token:', error);
    return null;
  }
}

/**
 * Delete user's push token (e.g., on logout)
 */
export async function deletePushToken(
  userId: number,
  platform: 'ios' | 'android' | 'web'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      console.error('[Supabase] Error deleting push token:', error);
      throw error;
    }

    console.log('[Supabase] Push token deleted successfully');
  } catch (error) {
    console.error('[Supabase] Failed to delete push token:', error);
    throw error;
  }
}

// ============================================
// NOTIFICATION STORAGE
// ============================================

/**
 * Fetch notifications from Supabase
 * Note: Preferably use the backend API instead of direct Supabase queries
 */
export async function fetchNotifications(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<SupabaseNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Supabase] Error fetching notifications:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[Supabase] Failed to fetch notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read in database
 */
export async function markNotificationRead(notificationId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('[Supabase] Error marking notification as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('[Supabase] Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Create a new notification in database
 * (Usually done by backend, but useful for local testing)
 */
export async function createNotification(
  userId: number,
  category: NotificationCategory,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<SupabaseNotification> {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        category,
        title,
        message,
        data: data || {},
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating notification:', error);
      throw error;
    }

    return notification;
  } catch (error) {
    console.error('[Supabase] Failed to create notification:', error);
    throw error;
  }
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences(
  userId: number
): Promise<NotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Supabase] Error fetching preferences:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[Supabase] Failed to fetch preferences:', error);
    return null;
  }
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(
  userId: number,
  preferences: Partial<Omit<NotificationPreferences, 'userId'>>
): Promise<NotificationPreferences> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          ...preferences,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error updating preferences:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[Supabase] Failed to update preferences:', error);
    throw error;
  }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to realtime notification updates
 * Returns unsubscribe function
 */
export function subscribeToNotifications(
  userId: number,
  onNotification: (notification: SupabaseNotification) => void
): () => void {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Supabase] New notification received:', payload);
        onNotification(payload.new as SupabaseNotification);
      }
    )
    .subscribe();

  console.log('[Supabase] Subscribed to notification updates');

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
    console.log('[Supabase] Unsubscribed from notification updates');
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get unread notification count from database
 */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[Supabase] Error fetching unread count:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('[Supabase] Failed to fetch unread count:', error);
    return 0;
  }
}

/**
 * Delete old read notifications (cleanup)
 */
export async function deleteOldReadNotifications(
  userId: number,
  daysOld: number = 30
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true)
      .lt('created_at', cutoffDate.toISOString())
      .select();

    if (error) {
      console.error('[Supabase] Error deleting old notifications:', error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`[Supabase] Deleted ${deletedCount} old notifications`);
    return deletedCount;
  } catch (error) {
    console.error('[Supabase] Failed to delete old notifications:', error);
    return 0;
  }
}

// ============================================
// DATABASE SCHEMA HELPERS
// ============================================

/**
 * SQL for creating required tables (for reference)
 * Run these in Supabase SQL editor if tables don't exist
 */
export const NOTIFICATION_TABLES_SQL = `
-- User Push Tokens Table
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Notifications Table (if not created by backend)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  enable_push BOOLEAN NOT NULL DEFAULT TRUE,
  enable_meal_requests BOOLEAN NOT NULL DEFAULT TRUE,
  enable_freshly_updates BOOLEAN NOT NULL DEFAULT TRUE,
  enable_user_messages BOOLEAN NOT NULL DEFAULT TRUE,
  enable_pantry_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  pantry_alert_days INTEGER NOT NULL DEFAULT 3,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own push tokens"
  ON user_push_tokens FOR SELECT
  USING (auth.uid()::integer = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON user_push_tokens FOR INSERT
  WITH CHECK (auth.uid()::integer = user_id);

CREATE POLICY "Users can update own push tokens"
  ON user_push_tokens FOR UPDATE
  USING (auth.uid()::integer = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON user_push_tokens FOR DELETE
  USING (auth.uid()::integer = user_id);

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid()::integer = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid()::integer = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid()::integer = user_id);
`;
