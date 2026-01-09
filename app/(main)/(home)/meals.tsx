// ==================== App.tsx ====================
import ToastBanner from "@/components/generalMessage";
import MealDetailScreen from '@/components/meal/mealDetailScreen';
import MealListScreen from '@/components/meal/mealListScreen';
import { type Meal } from '@/components/meal/mealsData';
import { useThemeContext } from '@/context/ThemeContext';
import { ColorTokens } from '@/theme/colors';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StatusBar, StyleSheet } from 'react-native';

const createPalette = (colors: ColorTokens) => ({
  background: colors.background,
  card: colors.card,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  border: colors.border,
  primary: colors.primary,
});

type Screen = 'list' | 'detail';

type ToastType = "success" | "error";
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
  duration?: number;
  topOffset?: number;
}

const MealsDashboard: React.FC = () => {
  const { scrollToEnd } = useLocalSearchParams<{ scrollToEnd?: string }>();
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
    duration: 3000,
    topOffset: 40,
  });

  const toErrorText = (err: any): string => {
    if (!err) return "Something went wrong. Please try again.";
    if (typeof err === "string") return err;
    if (Array.isArray(err)) return err.map((e) => e?.msg ?? e?.message ?? String(e)).join("\n");
    if (typeof err === "object") {
      if (err.msg) return String(err.msg);
      if (err.message) return String(err.message);
      try { return JSON.stringify(err); } catch { return "An unexpected error occurred."; }
    }
    return String(err);
  };

  const showToast = (
    type: ToastType,
    message: unknown,
    duration: number = 3000,
    topOffset: number = 40
  ) => {
    const text = toErrorText(message);
    setToast({ visible: true, type, message: text, duration, topOffset });
  };

  const handleMealSelect = (meal: Meal) => {
    setSelectedMealId(meal.id);
    setCurrentScreen('detail');
  };

  const handleBack = () => {
    setCurrentScreen('list');
    setSelectedMealId(null);
  };

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);


  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      {currentScreen === 'list' ? (
        <MealListScreen 
          onMealSelect={handleMealSelect}
          onImageError={(msg) => showToast("error", msg, 4000)}
          scrollToEnd={scrollToEnd === 'true'}
        />
      ) : (
        selectedMealId && <MealDetailScreen mealId={selectedMealId} onBack={handleBack} />
      )}
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        duration={toast.duration ?? 3000}
        topOffset={toast.topOffset ?? 40}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </Animated.View>
  );
};

const createStyles = (palette: ReturnType<typeof createPalette>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
});

export default MealsDashboard;