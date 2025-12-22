// components/ToastBanner.tsx
import React, { useCallback, useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    GestureResponderEvent,
    PanResponder,
    PanResponderGestureState,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewProps,
} from "react-native";

type ToastType = "success" | "error" | "confirm" | "info";

type ToastButton = {
  text: string;
  onPress: () => void;
  style?: "default" | "destructive" | "cancel";
};

type Props = ViewProps & {
  visible: boolean;
  type: ToastType;
  message: string;
  /** ms; default auto: short msg → 3000, long msg → 5000. Set to 0 for no auto-hide */
  duration?: number;
  /** called after it fully hides (auto or when visible turns false) */
  onHide?: () => void;
  /** distance from very top (status bar) */
  topOffset?: number;
  /** optional custom icon (emoji or RN element) */
  icon?: React.ReactNode;
  /** style overrides */
  textStyle?: any;
  /** Optional buttons for confirmation/action dialogs */
  buttons?: ToastButton[];
  /** Optional title for confirmation dialogs */
  title?: string;
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
  buttons,
  title,
  ...rest
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevVisible = useRef(false);
  const isHiding = useRef(false);
  const latestOnHide = useRef(onHide);
  const panDismissed = useRef(false);
  const isLong = message?.length > 40;
  const hasButtons = buttons && buttons.length > 0;
  // Don't auto-hide if there are buttons (user needs to make a choice)
  const autoDuration = hasButtons ? 0 : (duration ?? (isLong ? 5000 : 3000));

  useEffect(() => {
    latestOnHide.current = onHide;
  }, [onHide]);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const palette =
    type === "success"
      ? { bg: "#00C853", border: "#00A449" }
      : type === "error"
      ? { bg: "#FF3B30", border: "#D92A23" }
      : type === "confirm"
      ? { bg: "#007AFF", border: "#0051D5" }
      : { bg: "#5856D6", border: "#4240B8" }; // info

  const animateIn = useCallback(() => {
    isHiding.current = false;
    opacity.setValue(0);
    translateY.setValue(-12);
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
  }, [opacity, translateY]);

  const animateOut = useCallback(
    (_reason: "auto" | "gesture" | "prop") => {
      if (isHiding.current) return;
      isHiding.current = true;
      prevVisible.current = false;
      clearHideTimer();
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
        isHiding.current = false;
        if (finished && latestOnHide.current) {
          latestOnHide.current();
        }
      });
    },
    [clearHideTimer, opacity, translateY]
  );

  const handleDismiss = useCallback(() => {
    if (!visible) return;
    animateOut("gesture");
  }, [animateOut, visible]);

  const shouldDismissGesture = useCallback((gestureState: PanResponderGestureState) => {
    return gestureState.dy < -16 || gestureState.vy < -0.6;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (!panDismissed.current && shouldDismissGesture(gestureState)) {
          panDismissed.current = true;
          handleDismiss();
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (shouldDismissGesture(gestureState)) {
          handleDismiss();
        }
      },
    })
  ).current;

  // Animate in / out when `visible` changes
  useEffect(() => {
    if (visible) {
      panDismissed.current = false;
      clearHideTimer();
      animateIn();

      // Schedule auto hide (only if duration > 0)
      if (autoDuration > 0) {
        hideTimer.current = setTimeout(() => {
          animateOut("auto");
        }, autoDuration);
      }
    } else if (prevVisible.current) {
      animateOut("prop");
    }

    prevVisible.current = visible;

    return () => {
      clearHideTimer();
    };
  }, [visible, autoDuration, clearHideTimer, animateIn, animateOut]);

  return (
    <Animated.View
      // Allow touches to pass through outside the banner area
      pointerEvents="box-none"
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
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
          },
          hasButtons && styles.cardWithButtons,
          style,
        ]}
        accessibilityRole="alert"
        onPress={handleDismiss}
        android_ripple={{ color: "rgba(255, 255, 255, 0.08)" }}
        {...panResponder.panHandlers}
      >
        {/* Title (optional, for confirm dialogs) */}
        {title ? (
          <Text style={[styles.title, textStyle]}>
            {title}
          </Text>
        ) : null}

        {/* Message content */}
        <View style={styles.messageRow}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text numberOfLines={hasButtons ? 5 : 3} style={[styles.text, textStyle]}>
            {message}
          </Text>
        </View>

        {/* Buttons (optional, for confirm/action dialogs) */}
        {hasButtons ? (
          <View style={styles.buttonsContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'destructive' && styles.buttonDestructive,
                  button.style === 'cancel' && styles.buttonCancel,
                ]}
                onPress={(event: GestureResponderEvent) => {
                  event?.stopPropagation?.();
                  button.onPress();
                  // Auto-hide after button press
                  handleDismiss();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'destructive' && styles.buttonTextDestructive,
                    button.style === 'cancel' && styles.buttonTextCancel,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10001,
  },
  card: {
    maxWidth: 360,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  cardWithButtons: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  messageRow: {
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
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    minWidth: 70,
    alignItems: "center",
  },
  buttonDestructive: {
    backgroundColor: "rgba(255, 59, 48, 0.9)",
  },
  buttonCancel: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonTextDestructive: {
    color: "#FFFFFF",
  },
  buttonTextCancel: {
    color: "#FFFFFF",
  },
});

export default ToastBanner;
