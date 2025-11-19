/**
 * ============================================
 * NOTIFICATIONS SCREEN
 * ============================================
 * Main dashboard for viewing and managing notifications
 * Features: Pull-to-refresh, filtering, mark as read, empty state
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import NotificationCard from '@/components/NotificationCard';
import {
  useNotifications,
  useUnreadCount,
  useMarkAllAsRead,
  useDeleteNotification,
  useNotificationPermissions,
} from '@/hooks/useNotifications';
import type { Notification } from '@/src/services/notification.service';

// ============================================
// FILTER TABS
// ============================================

type FilterTab = 'all' | 'unread' | 'meal_requests' | 'updates';

interface TabConfig {
  key: FilterTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  { key: 'all', label: 'All', icon: 'notifications' },
  { key: 'unread', label: 'Unread', icon: 'radio-button-on' },
  { key: 'meal_requests', label: 'Meals', icon: 'restaurant' },
  { key: 'updates', label: 'Updates', icon: 'megaphone' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Queries
  const { data: allNotifications = [], isLoading, refetch } = useNotifications();
  const { data: unreadCountData } = useUnreadCount();
  const unreadCount = unreadCountData?.count ?? 0;

  // Mutations
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  // Permissions
  const { permissionsGranted, requestPermissions } = useNotificationPermissions();

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter notifications based on active tab
  const filteredNotifications = filterNotifications(allNotifications, activeTab);

  // ============================================
  // HANDLERS
  // ============================================

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('[NotificationsScreen] Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount === 0) {
      Alert.alert('No Unread Notifications', 'All notifications are already marked as read.');
      return;
    }

    Alert.alert(
      'Mark All as Read',
      `Mark all ${unreadCount} notifications as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Read',
          style: 'default',
          onPress: () => {
            markAllAsRead.mutate();
          },
        },
      ]
    );
  }, [unreadCount, markAllAsRead]);

  const handleDelete = useCallback(
    (notificationId: number) => {
      Alert.alert(
        'Delete Notification',
        'Are you sure you want to delete this notification?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteNotification.mutate(notificationId);
            },
          },
        ]
      );
    },
    [deleteNotification]
  );

  const handleEnableNotifications = useCallback(async () => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Permissions Required',
        'Please enable notifications in your device settings to receive important updates.',
        [{ text: 'OK' }]
      );
    }
  }, [requestPermissions]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          disabled={unreadCount === 0 || markAllAsRead.isPending}
          style={[
            styles.markAllButton,
            (unreadCount === 0 || markAllAsRead.isPending) && styles.markAllButtonDisabled,
          ]}
        >
          <Ionicons
            name="checkmark-done"
            size={20}
            color={unreadCount === 0 ? '#C1C7D0' : '#FD8100'}
          />
          <Text
            style={[
              styles.markAllText,
              (unreadCount === 0 || markAllAsRead.isPending) && styles.markAllTextDisabled,
            ]}
          >
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Permissions Banner */}
      {!permissionsGranted && (
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={styles.permissionBanner}
        >
          <Ionicons name="notifications-off" size={24} color="#FF5630" />
          <View style={styles.permissionContent}>
            <Text style={styles.permissionTitle}>Notifications Disabled</Text>
            <Text style={styles.permissionMessage}>
              Enable notifications to get updates about your pantry and meals
            </Text>
          </View>
          <TouchableOpacity onPress={handleEnableNotifications} style={styles.enableButton}>
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        </MotiView>
      )}

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabsScrollView}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count =
            tab.key === 'unread' ? unreadCount : getTabCount(allNotifications, tab.key);

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={isActive ? '#FFFFFF' : '#5E6C84'}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <NotificationCard
            notification={item}
            onDelete={handleDelete}
            index={index}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#FD8100"
            colors={['#FD8100']}
          />
        }
        ListEmptyComponent={
          <EmptyState
            isLoading={isLoading}
            filter={activeTab}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================

interface EmptyStateProps {
  isLoading: boolean;
  filter: FilterTab;
  onRefresh: () => void;
}

function EmptyState({ isLoading, filter, onRefresh }: EmptyStateProps) {
  if (isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <MotiView
          from={{ rotate: '0deg' }}
          animate={{ rotate: '360deg' }}
          transition={{
            type: 'timing',
            duration: 1000,
            loop: true,
          }}
        >
          <Ionicons name="notifications" size={64} color="#C1C7D0" />
        </MotiView>
        <Text style={styles.emptyText}>Loading notifications...</Text>
      </View>
    );
  }

  const messages: Record<FilterTab, { icon: keyof typeof Ionicons.glyphMap; text: string }> = {
    all: {
      icon: 'notifications-off-outline',
      text: "You're all caught up!\nNo notifications yet.",
    },
    unread: {
      icon: 'checkmark-circle-outline',
      text: "You're all caught up!\nNo unread notifications.",
    },
    meal_requests: {
      icon: 'restaurant-outline',
      text: 'No meal requests\nat the moment.',
    },
    updates: {
      icon: 'megaphone-outline',
      text: 'No updates\nfrom the Savr team.',
    },
  };

  const config = messages[filter];

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 400 }}
      style={styles.emptyContainer}
    >
      <Ionicons name={config.icon} size={80} color="#C1C7D0" />
      <Text style={styles.emptyText}>{config.text}</Text>
      <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
        <Ionicons name="refresh" size={20} color="#FD8100" />
        <Text style={styles.refreshButtonText}>Pull to refresh</Text>
      </TouchableOpacity>
    </MotiView>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function filterNotifications(
  notifications: Notification[],
  filter: FilterTab
): Notification[] {
  switch (filter) {
    case 'unread':
      return notifications.filter((n) => !n.is_read);

    case 'meal_requests':
      return notifications.filter((n) =>
        ['meal_share_request', 'meal_share_accepted', 'meal_share_declined'].includes(n.type)
      );

    case 'updates':
      return notifications.filter((n) => n.type === 'system');

    case 'all':
    default:
      return notifications;
  }
}

function getTabCount(notifications: Notification[], tab: FilterTab): number {
  return filterNotifications(notifications, tab).length;
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#172B4D',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFF5EB',
    borderRadius: 20,
  },
  markAllButtonDisabled: {
    backgroundColor: '#F4F5F7',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FD8100',
    marginLeft: 6,
  },
  markAllTextDisabled: {
    color: '#C1C7D0',
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBE6',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  permissionContent: {
    flex: 1,
    marginLeft: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#172B4D',
    marginBottom: 4,
  },
  permissionMessage: {
    fontSize: 14,
    color: '#5E6C84',
    lineHeight: 18,
  },
  enableButton: {
    backgroundColor: '#FD8100',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabsScrollView: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F4F5F7',
    borderRadius: 20,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#FD8100',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E6C84',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#E1E4E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 6,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E6C84',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#8993A4',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFF5EB',
    borderRadius: 20,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FD8100',
    marginLeft: 8,
  },
});
