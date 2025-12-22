import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// CALORIE CONSTANTS - Used for macro-to-calorie conversions
// ============================================================================
const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

// Step size for macro adjustments (in grams)
const MACRO_STEP_GRAMS = 50;

// ============================================================================
// MacroCard Component - Displays macro with +/- controls
// ============================================================================
type MacroCardProps = {
  label: string;
  grams: number;
  accentColor: string;
  animatedScale: Animated.Value | Animated.AnimatedMultiplication<number>;
  animatedOpacity: Animated.Value;
  onIncrement: () => void;
  onDecrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
};

const MacroCard: React.FC<MacroCardProps> = ({
  label,
  grams,
  accentColor,
  animatedScale,
  animatedOpacity,
  onIncrement,
  onDecrement,
  canDecrement,
  canIncrement,
}) => {
  return (
    <Animated.View
      style={[
        styles.macroCard,
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
      <View style={styles.macroButtonRow}>
        <TouchableOpacity
          style={[
            styles.macroButton,
            !canDecrement && styles.macroButtonDisabled,
          ]}
          onPress={onDecrement}
          disabled={!canDecrement}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.macroButtonText,
              !canDecrement && styles.macroButtonTextDisabled,
            ]}
          >
            −
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.macroButton,
            !canIncrement && styles.macroButtonDisabled,
          ]}
          onPress={onIncrement}
          disabled={!canIncrement}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.macroButtonText,
              !canIncrement && styles.macroButtonTextDisabled,
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
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

// ============================================================================
// DEFAULT MACRO PERCENTAGES (for initial split)
// These are calorie percentages, not gram percentages
// ============================================================================
const DEFAULT_MACRO_PERCENTAGES = {
  protein: 0.30, // 30% of calories from protein
  carbs: 0.40,   // 40% of calories from carbs
  fat: 0.30,     // 30% of calories from fat
} as const;

// ============================================================================
// UTILITY FUNCTIONS - Macro redistribution logic
// ============================================================================

/**
 * Converts macro percentages to grams based on total calories.
 * Used for initial state calculation.
 */
function calculateInitialMacrosFromCalories(totalCalories: number): {
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
} {
  const proteinCalories = totalCalories * DEFAULT_MACRO_PERCENTAGES.protein;
  const fatCalories = totalCalories * DEFAULT_MACRO_PERCENTAGES.fat;
  const carbCalories = totalCalories * DEFAULT_MACRO_PERCENTAGES.carbs;

  return {
    proteinGrams: Math.round(proteinCalories / CALORIES_PER_GRAM.protein),
    carbGrams: Math.round(carbCalories / CALORIES_PER_GRAM.carbs),
    fatGrams: Math.round(fatCalories / CALORIES_PER_GRAM.fat),
  };
}

/**
 * Calculates total calories from current macro grams.
 * Formula: (protein * 4) + (carbs * 4) + (fat * 9)
 */
function calculateCaloriesFromMacros(
  proteinGrams: number,
  carbGrams: number,
  fatGrams: number
): number {
  return (
    proteinGrams * CALORIES_PER_GRAM.protein +
    carbGrams * CALORIES_PER_GRAM.carbs +
    fatGrams * CALORIES_PER_GRAM.fat
  );
}

/**
 * Redistributes remaining calories between two macros while maintaining their ratio.
 * Returns the new gram values for both macros.
 */
function redistributeCalories(
  remainingCalories: number,
  macro1CurrentGrams: number,
  macro1CalPerGram: number,
  macro2CurrentGrams: number,
  macro2CalPerGram: number
): { macro1Grams: number; macro2Grams: number } {
  // Calculate current calories for each macro
  const macro1CurrentCal = macro1CurrentGrams * macro1CalPerGram;
  const macro2CurrentCal = macro2CurrentGrams * macro2CalPerGram;
  const totalCurrentCal = macro1CurrentCal + macro2CurrentCal;

  // If both macros are at 0, split evenly by calories
  if (totalCurrentCal === 0) {
    const halfCalories = remainingCalories / 2;
    return {
      macro1Grams: Math.max(0, Math.round(halfCalories / macro1CalPerGram)),
      macro2Grams: Math.max(0, Math.round(halfCalories / macro2CalPerGram)),
    };
  }

  // Calculate ratio based on current calorie distribution
  const macro1Ratio = macro1CurrentCal / totalCurrentCal;
  const macro2Ratio = macro2CurrentCal / totalCurrentCal;

  // Distribute remaining calories proportionally
  const newMacro1Calories = remainingCalories * macro1Ratio;
  const newMacro2Calories = remainingCalories * macro2Ratio;

  // Convert back to grams, ensuring non-negative values
  return {
    macro1Grams: Math.max(0, Math.round(newMacro1Calories / macro1CalPerGram)),
    macro2Grams: Math.max(0, Math.round(newMacro2Calories / macro2CalPerGram)),
  };
}

