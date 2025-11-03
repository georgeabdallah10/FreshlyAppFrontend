import ToastBanner from '@/components/generalMessage';
import {
  useDeleteAllRead,
  useDeleteNotification,
  useHandleNotificationClick,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  useUnreadNotifications,
} from '@/hooks/useNotifications';
import { type Notification, type NotificationType } from '@/src/services/notification.service';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

type CategoryFilter = 'all' | 'meal_requests' | 'updates' | 'messages';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  (UIManager as any).setLayoutAnimationEnabledExperimental
) {
  (UIManager as any).setLayoutAnimationEnabledExperimental(true);
}

const NotificationsScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ visible: false, type: 'success', message: '' });

  const handleCategoryChange = (newCategory: CategoryFilter) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCategory(newCategory);
  };

  // Queries
  const { data: allNotifications = [], isLoading, refetch, isRefetching } = useNotifications();
  const { data: unreadNotifications = [] } = useUnreadNotifications();

  // Mutations
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllRead = useDeleteAllRead();
  const handleNotificationClick = useHandleNotificationClick();
  
  // Filter by read/unread first
  const baseNotifications = filter === 'unread' ? unreadNotifications : allNotifications;
  
  // Then filter by category
  const getFilteredNotifications = () => {
    switch (category) {
      case 'meal_requests':
        return baseNotifications.filter(n => 
          n.type === 'meal_share_request' || 
          n.type === 'meal_share_accepted' || 
          n.type === 'meal_share_declined'
        );
      case 'updates':
        return baseNotifications.filter(n => n.type === 'system');
      case 'messages':
        return baseNotifications.filter(n => n.type === 'family');
      case 'all':
      default:
        return baseNotifications;
    }
  };

  const notifications = getFilteredNotifications();
  const unreadCount = unreadNotifications.length;
  
  // Count by category
  const mealRequestsCount = allNotifications.filter(n => 
    n.type === 'meal_share_request' || 
    n.type === 'meal_share_accepted' || 
    n.type === 'meal_share_declined'
  ).length;
  const updatesCount = allNotifications.filter(n => n.type === 'system').length;
  const messagesCount = allNotifications.filter(n => n.type === 'family').length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead.mutateAsync(id);
    } catch (error: any) {
      setToast({
        visible: true,
        type: 'error',
        message: error.message || 'Failed to mark as read',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
      setToast({
        visible: true,
        type: 'success',
        message: 'All notifications marked as read',
      });
    } catch (error: any) {
      setToast({
        visible: true,
        type: 'error',
        message: error.message || 'Failed to mark all as read',
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification.mutateAsync(id);
      setToast({
        visible: true,
        type: 'success',
        message: 'Notification deleted',
      });
    } catch (error: any) {
      setToast({
        visible: true,
        type: 'error',
        message: error.message || 'Failed to delete notification',
      });
    }
  };

  const handleDeleteAllRead = () => {
    Alert.alert(
      'Delete Read Notifications',
      'Are you sure you want to delete all read notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllRead.mutateAsync();
              setToast({
                visible: true,
                type: 'success',
                message: 'Read notifications deleted',
              });
            } catch (error: any) {
              setToast({
                visible: true,
                type: 'error',
                message: error.message || 'Failed to delete notifications',
              });
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      const relatedId = await handleNotificationClick.mutateAsync(notification);
      
      // Navigate based on notification type
      if (notification.type === 'meal_share_request') {
        router.push('/(home)/mealShareRequests');
      } else if (notification.type === 'meal_share_accepted' || notification.type === 'meal_share_declined') {
        router.push('/(home)/mealShareRequests');
      }
    } catch (error: any) {
      setToast({
        visible: true,
        type: 'error',
        message: error.message || 'Failed to handle notification',
      });
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'meal_share_request':
        return { name: 'restaurant-outline' as const, color: '#00A86B' };
      case 'meal_share_accepted':
        return { name: 'checkmark-circle-outline' as const, color: '#10B981' };
      case 'meal_share_declined':
        return { name: 'close-circle-outline' as const, color: '#EF4444' };
      case 'family':
        return { name: 'people-outline' as const, color: '#6B7280' };
      case 'system':
        return { name: 'information-circle-outline' as const, color: '#3B82F6' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.6}
          >
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A86B" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
          activeOpacity={0.6}
          disabled={unreadCount === 0}
        >
          <Text style={[
            styles.markAllText,
            unreadCount === 0 && styles.markAllTextDisabled
          ]}>
            Mark all
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
          onPress={() => setFilter('unread')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Unread
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <Pressable
          onPress={() => handleCategoryChange('all')}
          style={({ pressed }) => [
            styles.categoryTab,
            category === 'all' && styles.categoryTabActive,
            pressed && styles.categoryTabPressed,
          ]}
        >
          <Text style={[styles.categoryText, category === 'all' && styles.categoryTextActive]}>
            All
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleCategoryChange('meal_requests')}
          style={({ pressed }) => [
            styles.categoryTab,
            category === 'meal_requests' && styles.categoryTabActive,
            pressed && styles.categoryTabPressed,
          ]}
        >
          <Text style={[styles.categoryText, category === 'meal_requests' && styles.categoryTextActive]}>
            Meal Requests
          </Text>
          {mealRequestsCount > 0 && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{mealRequestsCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => handleCategoryChange('updates')}
          style={({ pressed }) => [
            styles.categoryTab,
            category === 'updates' && styles.categoryTabActive,
            pressed && styles.categoryTabPressed,
          ]}
        >
          <Text style={[styles.categoryText, category === 'updates' && styles.categoryTextActive]}>
            Updates
          </Text>
          {updatesCount > 0 && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{updatesCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => handleCategoryChange('messages')}
          style={({ pressed }) => [
            styles.categoryTab,
            category === 'messages' && styles.categoryTabActive,
            pressed && styles.categoryTabPressed,
          ]}
        >
          <Text style={[styles.categoryText, category === 'messages' && styles.categoryTextActive]}>
            Messages
          </Text>
          {messagesCount > 0 && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{messagesCount}</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleDeleteAllRead}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#6B7280" />
          <Text style={styles.clearButtonText}>Clear Read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#00A86B"
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'unread' ? 'No unread notifications' : "You're all caught up!"}
            </Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onPress={() => handleNotificationPress(notif)}
              onMarkAsRead={() => handleMarkAsRead(notif.id)}
              onDelete={() => handleDelete(notif.id)}
              getIcon={getIcon}
              formatTime={formatTime}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const NotificationItem: React.FC<{
  notification: Notification;
  onPress: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  getIcon: (type: NotificationType) => { name: any; color: string };
  formatTime: (dateString: string) => string;
}> = ({ notification, onPress, onMarkAsRead, onDelete, getIcon, formatTime }) => {
  const icon = getIcon(notification.type);

  const handlePress = () => {
    onPress();
  };

  const handleDelete = (e: any) => {
    e?.stopPropagation?.();
    onDelete();
  };

  return (
    <TouchableOpacity
      style={[styles.notificationItem, !notification.is_read && styles.notificationItemUnread]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
        <Ionicons name={icon.name} size={24} color={icon.color} />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          {!notification.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.notificationTime}>{formatTime(notification.created_at)}</Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        activeOpacity={0.6}
      >
        <Ionicons name="close" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00A86B',
  },
  markAllTextDisabled: {
    color: '#9CA3AF',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#00A86B',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F7F8FA',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7EBEF',
  },
  notificationItemUnread: {
    backgroundColor: '#F0FDF4',
    borderColor: '#00A86B',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00A86B',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    maxHeight: 60,
    flexGrow: 0,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECF2',
    marginRight: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categoryTabActive: {
    backgroundColor: '#00A86B',
    borderColor: '#00A86B',
    shadowColor: '#00A86B',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  categoryTabPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00A86B',
  },
});

export default NotificationsScreen;
