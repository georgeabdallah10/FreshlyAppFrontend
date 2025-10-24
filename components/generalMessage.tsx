// components/ToastBanner.tsx
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  ViewProps,
  Platform,
} from "react-native";

type ToastType = "success" | "error";

type Props = ViewProps & {
  visible: boolean;
  type: ToastType;
  message: string;
  /** ms; default auto: short msg → 3000, long msg → 5000 */
  duration?: number;
  /** called after it fully hides (auto or when visible turns false) */
  onHide?: () => void;
  /** distance from very top (status bar) */
  topOffset?: number;
  /** optional custom icon (emoji or RN element) */
  icon?: React.ReactNode;
  /** style overrides */
  textStyle?: any;
};

const ToastBanner: React.FC<Props> = ({
  visible,
  type,
  message,
  duration,
  onHide,
  topOffset = 16,
  icon,
  style,
  textStyle,
  ...rest
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLong = message?.length > 40;
  const autoDuration = duration ?? (isLong ? 5000 : 3000);

  const palette =
    type === "success"
      ? { bg: "#00C853", border: "#00A449" }
      : { bg: "#FF3B30", border: "#D92A23" };

  // Animate in / out when `visible` changes
  useEffect(() => {
    if (visible) {
      // Clear any previous timers
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      // Fade + slide in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Schedule auto hide
      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -12,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished && onHide) onHide();
        });
      }, autoDuration);
    } else {
      // Hide immediately if asked to
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 140,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -12,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && onHide) onHide();
      });
    }

    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [visible, autoDuration, onHide, opacity, translateY]);

  // Keep it mounted but non-interactive when hidden
  const containerPointerEvents = visible ? "auto" : "none";

  return (
    <Animated.View
      pointerEvents={containerPointerEvents}
      accessibilityLiveRegion="polite"
      style={[
        styles.wrap,
        {
          paddingTop: Platform.select({ ios: topOffset, android: topOffset }),
        },
        { opacity, transform: [{ translateY }] },
      ]}
      {...rest}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
          },
          style,
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text numberOfLines={3} style={[styles.text, textStyle]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // center content
    alignItems: "center",
    zIndex: 999,
  },
  card: {
    maxWidth: 360,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    // subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    flexShrink: 1,
  },
});

export default ToastBanner;