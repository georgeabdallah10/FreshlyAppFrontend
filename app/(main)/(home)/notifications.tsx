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
import { useScrollContentStyle } from '@/hooks/useBottomNavInset';
import { useThemeContext } from '@/context/ThemeContext';
import { ColorTokens } from '@/theme/colors';
import { type NotificationOut as Notification, type NotificationType } from '@/src/services/notification.service';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
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

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createPalette = (colors: ColorTokens) => ({
  background: colors.background,
  card: colors.card,
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  border: colors.border,
  chipBg: withAlpha(colors.textSecondary, 0.08),
  shadow: withAlpha(colors.textPrimary, 0.12),
});

const NotificationsScreen = () => {
  const router = useRouter();
  const scrollContentStyle = useScrollContentStyle();
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'confirm';
    message: string;
    title?: string;
    buttons?: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'destructive' | 'cancel';
    }>;
  }>({ visible: false, type: 'success', message: '' });

  const handleCategoryChange = (newCategory: CategoryFilter) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCategory(newCategory);
  };

  // Queries
  const {
    data: allNotifications = [],
    isLoading,
    refetch,
    isRefetching,
  } = useNotifications();
  const { data: unreadNotifications = [] } = useUnreadNotifications();

  // Guard against unexpected shapes so array methods are safe
  const safeAllNotifications = Array.isArray(allNotifications) ? allNotifications : [];
  const safeUnreadNotifications = Array.isArray(unreadNotifications) ? unreadNotifications : [];

  // Mutations
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllRead = useDeleteAllRead();
  const handleNotificationClick = useHandleNotificationClick();
  
  // Filter by read/unread first
  const baseNotifications = filter === 'unread'
    ? safeUnreadNotifications
    : safeAllNotifications;
  
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
        return baseNotifications.filter(n => n.type === 'family_member_joined' || n.type === 'family_invite');
      case 'all':
      default:
        return baseNotifications;
    }
  };

  const notifications = getFilteredNotifications();
  const unreadCount = unreadNotifications.length;
  
  // Count by category
  const mealRequestsCount = safeAllNotifications.filter(n => 
    n.type === 'meal_share_request' || 
    n.type === 'meal_share_accepted' || 
    n.type === 'meal_share_declined'
  ).length;
  const updatesCount = safeAllNotifications.filter(n => n.type === 'system').length;
  const messagesCount = safeAllNotifications.filter(n => n.type === 'family_member_joined' || n.type === 'family_invite').length;

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
    setToast({
      visible: true,
      type: 'confirm',
      title: 'Delete Read Notifications',
      message: 'Are you sure you want to delete all read notifications?',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
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
      ],
    });
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      const relatedId = await handleNotificationClick.mutateAsync(notification);
      
      // Navigate based on notification type
      if (notification.type === 'meal_share_request') {
        router.push('/(main)/(home)/mealShareRequests');
      } else if (notification.type === 'meal_share_accepted' || notification.type === 'meal_share_declined') {
        router.push('/(main)/(home)/mealShareRequests');
      }
    } catch (error: any) {
      setToast({
        visible: true,
        type: 'error',
        message: error.message || 'Failed to handle notification',
      });
    }
  };

  const getIcon = (type: NotificationType): { name: any; color: string } => {
    switch (type) {
      case 'meal_share_request':
        return { name: 'restaurant-outline' as const, color: palette.primary };
      case 'meal_share_accepted':
        return { name: 'checkmark-circle-outline' as const, color: palette.success };
      case 'meal_share_declined':
        return { name: 'close-circle-outline' as const, color: palette.error };
      case 'family_member_joined':
      case 'family_invite':
        return { name: 'people-outline' as const, color: palette.textMuted };
      case 'system':
        return { name: 'information-circle-outline' as const, color: palette.warning };
      default:
        return { name: 'notifications-outline' as const, color: palette.textMuted };
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

  return (
    <View style={styles.container}>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        buttons={toast.buttons}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text style={styles.backIcon}>←</Text>
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
          <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
          <Text style={styles.clearButtonText}>Clear Read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={palette.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={withAlpha(palette.textMuted, 0.4)} />
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
              palette={palette}
              styles={styles}
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
  palette: ReturnType<typeof createPalette>;
  styles: ReturnType<typeof createStyles>;
}> = ({ notification, onPress, onMarkAsRead, onDelete, getIcon, formatTime, palette, styles }) => {
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
      style={[styles.notificationItem, !notification.isRead && styles.notificationItemUnread]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: withAlpha(icon.color, 0.12) }]}>
        <Ionicons name={icon.name} size={24} color={icon.color} />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          {!notification.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.notificationTime}>{formatTime(notification.createdAt)}</Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        activeOpacity={0.6}
      >
        <Ionicons name="close" size={20} color={palette.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      paddingTop: 50,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      backgroundColor: palette.card,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.chipBg,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: palette.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    backIcon: {
      fontSize: 22,
      fontWeight: '600',
      color: palette.primary,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.text,
    },
    markAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    markAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.primary,
    },
    markAllTextDisabled: {
      color: palette.textMuted,
      opacity: 0.5,
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
      borderBottomColor: palette.border,
      backgroundColor: palette.card,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: palette.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterButtonActive: {
      backgroundColor: withAlpha(palette.primary, 0.12),
    },
    filterText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textMuted,
    },
    filterTextActive: {
      color: palette.primary,
    },
    actionBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      backgroundColor: palette.card,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: palette.chipBg,
    },
    clearButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: palette.textMuted,
    },
    scrollView: {
      flex: 1,
      backgroundColor: palette.background,
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
      color: palette.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: palette.textMuted,
      marginTop: 8,
    },
    notificationItem: {
      flexDirection: 'row',
      backgroundColor: palette.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    notificationItemUnread: {
      backgroundColor: withAlpha(palette.primary, 0.08),
      borderColor: palette.primary,
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
      color: palette.text,
      flex: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.primary,
      marginLeft: 8,
    },
    notificationMessage: {
      fontSize: 14,
      color: palette.textMuted,
      lineHeight: 20,
      marginBottom: 6,
    },
    notificationTime: {
      fontSize: 12,
      color: palette.textMuted,
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
      borderBottomColor: palette.border,
      maxHeight: 60,
      flexGrow: 0,
      backgroundColor: palette.card,
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
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      marginRight: 6,
      shadowColor: palette.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    categoryTabActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
      shadowColor: palette.primary,
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
      color: palette.textMuted,
    },
    categoryTextActive: {
      color: palette.card,
    },
    categoryBadge: {
      backgroundColor: palette.card,
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
      color: palette.primary,
    },
  });

export default NotificationsScreen;
