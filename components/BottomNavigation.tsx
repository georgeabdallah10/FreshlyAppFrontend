/**
 * ============================================
 * PERSISTENT BOTTOM NAVIGATION COMPONENT
 * ============================================
 * Shared bottom navigation bar that persists across all main screens.
 * Includes Home, Quick Add, Chat, Family, and Settings buttons.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BOTTOM_NAV_HEIGHT } from "@/constants/layout";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";
import IconButton from "./iconComponent";
import { AddProductModal } from "./quickAddModal";

// Tutorial measurement type
export interface NavButtonMeasurement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NavButtonMeasurements {
  homeButton?: NavButtonMeasurement;
  quickAdd?: NavButtonMeasurement;
  chatButton?: NavButtonMeasurement;
  familyButton?: NavButtonMeasurement;
  settingsButton?: NavButtonMeasurement;
}

interface BottomNavigationProps {
  disabled?: boolean;
  onMeasurementsReady?: (measurements: NavButtonMeasurements) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ disabled, onMeasurementsReady }) => {
  const INDICATOR_SIZE = 52;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments() as string[];
  const { theme } = useThemeContext();
  const { colors } = theme;
  const [quickAddModal, setQuickAddModal] = useState(false);
  const [indicatorVisible, setIndicatorVisible] = useState(false);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Refs for tutorial measurements
  const homeRef = useRef<View>(null);
  const quickAddRef = useRef<View>(null);
  const chatRef = useRef<View>(null);
  const familyRef = useRef<View>(null);
  const settingsRef = useRef<View>(null);
  const hasMeasured = useRef(false);

  // Measure buttons for tutorial when component mounts
  useEffect(() => {
    if (!onMeasurementsReady || hasMeasured.current) return;

    // Wait for layout to settle
    const timeout = setTimeout(() => {
      const measurements: NavButtonMeasurements = {};
      let pendingMeasurements = 5;

      const checkComplete = () => {
        pendingMeasurements--;
        if (pendingMeasurements === 0) {
          hasMeasured.current = true;
          onMeasurementsReady(measurements);
        }
      };

      const measureButton = (ref: React.RefObject<View | null>, key: keyof NavButtonMeasurements) => {
        if (ref.current) {
          ref.current.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) {
              measurements[key] = { x, y, width, height };
            }
            checkComplete();
          });
        } else {
          checkComplete();
        }
      };

      requestAnimationFrame(() => {
        measureButton(homeRef, 'homeButton');
        measureButton(quickAddRef, 'quickAdd');
        measureButton(chatRef, 'chatButton');
        measureButton(familyRef, 'familyButton');
        measureButton(settingsRef, 'settingsButton');
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [onMeasurementsReady]);

  // Animated indicator
  const indicatorX = useRef(new Animated.Value(0)).current;
  const buttonLayouts = useRef<Record<string, { x: number; width: number }>>({});

  // Determine active tab based on current route
  const getActiveTab = (): string => {
    const currentPath = segments.join("/");
    if (currentPath.includes("chat")) return "chat";
    if (currentPath.includes("MyFamily")) return "family";
    if (currentPath.includes("profile")) return "profile";
    if (currentPath.includes("main") || currentPath.endsWith("home")) return "home";
    return "home";
  };

  const animateIndicator = (tab: string) => {
    const layout = buttonLayouts.current[tab];
    if (!layout) return;
    const target = layout.x + layout.width / 2 - INDICATOR_SIZE / 2;
    setIndicatorVisible(true);
    Animated.timing(indicatorX, {
      toValue: target,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleItemLayout =
    (key: string) =>
    (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      buttonLayouts.current[key] = { x, width };
      if (key === getActiveTab()) {
        requestAnimationFrame(() => animateIndicator(key));
      }
    };

  const activeTab = getActiveTab();

  useEffect(() => {
    animateIndicator(activeTab);
  }, [activeTab]);

  const handleNavPress = (button: string) => {
    if (button === "home") {
      // Always navigate to home and reset stack
      router.replace("/(main)/(home)/main");
    } else if (button === "+") {
      setQuickAddModal(true);
    } else if (button === "chat") {
      if (!segments.join("/").includes("chat")) {
        router.push("/(main)/(home)/chat");
      }
    } else if (button === "family") {
      if (!segments.join("/").includes("MyFamily")) {
        router.push("/(main)/(home)/MyFamily");
      }
    } else if (button === "profile") {
      if (!segments.join("/").includes("profile")) {
        router.push("/(main)/(home)/profile");
      }
    }
  };

  const isActive = (tab: string) => activeTab === tab;

  return (
    <View style={[styles.bottomNavContainer, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
      <View style={styles.bottomNav}>
          <AddProductModal
            visible={quickAddModal}
            onClose={() => setQuickAddModal(false)}
          />

          {indicatorVisible && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeIndicator,
                {
                  width: INDICATOR_SIZE,
                  height: INDICATOR_SIZE,
                  borderRadius: INDICATOR_SIZE / 2,
                  top: (BOTTOM_NAV_HEIGHT - INDICATOR_SIZE) / 2,
                  transform: [{ translateX: indicatorX }],
                },
              ]}
            />
          )}

          {/* Home Button */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleNavPress("home")}
            activeOpacity={0.8}
            disabled={disabled}
            onLayout={handleItemLayout("home")}
          >
            <View ref={homeRef} style={[
              styles.navIconContainer,
              isActive("home") && styles.navIconContainerActive
            ]}>
              <IconButton
                iconName={isActive("home") ? "home" : "home-outline"}
                iconSize={26}
                iconColor={isActive("home") ? colors.primary : colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {/* Quick Add Button */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleNavPress("+")}
            activeOpacity={0.8}
            disabled={disabled}
            onLayout={handleItemLayout("quickAdd")}
          >
            <View ref={quickAddRef} style={styles.navIconContainer}>
              <IconButton iconName="add" iconSize={28} iconColor={colors.textPrimary} />
            </View>
          </TouchableOpacity>

          {/* Chat Button */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleNavPress("chat")}
            activeOpacity={0.8}
            disabled={disabled}
            onLayout={handleItemLayout("chat")}
          >
            <View ref={chatRef} style={[
              styles.navIconContainer,
              isActive("chat") && styles.navIconContainerActive
            ]}>
              <IconButton
                iconName={isActive("chat") ? "chatbox-ellipses" : "chatbox-ellipses-outline"}
                iconSize={26}
                iconColor={isActive("chat") ? colors.primary : colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {/* Family Button */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleNavPress("family")}
            activeOpacity={0.8}
            disabled={disabled}
            onLayout={handleItemLayout("family")}
          >
            <View ref={familyRef} style={[
              styles.navIconContainer,
              isActive("family") && styles.navIconContainerActive
            ]}>
              <IconButton
                iconName={isActive("family") ? "people-circle" : "people-circle-outline"}
                iconSize={26}
                iconColor={isActive("family") ? colors.primary : colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {/* Settings/Profile Button */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleNavPress("profile")}
            activeOpacity={0.8}
            disabled={disabled}
            onLayout={handleItemLayout("profile")}
          >
            <View ref={settingsRef} style={[
              styles.navIconContainer,
              isActive("profile") && styles.navIconContainerActive
            ]}>
              <IconButton
                iconName={isActive("profile") ? "settings" : "settings-outline"}
                iconSize={26}
                iconColor={isActive("profile") ? colors.primary : colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
  );
};

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    bottomNavContainer: {
      width: "100%",
      alignItems: "center",
      // NO background color - allows content to scroll underneath
    },
    bottomNav: {
      flexDirection: "row",
      justifyContent: "space-evenly",
      alignItems: "center",
      backgroundColor: colors.card,
      width: "90%",
      borderRadius: 28,
      height: BOTTOM_NAV_HEIGHT,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 10,
    },
    navItem: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    navIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    navIconContainerActive: {
      backgroundColor: withAlpha(colors.primary, 0.12),
    },
    activeIndicator: {
      position: "absolute",
      left: 0,
      backgroundColor: colors.primary,
      opacity: 0.18,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
    },
  });

export default BottomNavigation;
