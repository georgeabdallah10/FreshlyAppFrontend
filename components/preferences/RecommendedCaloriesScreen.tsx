import React, { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// MacroCircle Component
type MacroCircleProps = {
  label: string;
  grams: number;
  accentColor?: string;
  animatedScale: Animated.Value | Animated.AnimatedMultiplication<number>;
  animatedOpacity: Animated.Value;
};

const MacroCircle: React.FC<MacroCircleProps> = ({
  label,
  grams,
  accentColor = "#F0F1F5",
  animatedScale,
  animatedOpacity,
}) => {
  return (
    <Animated.View
      style={[
        styles.macroCircle,
        {
          backgroundColor: accentColor,
          opacity: animatedOpacity,
          transform: [{ scale: animatedScale }],
        },
      ]}
    >
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroValueRow}>
        <Text style={styles.macroValue}>{grams}</Text>
        <Text style={styles.macroUnit}>g</Text>
      </View>
    </Animated.View>
  );
};

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
  onCalorieRangeChange?: (min: number, max: number) => void;
  onMacrosChange?: (macros: { proteinGrams: number; carbGrams: number; fatGrams: number }) => void;
};

const MIN_CALORIES = 1200;
const MAX_CALORIES = 4000;

// ============================================================================
// MACRO CALCULATOR - Pure utility function
// ============================================================================

type MacroCalculatorInput = {
  totalCalories: number;
  weightKg: number;
  gender: "male" | "female";
  athleteMode: boolean;
  trainingLevel: TrainingLevel | null;
  goal: Goal;
};

type MacroCalculatorOutput = {
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinCalories: number;
  carbCalories: number;
  fatCalories: number;
};

/**
 * Calculates macronutrient distribution based on calories and user profile.
 *
 * Priority order:
 * 1. Protein (weight-based, highest priority)
 * 2. Fat (percentage-based with minimum guardrail)
 * 3. Carbs (remaining calories)
 */
