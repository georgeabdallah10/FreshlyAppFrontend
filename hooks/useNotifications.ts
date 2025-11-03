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
    type Notification,
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
  return useNotifications({ is_read: false });
}

// Get meal share request notifications
export function useMealShareNotifications() {
  return useNotifications({ type: 'meal_share_request' });
}

// Handle notification click - marks as read and returns related_id
export function useHandleNotificationClick() {
  const markAsRead = useMarkAsRead();

  return {
    mutateAsync: async (notification: Notification): Promise<number | null> => {
      if (!notification.is_read) {
        await markAsRead.mutateAsync(notification.id);
      }
      return notification.related_id || null;
    },
  };
}
