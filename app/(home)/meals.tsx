// ==================== App.tsx ====================
import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import MealDetailScreen from '@/components/meal/mealDetailScreen';
import { type Meal } from '@/components/meal/mealsData';
import MealListScreen from '@/components/meal/mealListScreen';
type Screen = 'list' | 'detail';
import { getAllmealsforSignelUser } from '@/api/user/meals';
import { AddMealModal } from '@/components/meal/addMealModal';

const MealsDashboard: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  const handleMealSelect = (meal: Meal) => {
    setSelectedMeal(meal);
    setCurrentScreen('detail');
  };

  const handleBack = () => {
    setCurrentScreen('list');
    setSelectedMeal(null);
  };

  useEffect(() => {
    console.log("PRETEST")
    const test = async () => {
        const res = await getAllmealsforSignelUser()
        const data = await res?.json()
        console.log(data);
    }
    test();
  },[])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {currentScreen === 'list' ? (
        <MealListScreen onMealSelect={handleMealSelect} />
      ) : (
        selectedMeal && <MealDetailScreen meal={selectedMeal} onBack={handleBack} />
      )}
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