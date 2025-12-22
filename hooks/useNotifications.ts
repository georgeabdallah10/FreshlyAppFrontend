/**
 * NOTIFICATION REACT QUERY HOOKS
 * Custom hooks for notification data fetching and mutations
 */

import {
  deleteAllNotifications,
  deleteAllReadNotifications,
  deleteNotification,
  getNotification,
  getNotifications,
  getNotificationStats,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
  type NotificationOut as Notification,
  type NotificationsQuery
} from '@/src/services/notification.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Query Keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: NotificationsQuery) => [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: number) => [...notificationKeys.details(), id] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
};

// Get all notifications with optional filters
export function useNotifications(query: NotificationsQuery = {}) {
  return useQuery({
    queryKey: notificationKeys.list(query),
    queryFn: () => getNotifications(query),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

// Get unread notification count for badge
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
}

// Get notification statistics
export function useNotificationStats() {
  return useQuery({
    queryKey: notificationKeys.stats(),
    queryFn: getNotificationStats,
    staleTime: 60000,
  });
}

// Get a specific notification by ID
export function useNotification(notificationId: number | null) {
  return useQuery({
    queryKey: notificationKeys.detail(notificationId!),
    queryFn: () => getNotification(notificationId!),
    enabled: notificationId !== null,
  });
}

// Mark a notification as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Mark a notification as unread
export function useMarkAsUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => markNotificationAsUnread(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Mark all notifications as read
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Delete a notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Delete all read notifications
export function useDeleteAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllReadNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Delete all notifications
export function useDeleteAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(notificationKeys.lists(), []);
      queryClient.setQueryData(notificationKeys.unreadCount(), { count: 0 });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Get only unread notifications
export function useUnreadNotifications() {
  return useNotifications({ unreadOnly: true });
}

// Get meal share notifications (requests + responses)
export function useMealShareNotifications() {
  const query = useNotifications();
  const mealShareTypes: NotificationType[] = [
    'meal_share_request',
    'meal_share_accepted',
    'meal_share_declined',
  ];

  return {
    ...query,
    data: (query.data || []).filter((notification) =>
      mealShareTypes.includes(notification.type)
    ),
  };
}

// Handle notification click - marks as read and returns related_id
export function useHandleNotificationClick() {
  const markAsRead = useMarkAsRead();

  return {
    mutateAsync: async (notification: Notification): Promise<number | null> => {
      if (!notification.isRead) {
        await markAsRead.mutateAsync(notification.id);
      }
      return notification.relatedMealId || notification.relatedUserId || notification.relatedFamilyId || notification.relatedShareRequestId || null;
    },
  };
}

// ============================================
// PUSH NOTIFICATION HOOKS
// ============================================

import { useCallback, useEffect, useState } from 'react';
import {
  setupNotificationReceivedListener,
  setupNotificationResponseListener,
} from '../src/notifications/handleIncomingNotifications';
import {
  isPushNotificationEnabled,
  registerForPushNotifications,
  setBadgeCount,
} from '../src/notifications/registerForPush';
import {
  schedulePantryExpirationNotifications,
} from '../src/notifications/schedulePantryNotifications';

/**
 * Complete notification system hook with push notifications and pantry alerts
 */
export function useNotificationSystem(userId?: number) {
  const queryClient = useQueryClient();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Use existing hooks
  const notificationsQuery = useNotifications();
  const unreadCountQuery = useUnreadCount();

  // Register for push notifications mutation
  const registerPushMutation = useMutation({
    mutationFn: (id: number) => registerForPushNotifications(id),
    onSuccess: (result) => {
      if (result.success && result.token) {
        setExpoPushToken(result.token);
        setPermissionsGranted(true);
        console.log('[useNotificationSystem] Push notifications registered');
      }
    },
    onError: (error) => {
      console.log('[useNotificationSystem] Error registering for push:', error);
      setPermissionsGranted(false);
    },
  });

  // Initialize notification system
  useEffect(() => {
    let responseSubscription: (() => void) | undefined;
    let receivedSubscription: (() => void) | undefined;

    async function initialize() {
      try {
        // Check permission status
        const hasPermission = await isPushNotificationEnabled();
        setPermissionsGranted(hasPermission);

        // Setup notification listeners
        responseSubscription = setupNotificationResponseListener();
        receivedSubscription = setupNotificationReceivedListener();

        // Schedule pantry notifications
        await schedulePantryExpirationNotifications();

        setIsInitialized(true);
        console.log('[useNotificationSystem] Initialized successfully');
      } catch (error) {
        console.log('[useNotificationSystem] Initialization error:', error);
        setIsInitialized(true); // Set to true anyway to prevent infinite loading
      }
    }

    initialize();

    // Cleanup
    return () => {
      responseSubscription?.();
      receivedSubscription?.();
    };
  }, []);

  // Update badge count when unread count changes
  useEffect(() => {
    const count = unreadCountQuery.data?.count ?? 0;
    if (typeof count === 'number') {
      setBadgeCount(count);
    }
  }, [unreadCountQuery.data]);

  // Register for push
  const registerForPush = useCallback(() => {
    if (userId) {
      registerPushMutation.mutate(userId);
    }
  }, [registerPushMutation, userId]);

  // Refresh all notification data
  const refresh = useCallback(async () => {
    await Promise.all([
      notificationsQuery.refetch(),
      unreadCountQuery.refetch(),
      schedulePantryExpirationNotifications(),
    ]);
  }, [notificationsQuery, unreadCountQuery]);

  return {
    // Notification data
    notifications: notificationsQuery.data ?? [],
    unreadCount: unreadCountQuery.data?.count ?? 0,

    // Loading states
    isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading || !isInitialized,
    isLoadingNotifications: notificationsQuery.isLoading,
    isLoadingUnreadCount: unreadCountQuery.isLoading,
    isInitialized,

    // Error states
    error: notificationsQuery.error || unreadCountQuery.error,

    // Push notification
    expoPushToken,
    permissionsGranted,
    registerForPush,
    isRegisteringPush: registerPushMutation.isPending,

    // Actions
    refresh,
  };
}

/**
 * Hook for notification permissions only
 */
export function useNotificationPermissions(userId?: number) {
  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    async function checkPermissions() {
      try {
        const hasPermission = await isPushNotificationEnabled();
        setPermissionsGranted(hasPermission);
      } catch (error) {
        console.log('[useNotificationPermissions] Error checking permissions:', error);
      } finally {
        setIsChecking(false);
      }
    }

    checkPermissions();
  }, []);

  const requestPermissions = useCallback(async () => {
    if (!userId) {
      console.warn('[useNotificationPermissions] No userId provided');
      return false;
    }
    try {
      const token = await registerForPushNotifications(userId);
      setPermissionsGranted(!!token);
      return !!token;
    } catch (error) {
      console.log('[useNotificationPermissions] Error requesting permissions:', error);
      setPermissionsGranted(false);
      return false;
    }
  }, [userId]);

  return {
    permissionsGranted,
    isChecking,
    requestPermissions,
  };
}

// Fix missing import
import type { NotificationType } from '@/src/services/notification.service';
