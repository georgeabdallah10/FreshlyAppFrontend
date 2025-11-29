// components/ToastBanner.tsx
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    Platform,
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
  const isLong = message?.length > 40;
  const hasButtons = buttons && buttons.length > 0;
  // Don't auto-hide if there are buttons (user needs to make a choice)
  const autoDuration = hasButtons ? 0 : (duration ?? (isLong ? 5000 : 3000));

  const palette =
    type === "success"
      ? { bg: "#00C853", border: "#00A449" }
      : type === "error"
      ? { bg: "#FF3B30", border: "#D92A23" }
      : type === "confirm"
      ? { bg: "#007AFF", border: "#0051D5" }
      : { bg: "#5856D6", border: "#4240B8" }; // info

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

      // Schedule auto hide (only if duration > 0)
      if (autoDuration > 0) {
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
      }
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
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
          },
          hasButtons && styles.cardWithButtons,
          style,
        ]}
        pointerEvents="auto"
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
                onPress={() => {
                  button.onPress();
                  // Auto-hide after button press
                  if (onHide) onHide();
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
