/**
 * ============================================
 * NOTIFICATION BELL COMPONENT
 * ============================================
 * Displays notification icon with unread badge in header
 */

import { useUnreadCount } from '@/hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

interface NotificationBellProps {
  iconSize?: number;
  iconColor?: string;
  badgeColor?: string;
  onPress?: () => void;
  extraCount?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  iconSize = 24,
  iconColor = '#1F2937',
  badgeColor = '#FF3B30',
  onPress,
  extraCount = 0,
  containerStyle,
}) => {
  const router = useRouter();
  const { data: unreadData, isLoading } = useUnreadCount();
  const unreadCount = unreadData?.count || 0;
  const totalCount = unreadCount + (extraCount || 0);
  const showBadge = totalCount > 0;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(main)/(home)/notifications');
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, containerStyle]}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="notifications-outline" size={iconSize} color={iconColor} />
        
        {showBadge && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>
              {totalCount > 99 ? '99+' : totalCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  iconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default NotificationBell;
