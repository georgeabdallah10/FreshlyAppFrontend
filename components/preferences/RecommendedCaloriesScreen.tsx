import React, { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type RecommendedCaloriesScreenProps = {
  age: number | null;
  height: number | null;
  weight: number | null;
  gender: "male" | "female" | null;
  goal: string;
  calorieTarget: number | null;
  onCalorieTargetChange: (value: number) => void;
};

const MIN_CALORIES = 1200;
const MAX_CALORIES = 4000;

const RecommendedCaloriesScreen: React.FC<RecommendedCaloriesScreenProps> = ({
  age,
  height,
  weight,
  gender,
  goal,
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

    // Mifflin-St Jeor Equation for BMR
    // Men: BMR = 10W + 6.25H - 5A + 5
    // Women: BMR = 10W + 6.25H - 5A - 161
    const bmrBase = 10 * weight + 6.25 * height - 5 * age;
    const genderOffset = gender === "male" ? 5 : -161;
    const bmr = bmrBase + genderOffset;

    const goalMultiplier = (() => {
      switch (goal) {
        case "lose-weight":
          return 1.2;
        case "muscle-gain":
          return 1.55;
        case "weight-gain":
          return 1.45;
        default:
          return 1.35;
      }
    })();

    return Math.round(bmr * goalMultiplier);
  }, [age, height, weight, gender, goal]);

  const { minCalories, maxCalories } = useMemo(() => {
    if (!recommendedCalories) {
      return { minCalories: null, maxCalories: null };
    }
    const min = Math.max(MIN_CALORIES, Math.round(recommendedCalories * 0.75));
    const max = Math.min(MAX_CALORIES, Math.round(recommendedCalories * 1.35));
    return { minCalories: min, maxCalories: max };
  }, [recommendedCalories]);

  useEffect(() => {
    if (recommendedCalories && calorieTarget === null) {
      const clamped = clampCalorieValue(
        recommendedCalories,
        minCalories,
        maxCalories
      );
      if (clamped !== null) onCalorieTargetChange(clamped);
    }
  }, [
    recommendedCalories,
    calorieTarget,
    minCalories,
    maxCalories,
    onCalorieTargetChange,
  ]);

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
        <Text style={styles.pulseUnit}>cal/day</Text>
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
