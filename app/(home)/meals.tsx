// ==================== App.tsx ====================
import ToastBanner from "@/components/generalMessage";
import MealDetailScreen from '@/components/meal/mealDetailScreen';
import MealListScreen from '@/components/meal/mealListScreen';
import { type Meal } from '@/components/meal/mealsData';
import { getAllmealsforSignelUser } from '@/src/user/meals';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
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
  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
    setSelectedMeal(meal);
    setCurrentScreen('detail');
  };

  const handleBack = () => {
    setCurrentScreen('list');
    setSelectedMeal(null);
  };

  useEffect(() => {
    console.log("PRETEST");
    const test = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const res = await getAllmealsforSignelUser();
        if (!res?.ok) {
          const errText = await res?.text();
          showToast("error", errText || "Failed to fetch meals.");
          setHasError(true);
          return;
        }
        const data = await res.json();
        console.log(data);
        // Don't show success toast on initial load, only on errors
      } catch (err: any) {
        console.error("Error loading meals:", err);
        showToast("error", err?.message ?? "Error loading meals.");
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    test();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {currentScreen === 'list' ? (
        <MealListScreen 
          onMealSelect={handleMealSelect}
          isLoading={isLoading}
          hasError={hasError}
        />
      ) : (
        selectedMeal && <MealDetailScreen meal={selectedMeal} onBack={handleBack} />
      )}
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        duration={toast.duration ?? 3000}
        topOffset={toast.topOffset ?? 40}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
});

export default MealsDashboard;