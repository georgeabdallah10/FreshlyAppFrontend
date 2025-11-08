/**
 * ============================================
 * DYNAMIC ICON BUTTON COMPONENT
 * ============================================
 * Reusable icon button with optional badge support
 * Works with any Ionicons icon name
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface IconButtonProps {
  // Icon properties
  iconName: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  
  // Badge properties
  showBadge?: boolean;
  badgeCount?: number;
  badgeColor?: string;
  badgeTextColor?: string;
  badgeMaxCount?: number;
  badgePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  
  // Container properties
  backgroundColor?: string;
  containerSize?: number;
  borderRadius?: number;
  
  // Interaction properties
  onPress?: () => void;
  disabled?: boolean;
  activeOpacity?: number;
  
  // Style overrides
  style?: ViewStyle;
  iconContainerStyle?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  // Icon properties
  iconName,
  iconSize = 24,
  iconColor = '#1F2937',
  
  // Badge properties
  showBadge = false,
  badgeCount = 0,
  badgeColor = '#FF3B30',
  badgeTextColor = '#FFFFFF',
  badgeMaxCount = 99,
  badgePosition = 'top-right',
  
  // Container properties
  backgroundColor = 'transparent',
  containerSize = 40,
  borderRadius = 20,
  
  // Interaction properties
  onPress,
  disabled = false,
  activeOpacity = 0.7,
  
  // Style overrides
  style,
  iconContainerStyle,
}) => {
  // Format badge count with max limit
  const formatBadgeCount = (count: number): string => {
    if (count > badgeMaxCount) {
      return `${badgeMaxCount}+`;
    }
    return count.toString();
  };

  // Get badge position styles
  const getBadgePositionStyle = (): ViewStyle => {
    switch (badgePosition) {
      case 'top-left':
        return { top: 0, left: 0 };
      case 'bottom-right':
        return { bottom: 0, right: 0 };
      case 'bottom-left':
        return { bottom: 0, left: 0 };
      case 'top-right':
      default:
        return { top: 0, right: 0 };
    }
  };

  const shouldShowBadge = showBadge && badgeCount > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, style]}
      activeOpacity={activeOpacity}
      disabled={disabled || !onPress}
    >
      <View
        style={[
          styles.iconContainer,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: borderRadius,
            backgroundColor: backgroundColor,
          },
          iconContainerStyle,
        ]}
      >
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
        
        {shouldShowBadge && (
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeColor },
              getBadgePositionStyle(),
            ]}
          >
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>
              {formatBadgeCount(badgeCount)}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default IconButton;