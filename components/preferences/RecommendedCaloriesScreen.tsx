import React, { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Goal = "lose-weight" | "weight-gain" | "muscle-gain" | "balanced" | "leaner";

type DietaryPreference =
  | "halal"
  | "kosher"
  | "vegetarian"
  | "vegan"
  | "pescatarian";

type TrainingLevel = "light" | "casual" | "intense";

type RecommendedCaloriesScreenProps = {
  age: number | null;
  height: number | null;
  weight: number | null;
  gender: "male" | "female" | null;
  goals: Goal[];
  dietaryPreferences: DietaryPreference[];
  isAthlete: boolean;
  trainingLevel: TrainingLevel | null;
  calorieTarget: number | null;
  onCalorieTargetChange: (value: number) => void;
};

const MIN_CALORIES = 1200;
const MAX_CALORIES = 4000;

const GOAL_MULTIPLIERS: Record<Goal, number> = {
  "lose-weight": -0.15,
  "weight-gain": 0.1,
  "muscle-gain": 0.15,
  balanced: 0,
  leaner: 0,
};

const DIETARY_MULTIPLIERS: Record<DietaryPreference, number> = {
  halal: 0,
  kosher: 0,
  vegetarian: -0.03,
  vegan: -0.05,
  pescatarian: -0.02,
};

const ATHLETE_MULTIPLIERS: Record<TrainingLevel, number> = {
  light: 1.1,
  casual: 1.15,
  intense: 1.2,
};

const RecommendedCaloriesScreen: React.FC<RecommendedCaloriesScreenProps> = ({
  age,
  height,
  weight,
  gender,
  goals,
  dietaryPreferences,
  isAthlete,
  trainingLevel,
  calorieTarget,
  onCalorieTargetChange,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

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

  const recommendedCalories = useMemo(() => {
    if (
      age === null ||
      height === null ||
      weight === null ||
      gender === null ||
      Number.isNaN(age) ||
      Number.isNaN(height) ||
      Number.isNaN(weight)
    ) {
      return null;
    }

    const heightCm = height;
    const weightKg = weight;

    const bmrBase = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const genderOffset = gender === "male" ? 5 : -161;
    const bmr = bmrBase + genderOffset;

    const goalMultiplier = goals
      .map((g) => GOAL_MULTIPLIERS[g] ?? 0)
      .reduce((acc, val) => acc + val, 1);
    const clampedGoalMultiplier = Math.min(Math.max(goalMultiplier, 0.8), 1.25);
    const caloriesAfterGoals = bmr * clampedGoalMultiplier;

    const dietaryMultiplier = dietaryPreferences
      .map((d) => DIETARY_MULTIPLIERS[d] ?? 0)
      .reduce((acc, val) => acc + val, 1);
    const clampedDietaryMultiplier = Math.min(
      Math.max(dietaryMultiplier, 0.9),
      1.05
    );

    const caloriesAfterDiet = caloriesAfterGoals * clampedDietaryMultiplier;

    const athleteMultiplier =
      isAthlete && trainingLevel
        ? ATHLETE_MULTIPLIERS[trainingLevel] ?? 1
        : 1;

    const finalCalories = caloriesAfterDiet * athleteMultiplier;
    return Math.round(finalCalories);
  }, [age, height, weight, gender, goals, dietaryPreferences, isAthlete, trainingLevel]);

  const { minCalories, maxCalories } = useMemo(() => {
    if (!recommendedCalories) {
      return { minCalories: null, maxCalories: null };
    }
    let min = Math.round(recommendedCalories * 0.85);
    let max = Math.round(recommendedCalories * 1.2);
    if (dietaryPreferences.includes("vegan")) {
      max = Math.round(max * 1.05);
    }
    min = Math.max(MIN_CALORIES, min);
    max = Math.min(MAX_CALORIES, max);
    return { minCalories: min, maxCalories: max };
  }, [recommendedCalories, dietaryPreferences]);

  const prevRecommendedRef = useRef<number | null>(null);

  useEffect(() => {
    if (recommendedCalories === null || minCalories === null || maxCalories === null) {
      return;
    }
    const clamped = clampCalorieValue(recommendedCalories, minCalories, maxCalories);
    if (clamped === null) return;

    const prev = prevRecommendedRef.current;
    const changedFromInputs = prev !== null && prev !== recommendedCalories;
    prevRecommendedRef.current = recommendedCalories;

    const targetInvalid =
      calorieTarget === null ||
      calorieTarget <= 0 ||
      calorieTarget < minCalories ||
      calorieTarget > maxCalories;

    if (targetInvalid || changedFromInputs) {
      onCalorieTargetChange(clamped);
    }
  }, [recommendedCalories, minCalories, maxCalories, calorieTarget, onCalorieTargetChange]);

  const displayValue =
    calorieTarget ??
    recommendedCalories ??
    (recommendedCalories === null ? null : recommendedCalories);

  const decrement = () => {
    if (displayValue === null) return;
    const clamped = clampCalorieValue(displayValue - 50, minCalories, maxCalories);
    if (clamped !== null) onCalorieTargetChange(clamped);
  };

  const increment = () => {
    if (displayValue === null) return;
    const clamped = clampCalorieValue(displayValue + 50, minCalories, maxCalories);
    if (clamped !== null) onCalorieTargetChange(clamped);
  };

  return (
    <Animated.View 
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.cardTitle}>Your Recommended Calories</Text>
      <Text style={styles.cardSubtitle}>
        We’ll personalize this shortly. Adjustments and smart suggestions are
        coming soon.
      </Text>

      <Animated.View
        style={[
          styles.pulseCircle,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.pulseValue}>
          {displayValue !== null ? displayValue : "—"}
        </Text>
        <Text style={styles.pulseUnit}>Calorie per Day</Text>
      </Animated.View>

      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={styles.stepperButton}
          onPress={decrement}
          disabled={displayValue === null || minCalories === null}
        >
          <Text style={styles.stepperLabel}>-</Text>
        </TouchableOpacity>
        <View style={styles.stepperInfo}>
          <Text style={styles.rangeLabel}>Safe range</Text>
          <Text style={styles.rangeValue}>
            {minCalories ?? "—"} - {maxCalories ?? "—"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.stepperButton}
          onPress={increment}
          disabled={displayValue === null || maxCalories === null}
        >
          <Text style={styles.stepperLabel}>+</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const clampCalorieValue = (
  value: number,
  min: number | null,
  max: number | null
) => {
  if (min === null || max === null) return null;
  return Math.min(Math.max(value, min), max);
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F7F8FA",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EEEFF3",
    marginBottom: 24,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  pulseCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#EEEFF3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  pulseValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#00C853",
  },
  pulseUnit: {
    fontSize: 14,
    color: "#666666",
    marginTop: 4,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F7F8FA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEEFF3",
  },
  stepperLabel: {
    fontSize: 28,
    color: "#111111",
    fontWeight: "700",
  },
  stepperInfo: {
    flex: 1,
    alignItems: "center",
  },
  rangeLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
  },
});

export default RecommendedCaloriesScreen;
