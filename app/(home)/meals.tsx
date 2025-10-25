// ==================== App.tsx ====================
import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import MealDetailScreen from '@/components/meal/mealDetailScreen';
import { type Meal } from '@/components/meal/mealsData';
import MealListScreen from '@/components/meal/mealListScreen';
type Screen = 'list' | 'detail';
import { getAllmealsforSignelUser } from '@/api/user/meals';
import { AddMealModal } from '@/components/meal/addMealModal';
import ToastBanner from "@/components/generalMessage";

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
        const res = await getAllmealsforSignelUser();
        if (!res?.ok) {
          const errText = await res?.text();
          showToast("error", errText || "Failed to fetch meals.");
          return;
        }
        const data = await res.json();
        console.log(data);
        showToast("success", "Meals loaded successfully!");
      } catch (err: any) {
        showToast("error", err?.message ?? "Error loading meals.");
      }
    };
    test();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {currentScreen === 'list' ? (
        <MealListScreen onMealSelect={handleMealSelect} />
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