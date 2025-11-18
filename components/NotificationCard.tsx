/**
 * ============================================
 * NOTIFICATION CARD COMPONENT
 * ============================================
 * Animated card component for displaying notifications
 * with category-specific styling and interactions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { router } from 'expo-router';
import type { Notification } from '@/src/services/notification.service';
import { useMarkAsRead } from '@/hooks/useNotifications';

// ============================================
// TYPES
// ============================================

interface NotificationCardProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onDelete?: (notificationId: number) => void;
  index?: number;
}

// ============================================
// CATEGORY CONFIG
// ============================================

interface CategoryConfig {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  meal_share_request: {
    color: '#FD8100',
    icon: 'restaurant',
    backgroundColor: '#FFF5EB',
  },
  meal_share_accepted: {
    color: '#00A86B',
    icon: 'checkmark-circle',
    backgroundColor: '#E6F9F0',
  },
  meal_share_declined: {
    color: '#FF5630',
    icon: 'close-circle',
    backgroundColor: '#FFEBE6',
  },
  family: {
    color: '#4C9AFF',
    icon: 'people',
    backgroundColor: '#E6F2FF',
  },
  system: {
    color: '#6B778C',
    icon: 'information-circle',
    backgroundColor: '#F4F5F7',
  },
  pantry_expiration: {
    color: '#FF5630',
    icon: 'warning',
    backgroundColor: '#FFEBE6',
  },
  freshly_update: {
    color: '#00A86B',
    icon: 'megaphone',
    backgroundColor: '#E6F9F0',
  },
  user_message: {
    color: '#4C9AFF',
    icon: 'chatbubbles',
    backgroundColor: '#E6F2FF',
  },
};

// ============================================
// COMPONENT
// ============================================

export function NotificationCard({
  notification,
  onPress,
  onDelete,
  index = 0,
}: NotificationCardProps) {
  const markAsRead = useMarkAsRead();

  const config = CATEGORY_CONFIGS[notification.type] || CATEGORY_CONFIGS.system;

  const handlePress = async () => {
    // Mark as read if unread
    if (!notification.is_read) {
      try {
        await markAsRead.mutateAsync(notification.id);
      } catch (error) {
        console.error('[NotificationCard] Error marking as read:', error);
      }
    }

    // Call custom onPress handler if provided
    if (onPress) {
      onPress(notification);
    } else {
      // Default routing behavior
      handleDefaultRouting(notification);
    }
  };

  const handleDelete = (e: any) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  // Format timestamp
  const timeAgo = formatTimeAgo(new Date(notification.created_at));

  return (
    <MotiView
      from={{
        opacity: 0,
        translateY: 20,
      }}
      animate={{
        opacity: 1,
        translateY: 0,
      }}
      exit={{
        opacity: 0,
        translateX: -100,
      }}
      transition={{
        type: 'timing',
        duration: 300,
        delay: index * 50, // Stagger animation
      }}
      style={styles.container}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.card,
          { backgroundColor: config.backgroundColor },
          !notification.is_read && styles.unreadCard,
        ]}
      >
        {/* Left Color Indicator */}
        <View style={[styles.indicator, { backgroundColor: config.color }]} />

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
          <Ionicons name={config.icon} size={24} color="#FFFFFF" />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                !notification.is_read && styles.unreadTitle,
              ]}
              numberOfLines={2}
            >
              {notification.title}
            </Text>
            {!notification.is_read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message} numberOfLines={3}>
            {notification.message}
          </Text>

          <Text style={styles.timestamp}>{timeAgo}</Text>
        </View>

        {/* Delete Button */}
        {onDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={24} color="#8993A4" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </MotiView>
  );
}

// ============================================
// DEFAULT ROUTING
// ============================================

function handleDefaultRouting(notification: Notification) {
  switch (notification.type) {
    case 'meal_share_request':
    case 'meal_share_accepted':
    case 'meal_share_declined':
      if (notification.related_id) {
        router.push({
          pathname: '/(home)/meal/[id]',
          params: { id: notification.related_id.toString() },
        });
      }
      break;

    case 'family':
      router.push('/(home)/chat');
      break;

    default:
      // Stay on notifications screen
      break;
  }
}

// ============================================
// TIME FORMATTING
// ============================================

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    // Return formatted date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  unreadCard: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  indicator: {
    width: 4,
  },
  iconContainer: {
    width: 56,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#172B4D',
    lineHeight: 22,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FD8100',
    marginLeft: 8,
    marginTop: 7,
  },
  message: {
    fontSize: 14,
    color: '#5E6C84',
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#8993A4',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ============================================
// EXPORT
// ============================================

export default NotificationCard;