/**
 * Adjusts macros when one is changed, redistributing to maintain fixed calorie total.
 * Returns the new gram values for all three macros.
 */
function adjustMacroWithRedistribution(
  dailyCalories: number,
  currentProtein: number,
  currentCarbs: number,
  currentFat: number,
  adjustedMacro: "protein" | "carbs" | "fat",
  newGrams: number
): { proteinGrams: number; carbGrams: number; fatGrams: number } {
  // Ensure the new value is non-negative
  const safeNewGrams = Math.max(0, newGrams);

  // Calculate calories consumed by the adjusted macro
  const adjustedMacroCalories = safeNewGrams * CALORIES_PER_GRAM[adjustedMacro];

  // Calculate remaining calories for the other two macros
  const remainingCalories = dailyCalories - adjustedMacroCalories;

  // If the adjusted macro exceeds total calories, cap it and set others to 0
  if (remainingCalories <= 0) {
    const maxGrams = Math.floor(dailyCalories / CALORIES_PER_GRAM[adjustedMacro]);
    return {
      proteinGrams: adjustedMacro === "protein" ? maxGrams : 0,
      carbGrams: adjustedMacro === "carbs" ? maxGrams : 0,
      fatGrams: adjustedMacro === "fat" ? maxGrams : 0,
    };
  }

  // Redistribute remaining calories between the other two macros
  if (adjustedMacro === "protein") {
    const { macro1Grams: newCarbs, macro2Grams: newFat } = redistributeCalories(
      remainingCalories,
      currentCarbs,
      CALORIES_PER_GRAM.carbs,
      currentFat,
      CALORIES_PER_GRAM.fat
    );
    return { proteinGrams: safeNewGrams, carbGrams: newCarbs, fatGrams: newFat };
  } else if (adjustedMacro === "carbs") {
    const { macro1Grams: newProtein, macro2Grams: newFat } = redistributeCalories(
      remainingCalories,
      currentProtein,
      CALORIES_PER_GRAM.protein,
      currentFat,
      CALORIES_PER_GRAM.fat
    );
    return { proteinGrams: newProtein, carbGrams: safeNewGrams, fatGrams: newFat };
  } else {
    // fat
    const { macro1Grams: newProtein, macro2Grams: newCarbs } = redistributeCalories(
      remainingCalories,
      currentProtein,
      CALORIES_PER_GRAM.protein,
      currentCarbs,
      CALORIES_PER_GRAM.carbs
    );
    return { proteinGrams: newProtein, carbGrams: newCarbs, fatGrams: safeNewGrams };
  }
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
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const accentProtein = useMemo(() => withAlpha(palette.success, 0.14), [palette.success]);
  const accentCarbs = useMemo(() => withAlpha(palette.warning, 0.14), [palette.warning]);
  const accentFat = useMemo(() => withAlpha(palette.textMuted, 0.12), [palette.textMuted]);

  // ============================================================================
  // ANIMATION REFS
  // ============================================================================
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Macro card animations - staggered entrance
  const macroOpacity1 = useRef(new Animated.Value(0)).current;
  const macroOpacity2 = useRef(new Animated.Value(0)).current;
  const macroOpacity3 = useRef(new Animated.Value(0)).current;
  const macroScale1 = useRef(new Animated.Value(0.95)).current;
  const macroScale2 = useRef(new Animated.Value(0.95)).current;
  const macroScale3 = useRef(new Animated.Value(0.95)).current;

  // Pulse animation for macro cards when values change
  const macroPulseAnim = useRef(new Animated.Value(1)).current;

  // ============================================================================
  // STATE - Macro grams (single source of truth for macros)
  // ============================================================================
  const [proteinGrams, setProteinGrams] = useState<number>(0);
  const [carbGrams, setCarbGrams] = useState<number>(0);
  const [fatGrams, setFatGrams] = useState<number>(0);
  const [macrosInitialized, setMacrosInitialized] = useState(false);

  // Ref to track previous macro values for animation
  const prevMacrosRef = useRef<{ protein: number; carbs: number; fat: number } | null>(null);

  // ============================================================================
  // CALORIE CALCULATIONS (derived, never stored)
  // ============================================================================
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

    // BMR (Mifflin-St Jeor formula)
    const bmrBase = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const genderOffset = gender === "male" ? 5 : -161;
    const bmr = bmrBase + genderOffset;

    // Activity multiplier
    const activityMultiplier = isAthlete
      ? trainingLevel === "intense"
        ? 1.9
        : trainingLevel === "casual"
          ? 1.7
          : 1.55
      : 1.35;
    const maintenance = bmr * activityMultiplier;

    // Goal adjustment
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

    // Athlete safety rules
    if (isAthlete) {
      const athleteMin = weightKg * (trainingLevel === "intense" ? 35 : 30);
      if (target < athleteMin) {
        target = athleteMin;
      }
    }

    // Clamp to bounds and round to nearest 10
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

  // The daily calorie target - updated when macros change
  const dailyCalories = calorieTarget ?? recommendedCalories ?? 0;

  // Calculate actual calories from current macros
  const actualCaloriesFromMacros = useMemo(() => {
    return calculateCaloriesFromMacros(proteinGrams, carbGrams, fatGrams);
  }, [proteinGrams, carbGrams, fatGrams]);

  // ============================================================================
  // INITIALIZATION - Set initial macro values from daily calories
  // ============================================================================
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

    if (targetInvalid || recommendedChanged || (initialMount && calorieTarget !== clamped)) {
      onCalorieTargetChange(clamped);
    }

    prevRecommendedRef.current = recommendedCalories;
  }, [recommendedCalories, minCalories, maxCalories, calorieTarget, onCalorieTargetChange]);

  // Initialize macros when daily calories are first available
  useEffect(() => {
    if (dailyCalories > 0 && !macrosInitialized) {
      const initialMacros = calculateInitialMacrosFromCalories(dailyCalories);
      setProteinGrams(initialMacros.proteinGrams);
      setCarbGrams(initialMacros.carbGrams);
      setFatGrams(initialMacros.fatGrams);
      setMacrosInitialized(true);
    }
  }, [dailyCalories, macrosInitialized]);

  // Re-initialize macros if daily calories change significantly
  useEffect(() => {
    if (macrosInitialized && dailyCalories > 0) {
      // Check if macros need to be recalculated due to calorie change
      const currentTotal = calculateCaloriesFromMacros(proteinGrams, carbGrams, fatGrams);
      const diff = Math.abs(currentTotal - dailyCalories);

      // If the difference is more than 1 calorie, redistribute
      if (diff > 1) {
        const initialMacros = calculateInitialMacrosFromCalories(dailyCalories);
        setProteinGrams(initialMacros.proteinGrams);
        setCarbGrams(initialMacros.carbGrams);
        setFatGrams(initialMacros.fatGrams);
      }
    }
  }, [dailyCalories]);

  // Call back with calorie range when it changes
  useEffect(() => {
    if (minCalories !== null && maxCalories !== null && onCalorieRangeChange) {
      onCalorieRangeChange(minCalories, maxCalories);
    }
  }, [minCalories, maxCalories, onCalorieRangeChange]);

  // Call back with macros when they change
  useEffect(() => {
    if (onMacrosChange && macrosInitialized) {
      onMacrosChange({
        proteinGrams,
        carbGrams,
        fatGrams,
      });
    }
  }, [proteinGrams, carbGrams, fatGrams, macrosInitialized, onMacrosChange]);

  // ============================================================================
  // ANIMATIONS
  // ============================================================================

  // Pulse animation for central calorie display
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

  // Entrance animations
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

    // Staggered entrance animation for macro cards
    const staggerDelay = 100;
    const animateMacroCard = (
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
      animateMacroCard(macroOpacity1, macroScale1, 200),
      animateMacroCard(macroOpacity2, macroScale2, 200),
      animateMacroCard(macroOpacity3, macroScale3, 200),
    ]).start();
  }, []);

  // Pulse animation when macro values change
  useEffect(() => {
    const prev = prevMacrosRef.current;
    if (
      prev !== null &&
      (prev.protein !== proteinGrams || prev.carbs !== carbGrams || prev.fat !== fatGrams)
    ) {
      Animated.sequence([
        Animated.timing(macroPulseAnim, {
          toValue: 1.08,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(macroPulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevMacrosRef.current = { protein: proteinGrams, carbs: carbGrams, fat: fatGrams };
  }, [proteinGrams, carbGrams, fatGrams, macroPulseAnim]);

  // Combined scale for macro cards (entrance + pulse)
  const macroScaleCombined1 = Animated.multiply(macroScale1, macroPulseAnim);
  const macroScaleCombined2 = Animated.multiply(macroScale2, macroPulseAnim);
  const macroScaleCombined3 = Animated.multiply(macroScale3, macroPulseAnim);

  // ============================================================================
  // MACRO ADJUSTMENT HANDLERS
  // Macros are the source of truth - calories are derived from them
  // ============================================================================

  /**
   * Adjusts a macro by the step amount.
   * Only the adjusted macro changes - others stay the same.
   * Total calories are recalculated from the new macro values.
   * Only prevents going below 0 - no upper limit.
   * @param macro - Which macro to adjust
   * @param direction - "increment" or "decrement"
   */
  const handleMacroAdjust = useCallback(
    (macro: "protein" | "carbs" | "fat", direction: "increment" | "decrement") => {
      const delta = direction === "increment" ? MACRO_STEP_GRAMS : -MACRO_STEP_GRAMS;

      let newProtein = proteinGrams;
      let newCarbs = carbGrams;
      let newFat = fatGrams;

      // Update only the adjusted macro, preventing negative values
      if (macro === "protein") {
        newProtein = Math.max(0, proteinGrams + delta);
        if (newProtein === proteinGrams) return; // No change possible
      } else if (macro === "carbs") {
        newCarbs = Math.max(0, carbGrams + delta);
        if (newCarbs === carbGrams) return; // No change possible
      } else {
        newFat = Math.max(0, fatGrams + delta);
        if (newFat === fatGrams) return; // No change possible
      }

      // Calculate new total calories from macros
      const newTotalCalories = calculateCaloriesFromMacros(newProtein, newCarbs, newFat);

      // Update macro state
      if (macro === "protein") setProteinGrams(newProtein);
      else if (macro === "carbs") setCarbGrams(newCarbs);
      else setFatGrams(newFat);

      // Update the calorie target to reflect the new total
      onCalorieTargetChange(newTotalCalories);
    },
    [proteinGrams, carbGrams, fatGrams, onCalorieTargetChange]
  );

  // Individual handlers for each macro
  const incrementProtein = useCallback(
    () => handleMacroAdjust("protein", "increment"),
    [handleMacroAdjust]
  );
  const decrementProtein = useCallback(
    () => handleMacroAdjust("protein", "decrement"),
    [handleMacroAdjust]
  );
  const incrementCarbs = useCallback(
    () => handleMacroAdjust("carbs", "increment"),
    [handleMacroAdjust]
  );
  const decrementCarbs = useCallback(
    () => handleMacroAdjust("carbs", "decrement"),
    [handleMacroAdjust]
  );
  const incrementFat = useCallback(
    () => handleMacroAdjust("fat", "increment"),
    [handleMacroAdjust]
  );
  const decrementFat = useCallback(
    () => handleMacroAdjust("fat", "decrement"),
    [handleMacroAdjust]
  );

  // ============================================================================
  // CAN INCREMENT/DECREMENT CHECKS
  // No upper limit - only prevent going below 0
  // ============================================================================

  // Increment is always allowed (no upper limit)
  const canIncrementProtein = true;
  const canIncrementCarbs = true;
  const canIncrementFat = true;

  // Check if we can decrement (won't go below 0)
  const canDecrementProtein = proteinGrams >= MACRO_STEP_GRAMS;
  const canDecrementCarbs = carbGrams >= MACRO_STEP_GRAMS;
  const canDecrementFat = fatGrams >= MACRO_STEP_GRAMS;

  // ============================================================================
  // CALORIE ADJUSTMENT HANDLERS
  // When calories change, recalculate macros proportionally
  // ============================================================================

  const CALORIE_STEP = 50; // Calories to add/subtract per tap

  /**
   * Recalculates macros when total calories change.
   * Maintains the current macro ratio (by calories) when scaling.
   */
  const recalculateMacrosForNewCalories = useCallback(
    (newCalories: number) => {
      if (newCalories <= 0) return;

      // Calculate current calorie distribution for each macro
      const currentProteinCal = proteinGrams * CALORIES_PER_GRAM.protein;
      const currentCarbsCal = carbGrams * CALORIES_PER_GRAM.carbs;
      const currentFatCal = fatGrams * CALORIES_PER_GRAM.fat;
      const currentTotalCal = currentProteinCal + currentCarbsCal + currentFatCal;

      // If no macros set yet, use default percentages
      if (currentTotalCal === 0) {
        const initialMacros = calculateInitialMacrosFromCalories(newCalories);
        setProteinGrams(initialMacros.proteinGrams);
        setCarbGrams(initialMacros.carbGrams);
        setFatGrams(initialMacros.fatGrams);
        return;
      }

      // Calculate current ratios (by calories)
      const proteinRatio = currentProteinCal / currentTotalCal;
      const carbsRatio = currentCarbsCal / currentTotalCal;
      const fatRatio = currentFatCal / currentTotalCal;

      // Apply ratios to new calorie total
      const newProteinCal = newCalories * proteinRatio;
      const newCarbsCal = newCalories * carbsRatio;
      const newFatCal = newCalories * fatRatio;

      // Convert back to grams
      const newProteinGrams = Math.round(newProteinCal / CALORIES_PER_GRAM.protein);
      const newCarbsGrams = Math.round(newCarbsCal / CALORIES_PER_GRAM.carbs);
      const newFatGrams = Math.round(newFatCal / CALORIES_PER_GRAM.fat);

      setProteinGrams(newProteinGrams);
      setCarbGrams(newCarbsGrams);
      setFatGrams(newFatGrams);
    },
    [proteinGrams, carbGrams, fatGrams]
  );

  /**
   * Increment total daily calories by CALORIE_STEP.
   * Recalculates all macros proportionally.
   */
  const incrementCalories = useCallback(() => {
    if (dailyCalories <= 0) return;
    const max = maxCalories ?? MAX_CALORIES;
    const newCalories = Math.min(dailyCalories + CALORIE_STEP, max);

    if (newCalories !== dailyCalories) {
      onCalorieTargetChange(newCalories);
      recalculateMacrosForNewCalories(newCalories);
    }
  }, [dailyCalories, maxCalories, onCalorieTargetChange, recalculateMacrosForNewCalories]);

  /**
   * Decrement total daily calories by CALORIE_STEP.
   * Recalculates all macros proportionally.
   */
  const decrementCalories = useCallback(() => {
    if (dailyCalories <= 0) return;
    const min = minCalories ?? MIN_CALORIES;
    const newCalories = Math.max(dailyCalories - CALORIE_STEP, min);

    if (newCalories !== dailyCalories) {
      onCalorieTargetChange(newCalories);
      recalculateMacrosForNewCalories(newCalories);
    }
  }, [dailyCalories, minCalories, onCalorieTargetChange, recalculateMacrosForNewCalories]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.cardTitle}>Your Daily Calories & Macros</Text>
      <Text style={styles.cardSubtitle}>
        Adjust your macro distribution using the + and − buttons.
        Total calories remain fixed.
      </Text>

      {/* Central Calorie Display - Fixed, immutable */}
      <Animated.View
        style={[
          styles.pulseCircle,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.pulseValue}>
          {dailyCalories > 0 ? dailyCalories : "—"}
        </Text>
        <Text style={styles.pulseUnit}>Calories per Day</Text>
      </Animated.View>

      {/* Macro Cards Section with +/- controls */}
      <View style={styles.macrosContainer}>
        <MacroCard
          label="Protein"
          grams={proteinGrams}
          accentColor={accentProtein}
          animatedScale={macroScaleCombined1}
          animatedOpacity={macroOpacity1}
          onIncrement={incrementProtein}
          onDecrement={decrementProtein}
          canIncrement={canIncrementProtein}
          canDecrement={canDecrementProtein}
        />
        <MacroCard
          label="Carbs"
          grams={carbGrams}
          accentColor={accentCarbs}
          animatedScale={macroScaleCombined2}
          animatedOpacity={macroOpacity2}
          onIncrement={incrementCarbs}
          onDecrement={decrementCarbs}
          canIncrement={canIncrementCarbs}
          canDecrement={canDecrementCarbs}
        />
        <MacroCard
          label="Fat"
          grams={fatGrams}
          accentColor={accentFat}
          animatedScale={macroScaleCombined3}
          animatedOpacity={macroOpacity3}
          onIncrement={incrementFat}
          onDecrement={decrementFat}
          canIncrement={canIncrementFat}
          canDecrement={canDecrementFat}
        />
      </View>

      {/* Calorie adjustment stepper row */}
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[
            styles.stepperButton,
            (dailyCalories <= (minCalories ?? MIN_CALORIES)) && styles.stepperButtonDisabled,
          ]}
          onPress={decrementCalories}
          disabled={dailyCalories <= (minCalories ?? MIN_CALORIES)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.stepperLabel,
              (dailyCalories <= (minCalories ?? MIN_CALORIES)) && styles.stepperLabelDisabled,
            ]}
          >
            −
          </Text>
        </TouchableOpacity>
        <View style={styles.stepperInfo}>
          <Text style={styles.rangeLabel}>Safe range</Text>
          <Text style={styles.rangeValue}>
            {minCalories ?? "—"} - {maxCalories ?? "—"}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.stepperButton,
            (dailyCalories >= (maxCalories ?? MAX_CALORIES)) && styles.stepperButtonDisabled,
          ]}
          onPress={incrementCalories}
          disabled={dailyCalories >= (maxCalories ?? MAX_CALORIES)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.stepperLabel,
              (dailyCalories >= (maxCalories ?? MAX_CALORIES)) && styles.stepperLabelDisabled,
            ]}
          >
            +
          </Text>
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
  success: colors.success,
  warning: colors.warning,
});

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.card,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 24,
      alignItems: "center",
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 8,
      textAlign: "center",
    },
    cardSubtitle: {
      fontSize: 14,
      color: palette.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    pulseCircle: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: palette.card,
      borderWidth: 2,
      borderColor: palette.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
      shadowColor: palette.text,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 10,
      elevation: 3,
    },
    pulseValue: {
      fontSize: 36,
      fontWeight: "700",
      color: palette.success,
    },
    pulseUnit: {
      fontSize: 14,
      color: palette.textMuted,
      marginTop: 4,
    },
    // Calorie stepper row styles
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
      backgroundColor: palette.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.text,
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },
    stepperButtonDisabled: {
      backgroundColor: withAlpha(palette.textMuted, 0.08),
      borderColor: withAlpha(palette.border, 0.8),
      shadowOpacity: 0,
      elevation: 0,
    },
    stepperLabel: {
      fontSize: 28,
      color: palette.text,
      fontWeight: "700",
    },
    stepperLabelDisabled: {
      color: withAlpha(palette.textMuted, 0.6),
    },
    stepperInfo: {
      flex: 1,
      alignItems: "center",
    },
    rangeLabel: {
      fontSize: 12,
      color: palette.textMuted,
      marginBottom: 4,
    },
    rangeValue: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
    },
    // Macro card styles with +/- buttons
    macrosContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: SCREEN_WIDTH < 380 ? 8 : 12,
      marginBottom: 20,
      width: "100%",
    },
    macroCard: {
      flex: 1,
      minWidth: SCREEN_WIDTH < 380 ? 90 : 100,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 16,
      alignItems: "center",
      shadowColor: palette.text,
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: withAlpha(palette.textMuted, 0.12),
    },
    macroLabel: {
      fontSize: SCREEN_WIDTH < 380 ? 10 : 11,
      color: palette.textMuted,
      fontWeight: "500",
      marginBottom: 4,
    },
    macroValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: 2,
    },
    macroValue: {
      fontSize: SCREEN_WIDTH < 380 ? 20 : 24,
      fontWeight: "700",
      color: palette.text,
    },
    macroUnit: {
      fontSize: SCREEN_WIDTH < 380 ? 11 : 12,
      fontWeight: "500",
      color: palette.textMuted,
      marginLeft: 2,
      marginBottom: 6,
    },
    // +/- button styles for macro cards
    macroButtonRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },
    macroButton: {
      width: SCREEN_WIDTH < 380 ? 28 : 32,
      height: SCREEN_WIDTH < 380 ? 28 : 32,
      borderRadius: SCREEN_WIDTH < 380 ? 14 : 16,
      backgroundColor: palette.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.text,
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 1,
    },
    macroButtonDisabled: {
      backgroundColor: withAlpha(palette.textMuted, 0.08),
      borderColor: withAlpha(palette.border, 0.8),
      shadowOpacity: 0,
      elevation: 0,
    },
    macroButtonText: {
      fontSize: SCREEN_WIDTH < 380 ? 18 : 20,
      fontWeight: "600",
      color: palette.text,
      lineHeight: SCREEN_WIDTH < 380 ? 20 : 22,
    },
    macroButtonTextDisabled: {
      color: withAlpha(palette.textMuted, 0.6),
    },
  });

export default RecommendedCaloriesScreen;