function calculateMacros(input: MacroCalculatorInput): MacroCalculatorOutput {
  const { totalCalories, weightKg, athleteMode, trainingLevel, goal } = input;

  // -------------------------------------------------------------------------
  // STEP 1: Calculate Protein (weight-based)
  // -------------------------------------------------------------------------

  // Base protein multiplier
  let proteinMultiplier = 1.8;

  // Athlete mode adjustments based on training level
  if (athleteMode) {
    if (trainingLevel === "intense") {
      proteinMultiplier = 2.4;
    } else if (trainingLevel === "casual") {
      proteinMultiplier = 2.2;
    } else {
      // light training
      proteinMultiplier = 2.0;
    }
  }

  // Goal-based protein boost for muscle/weight gain
  if (goal === "muscle-gain" || goal === "weight-gain") {
    proteinMultiplier += 0.2;
  }

  const proteinG = Math.round(proteinMultiplier * weightKg);
  const proteinCalories = proteinG * 4;

  // -------------------------------------------------------------------------
  // STEP 2: Calculate Fat (percentage-based with minimum guardrail)
  // -------------------------------------------------------------------------

  // Fat percentage based on goal
  let fatPercentage: number;
  switch (goal) {
    case "lose-weight":
      fatPercentage = 0.22;
      break;
    case "leaner":
      fatPercentage = 0.24;
      break;
    case "balanced":
      fatPercentage = 0.25;
      break;
    case "muscle-gain":
      fatPercentage = 0.27;
      break;
    case "weight-gain":
      fatPercentage = 0.30;
      break;
    default:
      fatPercentage = 0.25;
  }

  // Calculate fat from percentage
  let fatCalories = totalCalories * fatPercentage;
  let fatG = Math.round(fatCalories / 9);

  // Minimum fat rule: at least 0.8g per kg bodyweight
  const minFatG = Math.round(0.8 * weightKg);
  if (fatG < minFatG) {
    fatG = minFatG;
    fatCalories = fatG * 9;
  }

  // -------------------------------------------------------------------------
  // STEP 3: Calculate Carbs (remaining calories)
  // -------------------------------------------------------------------------

  let carbCalories = totalCalories - (proteinCalories + fatCalories);
  let carbsG = Math.round(carbCalories / 4);

  // -------------------------------------------------------------------------
  // STEP 4: Safety Rules - Handle negative carbs
  // -------------------------------------------------------------------------

  // If carbs are negative or too low, reduce fat percentage and recalculate
  const minCarbsForAthletes = athleteMode ? 50 : 0; // Athletes need minimum carbs

  if (carbCalories < 0 || carbsG < minCarbsForAthletes) {
    // Reduce fat percentage by steps of 2-3% until carbs are acceptable
    let adjustedFatPercentage = fatPercentage;
    const maxReductions = 5; // Prevent infinite loop
    let reductions = 0;

    while ((carbCalories < 0 || carbsG < minCarbsForAthletes) && reductions < maxReductions) {
      adjustedFatPercentage -= 0.03; // Reduce by 3%

      // Don't let fat go below minimum
      fatCalories = totalCalories * adjustedFatPercentage;
      fatG = Math.round(fatCalories / 9);

      // Ensure fat doesn't go below minimum
      if (fatG < minFatG) {
        fatG = minFatG;
        fatCalories = fatG * 9;
      }

      // Recalculate carbs
      carbCalories = totalCalories - (proteinCalories + fatCalories);
      carbsG = Math.round(carbCalories / 4);

      reductions++;
    }

    // If still negative after reductions, set carbs to minimum
    // (This means the calorie target is likely too low for this profile)
    if (carbsG < 0) {
      carbsG = 0;
      carbCalories = 0;
    }

    // Ensure athletes have minimum carbs
    if (athleteMode && carbsG < minCarbsForAthletes) {
      carbsG = minCarbsForAthletes;
      carbCalories = carbsG * 4;
    }
  }

  return {
    proteinG,
    carbsG,
    fatG,
    proteinCalories,
    carbCalories,
    fatCalories,
  };
}

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
  onCalorieRangeChange,
  onMacrosChange,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Macro circle animations - staggered entrance
  const macroOpacity1 = useRef(new Animated.Value(0)).current;
  const macroOpacity2 = useRef(new Animated.Value(0)).current;
  const macroOpacity3 = useRef(new Animated.Value(0)).current;
  const macroScale1 = useRef(new Animated.Value(0.95)).current;
  const macroScale2 = useRef(new Animated.Value(0.95)).current;
  const macroScale3 = useRef(new Animated.Value(0.95)).current;

  // Pulse animation for macro circles when calorie changes
  const macroPulseAnim = useRef(new Animated.Value(1)).current;
  const prevCalorieRef = useRef<number | null>(null);

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

    // Staggered entrance animation for macro circles
    const staggerDelay = 100;
    const animateMacroCircle = (
      opacity: Animated.Value,
      scale: Animated.Value,
      delay: number
    ) => {
      return Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
      ]);
    };

    Animated.stagger(staggerDelay, [
      animateMacroCircle(macroOpacity1, macroScale1, 200),
      animateMacroCircle(macroOpacity2, macroScale2, 200),
      animateMacroCircle(macroOpacity3, macroScale3, 200),
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

    // Step 2: BMR (Mifflin-St Jeor)
    const bmrBase = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const genderOffset = gender === "male" ? 5 : -161;
    const bmr = bmrBase + genderOffset;

    // Step 3: Activity multiplier
    const activityMultiplier = isAthlete
      ? trainingLevel === "intense"
        ? 1.9
        : trainingLevel === "casual"
          ? 1.7
          : 1.55
      : 1.35;
    const maintenance = bmr * activityMultiplier;

    // Step 4: Goal adjustment
    const primaryGoal =
      goals.find((g) => g !== "balanced") ?? goals[0] ?? "balanced";

    let target = maintenance;
    if (primaryGoal === "lose-weight") {
      target = maintenance - 400;
    } else if (primaryGoal === "leaner") {
      target = maintenance - 200;
    } else if (primaryGoal === "muscle-gain") {
      target = maintenance + 300;
    } else if (primaryGoal === "weight-gain") {
      target = maintenance + 500;
    }

    // Step 5: Athlete safety rules
    if (isAthlete) {
      const athleteMin =
        weightKg * (trainingLevel === "intense" ? 35 : 30);
      if (target < athleteMin) {
        target = athleteMin;
      }
    }

    // Clamp to general bounds and round to nearest 10
    const bounded = Math.min(Math.max(target, MIN_CALORIES), MAX_CALORIES);
    return Math.round(bounded / 10) * 10;
  }, [age, height, weight, gender, goals, isAthlete, trainingLevel]);

  const { minCalories, maxCalories } = useMemo(() => {
    if (!recommendedCalories) {
      return { minCalories: null, maxCalories: null };
    }
    const baseMin = isAthlete
      ? weight !== null
        ? Math.round(weight * (trainingLevel === "intense" ? 35 : 30))
        : MIN_CALORIES
      : MIN_CALORIES;
    const min = Math.max(baseMin, MIN_CALORIES);
    const max = MAX_CALORIES;
    return { minCalories: min, maxCalories: max };
  }, [recommendedCalories, isAthlete, weight, trainingLevel]);

  const prevRecommendedRef = useRef<number | null>(null);

  useEffect(() => {
    if (recommendedCalories === null || minCalories === null || maxCalories === null) {
      return;
    }
    const clamped = clampCalorieValue(recommendedCalories, minCalories, maxCalories);
    if (clamped === null) return;

    const prev = prevRecommendedRef.current;
    const recommendedChanged = prev !== null && prev !== recommendedCalories;
    const initialMount = prev === null;

    const targetInvalid =
      calorieTarget === null ||
      calorieTarget <= 0 ||
      calorieTarget < minCalories ||
      calorieTarget > maxCalories;

    // Update target when inputs change, when target drifts outside range,
    // or on first mount if the stored target doesn't match the latest calc.
    if (targetInvalid || recommendedChanged || (initialMount && calorieTarget !== clamped)) {
      onCalorieTargetChange(clamped);
    }

    prevRecommendedRef.current = recommendedCalories;
  }, [recommendedCalories, minCalories, maxCalories, calorieTarget, onCalorieTargetChange]);

  // Call back with calorie range when it changes
  useEffect(() => {
    if (minCalories !== null && maxCalories !== null && onCalorieRangeChange) {
      onCalorieRangeChange(minCalories, maxCalories);
    }
  }, [minCalories, maxCalories, onCalorieRangeChange]);

  const displayValue =
    calorieTarget ??
    recommendedCalories ??
    (recommendedCalories === null ? null : recommendedCalories);

  // Calculate macros based on calorie target and user profile
  const macros = useMemo(() => {
    // Use displayValue (which reflects user's adjusted calorie target)
    const calories = displayValue;

    // Return placeholder if required data is missing
    if (
      calories === null ||
      weight === null ||
      gender === null ||
      Number.isNaN(weight)
    ) {
      return {
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        proteinCalories: 0,
        carbCalories: 0,
        fatCalories: 0,
      };
    }

    // Determine primary goal for macro calculation
    const primaryGoal: Goal =
      goals.find((g) => g !== "balanced") ?? goals[0] ?? "balanced";

    return calculateMacros({
      totalCalories: calories,
      weightKg: weight,
      gender,
      athleteMode: isAthlete,
      trainingLevel,
      goal: primaryGoal,
    });
  }, [displayValue, weight, gender, goals, isAthlete, trainingLevel]);

  // Call back with macros when they change
  useEffect(() => {
    if (onMacrosChange && macros.proteinG > 0) {
      onMacrosChange({
        proteinGrams: macros.proteinG,
        carbGrams: macros.carbsG,
        fatGrams: macros.fatG,
      });
    }
  }, [macros.proteinG, macros.carbsG, macros.fatG, onMacrosChange]);

  // Pulse animation when calorie value changes (via +/- buttons)
  useEffect(() => {
    if (prevCalorieRef.current !== null && prevCalorieRef.current !== displayValue) {
      // Trigger subtle pulse animation on macro circles
      Animated.sequence([
        Animated.timing(macroPulseAnim, {
          toValue: 1.08,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(macroPulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevCalorieRef.current = displayValue;
  }, [displayValue, macroPulseAnim]);

  // Combined scale for macro circles (entrance + pulse)
  const macroScaleCombined1 = Animated.multiply(macroScale1, macroPulseAnim);
  const macroScaleCombined2 = Animated.multiply(macroScale2, macroPulseAnim);
  const macroScaleCombined3 = Animated.multiply(macroScale3, macroPulseAnim);

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

      {/* Macro Circles Section */}
      <View style={styles.macrosContainer}>
        <MacroCircle
          label="Protein"
          grams={macros.proteinG}
          accentColor="#E8F5E9"
          animatedScale={macroScaleCombined1}
          animatedOpacity={macroOpacity1}
        />
        <MacroCircle
          label="Carbs"
          grams={macros.carbsG}
          accentColor="#FFF3E0"
          animatedScale={macroScaleCombined2}
          animatedOpacity={macroOpacity2}
        />
        <MacroCircle
          label="Fat"
          grams={macros.fatG}
          accentColor="#F5F5F5"
          animatedScale={macroScaleCombined3}
          animatedOpacity={macroOpacity3}
        />
      </View>

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
  // Macro circle styles
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SCREEN_WIDTH < 380 ? 12 : 16,
    marginBottom: 20,
    width: "100%",
  },
  macroCircle: {
    width: SCREEN_WIDTH < 380 ? 72 : 80,
    height: SCREEN_WIDTH < 380 ? 72 : 80,
    borderRadius: SCREEN_WIDTH < 380 ? 36 : 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  macroLabel: {
    fontSize: SCREEN_WIDTH < 380 ? 10 : 11,
    color: "#888888",
    fontWeight: "500",
    marginBottom: 2,
  },
  macroValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  macroValue: {
    fontSize: SCREEN_WIDTH < 380 ? 18 : 20,
    fontWeight: "700",
    color: "#222222",
  },
  macroUnit: {
    fontSize: SCREEN_WIDTH < 380 ? 11 : 12,
    fontWeight: "500",
    color: "#999999",
    marginLeft: 1,
  },
});

export default RecommendedCaloriesScreen;
