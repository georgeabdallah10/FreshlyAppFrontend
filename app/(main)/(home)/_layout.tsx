/**
 * ============================================
 * HOME LAYOUT WITH PERSISTENT BOTTOM NAVIGATION
 * ============================================
 * This layout wraps all screens in the (home) folder with:
 * - A Stack navigator for screen transitions
 * - A persistent bottom navigation bar
 * - Tutorial overlay (rendered here to be on top of everything)
 *
 * The bottom navbar remains visible across all main app screens
 * and provides quick access to Home, Chat, Family, and Settings.
 */
import BottomNavigation from "@/components/BottomNavigation";
import HomeTutorial from "@/components/tutorial/HomeTutorial";
import { BottomNavProvider, useBottomNavMeasurements, useTutorialContext } from "@/context/bottomNavContext";
import { useThemeContext } from "@/context/ThemeContext";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

function HomeLayoutContent() {
  const { setMeasurements } = useBottomNavMeasurements();
  const { tutorialState, onTutorialComplete } = useTutorialContext();
  const { theme } = useThemeContext();
  const styles = React.useMemo(() => createStyles(theme.colors.background), [theme.colors.background]);

  return (
    <View style={styles.container}>
      {/* Stack navigator takes all available space above the navbar */}
      <View style={styles.stackContainer}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="main" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="meals" />
          <Stack.Screen name="quickMeals" />
          <Stack.Screen name="pantry" />
          <Stack.Screen name="groceryLists" />
          <Stack.Screen name="groceryListDetail" />
          <Stack.Screen name="allGrocery" />
          <Stack.Screen name="matchMyGrocery" />
          <Stack.Screen name="MyFamily" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="faq" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="allFeatures" />
          <Stack.Screen name="mealShareRequests" />
        </Stack>
      </View>

      {/* Persistent Bottom Navigation - floating overlay */}
      <View style={styles.bottomNavOverlay} pointerEvents="box-none">
        <BottomNavigation
          onMeasurementsReady={setMeasurements}
          disabled={tutorialState.visible}
        />
      </View>

      {/* Tutorial Overlay - rendered at layout level to be on top of everything */}
      <HomeTutorial
        visible={tutorialState.visible}
        onComplete={onTutorialComplete}
        targetMeasurements={tutorialState.targetMeasurements}
      />
    </View>
  );
}

export default function HomeLayout() {
  return (
    <BottomNavProvider>
      <HomeLayoutContent />
    </BottomNavProvider>
  );
}

const createStyles = (background: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: background,
    },
    stackContainer: {
      flex: 1,
    },
    bottomNavOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
    },
  });
