/**
 * ============================================
 * NOTIFICATION CARD COMPONENT
 * ============================================
 * Animated card component for displaying notifications
 * with category-specific styling and interactions
 */

import { useThemeContext } from "@/context/ThemeContext";
import { useMarkAsRead } from '@/hooks/useNotifications';
import type { NotificationOut as Notification } from '@/src/services/notification.service';
import { ColorTokens } from "@/theme/colors";
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================
// TYPES
// ============================================

interface NotificationCardProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onDelete?: (notificationId: number) => void;
  index?: number;
}

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
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
  shadow: withAlpha(colors.textPrimary, 0.12),
});

const getCategoryConfig = (
  type: Notification["type"] | string,
  palette: ReturnType<typeof createPalette>
) => {
  switch (type) {
    case "meal_share_request":
      return { color: palette.warning, icon: "restaurant" as const, backgroundColor: withAlpha(palette.warning, 0.12) };
    case "meal_share_accepted":
      return { color: palette.success, icon: "checkmark-circle" as const, backgroundColor: withAlpha(palette.success, 0.12) };
    case "meal_share_declined":
      return { color: palette.error, icon: "close-circle" as const, backgroundColor: withAlpha(palette.error, 0.12) };
    case "family_member_joined":
    case "family_invite":
    case "family":
      return { color: palette.primary, icon: "people" as const, backgroundColor: withAlpha(palette.primary, 0.12) };
    case "user_message":
      return { color: palette.primary, icon: "chatbubbles" as const, backgroundColor: withAlpha(palette.primary, 0.12) };
    case "pantry_expiration":
      return { color: palette.error, icon: "warning" as const, backgroundColor: withAlpha(palette.error, 0.12) };
    case "freshly_update":
      return { color: palette.primary, icon: "megaphone" as const, backgroundColor: withAlpha(palette.primary, 0.12) };
    case "system":
    default:
      return { color: palette.textMuted, icon: "information-circle" as const, backgroundColor: withAlpha(palette.textMuted, 0.12) };
  }
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
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const markAsRead = useMarkAsRead();

  const config = getCategoryConfig(notification.type, palette);

  const handlePress = async () => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await markAsRead.mutateAsync(notification.id);
      } catch (error) {
        console.log('[NotificationCard] Error marking as read:', error);
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
  const timeAgo = formatTimeAgo(new Date(notification.createdAt));

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
          !notification.isRead && styles.unreadCard,
        ]}
      >
        {/* Left Color Indicator */}
        <View style={[styles.indicator, { backgroundColor: config.color }]} />

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
          <Ionicons name={config.icon} size={24} color={palette.card} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                !notification.isRead && styles.unreadTitle,
              ]}
              numberOfLines={2}
            >
              {notification.title}
            </Text>
            {!notification.isRead && <View style={styles.unreadDot} />}
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
            <Ionicons name="close-circle" size={24} color={palette.textMuted} />
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
      if (notification.relatedMealId) {
        router.push({
          pathname: '/(home)/meal/[id]' as any,
          params: { id: notification.relatedMealId.toString() },
        });
      }
      break;

    case 'family_member_joined':
    case 'family_invite':
      router.push('/(home)/chat' as any);
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

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    card: {
      flexDirection: 'row',
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      ...Platform.select({
        ios: {
          shadowColor: palette.shadow,
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
      borderColor: palette.primary,
      backgroundColor: withAlpha(palette.primary, 0.1),
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
      color: palette.text,
      lineHeight: 22,
    },
    unreadTitle: {
      fontWeight: '700',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.primary,
      marginLeft: 8,
      marginTop: 7,
    },
    message: {
      fontSize: 14,
      color: palette.textMuted,
      lineHeight: 20,
      marginBottom: 8,
    },
    timestamp: {
      fontSize: 12,
      color: palette.textMuted,
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
