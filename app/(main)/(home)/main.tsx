import ToastBanner from "@/components/generalMessage";
import IconButton from "@/components/iconComponent";
import NotificationBell from "@/components/NotificationBell";
import { checkTutorialCompleted, TargetMeasurements } from "@/components/tutorial/HomeTutorial";
import { useTutorialContext } from "@/context/bottomNavContext";
import { useThemeContext } from "@/context/ThemeContext";
import { usePendingRequestCount } from "@/hooks/useMealShare";
import { useBottomNavInset } from "@/hooks/useBottomNavInset";
import { ColorTokens } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// DEV MODE: Set to true to always show tutorial (for testing)
const TUTORIAL_DEV_MODE = false;

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  onPress: () => void;
};

const HomeDashboard = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { familyDeleted } = useLocalSearchParams<{ familyDeleted?: string }>();
  const { data: pendingShareCount = 0 } = usePendingRequestCount();
  const bottomNavInset = useBottomNavInset();
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette, insets), [palette, insets]);

  // Tutorial context - tutorial is rendered in layout, controlled from here
  const {
    tutorialState,
    setTutorialVisible,
    setTutorialMeasurements,
    setOnTutorialComplete,
  } = useTutorialContext();
  const showTutorial = tutorialState.visible;

  // Toast state for showing messages from navigation
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Show toast if familyDeleted param is present
  useEffect(() => {
    if (familyDeleted === "true") {
      setToastMessage("Family deleted successfully");
      setShowToast(true);
      // Clear the param from URL
      router.setParams({ familyDeleted: undefined });
    }
  }, [familyDeleted]);

  // Refs for measuring positions (menu cards)
  const pantryRef = useRef<View>(null);
  const mealPlansRef = useRef<View>(null);
  const groceryRef = useRef<View>(null);
  const quickMealsRef = useRef<View>(null);
  const allFeaturesRef = useRef<View>(null);

  // Header button refs
  const faqButtonRef = useRef<View>(null);
  const notificationsButtonRef = useRef<View>(null);

  // Set up tutorial complete callback
  useEffect(() => {
    setOnTutorialComplete(() => {
      setTutorialVisible(false);
    });
  }, [setOnTutorialComplete, setTutorialVisible]);

  // Check if tutorial should be shown - AFTER animations complete
  useEffect(() => {
    const checkAndShowTutorial = async () => {
      // If dev mode is on, always show tutorial
      if (TUTORIAL_DEV_MODE) {
        // Wait for animations to complete (max 320ms) + extra buffer for layout to settle
        setTimeout(() => {
          measureAllTargets();
          // Add small delay between measurement and showing to ensure measurements are complete
          setTimeout(() => setTutorialVisible(true), 100);
        }, 800);
        return;
      }

      // Otherwise, check if user has completed it
      const hasCompleted = await checkTutorialCompleted();
      if (!hasCompleted) {
        // Wait for animations to complete (max 320ms) + extra buffer for layout to settle
        setTimeout(() => {
          measureAllTargets();
          // Add small delay between measurement and showing to ensure measurements are complete
          setTimeout(() => setTutorialVisible(true), 100);
        }, 800);
      }
    };

    checkAndShowTutorial();
  }, []);

  // Measure all target positions and send to context
  const measureAllTargets = () => {
    const measurements: Record<string, TargetMeasurements> = {};
    let pendingMeasurements = 7;

    const checkComplete = () => {
      pendingMeasurements--;
      if (pendingMeasurements === 0) {
        console.log('[Tutorial] All measurements complete:', measurements);
        setTutorialMeasurements(measurements);
      }
    };

    const measureElement = (ref: React.RefObject<View | null>, key: string) => {
      if (ref.current) {
        requestAnimationFrame(() => {
          if (ref.current) {
            ref.current.measureInWindow((x, y, width, height) => {
              console.log(`[Tutorial] Measured ${key}:`, { x, y, width, height });
              if (width > 0 && height > 0) {
                measurements[key] = { x, y, width, height };
              }
              checkComplete();
            });
          } else {
            checkComplete();
          }
        });
      } else {
        console.warn(`[Tutorial] Failed to measure ${key}: ref.current is null`);
        checkComplete();
      }
    };

    measureElement(pantryRef, 'pantry');
    measureElement(mealPlansRef, 'mealPlans');
    measureElement(groceryRef, 'grocery');
    measureElement(quickMealsRef, 'quickMeals');
    measureElement(allFeaturesRef, 'allFeatures');
    measureElement(faqButtonRef, 'faqButton');
    measureElement(notificationsButtonRef, 'notificationsButton');
  };

  const menuItems: MenuItem[] = [
    {
      id: "grocery",
      title: "Pantry",
      subtitle: "Track what you have",
      iconName: "nutrition-outline",
      iconColor: palette.primary,
      bgColor: palette.cardPrimaryTint,
      onPress: () => router.push("/(main)/(home)/pantry"),
    },
    {
      id: "mealPlans",
      title: "Meal Plans",
      subtitle: "Your favorite meals",
      iconName: "restaurant-outline",
      iconColor: palette.accent,
      bgColor: palette.cardAccentTint,
      onPress: () => router.push("/(main)/(home)/meals"),
    },
    {
      id: "groceryLists",
      title: "Grocery Lists",
      subtitle: "Upload Groceries",
      iconName: "cart-outline",
      iconColor: palette.text,
      bgColor: palette.cardNeutralTint,
      onPress: () => router.push("/(main)/(home)/groceryLists"),
    },
    {
      id: "Mealplanner",
      title: "Quick Meals",
      subtitle: "Whip it up!",
      iconName: "flash-outline",
      iconColor: palette.success,
      bgColor: palette.cardSuccessTint,
      onPress: () => router.push("/(main)/(home)/quickMeals"),
    },
  ];

  const handleMenuPress = (item: MenuItem) => {
    item.onPress();
  };

  const handleStartChat = () => {
    console.log("Start new chat");
    router.push("/(main)/(home)/allFeatures");
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          ref={faqButtonRef}
          style={styles.menuButton}
          activeOpacity={0.6}
          onPress={() => router.push("/(main)/(home)/faq")}
          disabled={showTutorial}
        >
          <IconButton
            iconName="accessibility-outline"
            style={styles.headerIconButton}
            iconContainerStyle={styles.headerIconContainer}
          />
          <View style={styles.menuIcon}></View>
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityLabel="Freshly logo"
          />
        </View>
        <View ref={notificationsButtonRef}>
          <NotificationBell
            iconSize={24}
            onPress={() => !showTutorial && router.push("/(main)/(home)/notifications")}
            extraCount={pendingShareCount}
            containerStyle={styles.notificationButton}
          />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavInset + 20 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!showTutorial}
      >
        {/* Welcome Text */}
        <Text style={styles.welcomeText}>
          <Text style={styles.welcomeAccentPrimary}> Smarter Shopping.</Text> {"\n"}
          <Text style={styles.welcomeAccentSecondary}>Healthier Living.</Text>
        </Text>
        {/* Menu Grid */}
        <View style={styles.menuGrid}>
        {menuItems.map((item) => {
          // Assign refs based on menu item title
          let itemRef;
          if (item.title === 'Pantry') itemRef = pantryRef;
          else if (item.title === 'Meal Plans') itemRef = mealPlansRef;
          else if (item.title === 'Grocery Lists') itemRef = groceryRef;
          else if (item.title === 'Quick Meals') itemRef = quickMealsRef;

          return (
            <TouchableOpacity
              key={item.id}
              ref={itemRef}
              style={[styles.menuCard, { backgroundColor: item.bgColor }]}
              onPress={() => handleMenuPress(item)}
              activeOpacity={0.8}
              disabled={showTutorial}
            >
              <View style={styles.menuCardHeader}>
                <View style={styles.menuIconContainer}>
                  <Ionicons
                    name={item.iconName}
                    size={28}
                    color={item.iconColor}
                  />
                </View>
                <Text style={styles.menuCardTitle}>{item.title}</Text>
              </View>
              <View style={styles.menuCardFooter}>
                <Text style={styles.menuCardSubtitle}>{item.subtitle}</Text>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

        {/* Start New Chat Section */}
        <View ref={allFeaturesRef} style={styles.chatSection}>
        <View style={styles.chatIconContainer}>
          <Ionicons
            name="apps-outline"
            size={26}
            color={palette.card}
          />
        </View>
        <Text style={styles.chatSectionTitle}>All features</Text>

        <TouchableOpacity
          style={styles.startChatButton}
          onPress={handleStartChat}
          activeOpacity={0.9}
          disabled={showTutorial}
        >
          <Text style={styles.startChatButtonText}>Explore more</Text>
          <Text style={styles.startChatArrow}>→</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Toast for navigation messages */}
      <ToastBanner
        visible={showToast}
        type="success"
        message={toastMessage}
        onHide={() => setShowToast(false)}
        topOffset={60}
      />
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

const createPalette = (colors: ColorTokens) => ({
  background: colors.background,
  card: colors.card,
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  primary: colors.primary,
  accent: colors.warning,
  success: colors.success,
  cardPrimaryTint: withAlpha(colors.primary, 0.14),
  cardAccentTint: withAlpha(colors.warning, 0.16),
  cardNeutralTint: withAlpha(colors.textSecondary, 0.08),
  cardSuccessTint: withAlpha(colors.success, 0.16),
});

const createStyles = (palette: ReturnType<typeof createPalette>, insets: { top: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      paddingTop: Math.max(50, insets.top),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    menuButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      flexShrink: 0,
      backgroundColor: palette.card,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
    },
    menuIcon: {
      width: 24,
      height: 24,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    menuDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.text,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: palette.text,
    },
    notificationButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      flexShrink: 0,
      backgroundColor: palette.card,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
    },
    headerIconButton: {
      padding: 0,
      marginTop: 22,
    },
    headerIconContainer: {
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    notificationIcon: {
      fontSize: 24,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    logoContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    welcomeText: {
      fontSize: 26,
      fontWeight: "700",
      color: palette.text,
      textAlign: "center",
      lineHeight: 32,
      marginTop: 10,
      marginBottom: 16,
    },
    welcomeAccentPrimary: {
      color: palette.primary,
    },
    welcomeAccentSecondary: {
      color: palette.accent,
    },
    menuGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 16,
    },
    menuCard: {
      width: "48%",
      borderRadius: 20,
      padding: 16,
      minHeight: 160,
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: palette.border,
    },
    menuCardHeader: {
      gap: 12,
    },
    menuIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: withAlpha(palette.card, 0.6),
      justifyContent: "center",
      alignItems: "center",
    },
    menuCardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
    },
    menuCardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    menuCardSubtitle: {
      fontSize: 13,
      color: palette.textMuted,
      flex: 1,
      lineHeight: 17,
    },
    arrowIcon: {
      fontSize: 22,
      color: palette.text,
    },
    chatSection: {
      backgroundColor: palette.cardSuccessTint,
      borderRadius: 18,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
    },
    chatIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: palette.success,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    chatSectionTitle: {
      fontSize: 19,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 14,
    },
    startChatButton: {
      width: "100%",
      backgroundColor: palette.success,
      borderRadius: 50,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
    },
    startChatButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.card,
    },
    startChatArrow: {
      fontSize: 18,
      color: palette.card,
    },
    logoImage: {
      height: 65,
      aspectRatio: 674 / 370,
      maxWidth: 250,
      flexShrink: 1,
    },
  });

export default HomeDashboard;
