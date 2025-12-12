import BasicBodyInformationScreen from "@/components/preferences/BasicBodyInformationScreen";
import RecommendedCaloriesScreen from "@/components/preferences/RecommendedCaloriesScreen";
import { useUser } from "@/context/usercontext";
import { setPrefrences } from "@/src/user/setPrefrences";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

type PreferenceOption = {
  id: string;
  label: string;
};

type Goal = "lose-weight" | "weight-gain" | "muscle-gain" | "balanced" | "leaner";

type DietaryPreference =
  | "halal"
  | "kosher"
  | "vegetarian"
  | "vegan"
  | "pescatarian";

type PreferenceScreenKey = "culturalLifestyle" | "goal";

type PreferenceScreenConfig = {
  key: PreferenceScreenKey;
  title: string;
  options: PreferenceOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  singleSelect?: boolean;
};

type BasicBodyInformation = {
  age: number | null;
  height: number | null;
  weight: number | null;
  gender: "male" | "female" | null;
  isAthlete: boolean;
  trainingLevel: "light" | "casual" | "intense" | null;
};

type BodyUnits = {
  heightUnit: "cm" | "ft";
  weightUnit: "kg" | "lbs";
};

type OnboardingPreferenceState = {
  culturalLifestyle: string[];
  allergies: string[];
  goal: string[];
  body: BasicBodyInformation;
  isAthlete?: boolean;
  trainingLevel?: "light" | "casual" | "intense" | null;
  calorieTarget: number | null;
};

const COLORS = {
  background: "#FFFFFF",
  lightGray: "#F7F8FA",
  border: "#EEEFF3",
  orange: "#FD8100",
  green: "#00C853",
  dark: "#111111",
  muted: "#666666",
  chipText: "#4C4C4C",
  grayButton: "#D6D6D6",
};

const COMMON_ALLERGIES = [
  "Peanuts",
  "Tree Nuts",
  "Milk",
  "Eggs",
  "Soy",
  "Wheat",
  "Fish",
] as const;

const normalizeAllergyValue = (value: string) => value.trim();

const allergyExistsInList = (
  list: string[],
  value: string,
  ignoreIndex?: number
) => {
  const target = value.toLowerCase();
  return list.some(
    (item, index) => index !== ignoreIndex && item.toLowerCase() === target
  );
};

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const OnboardingPreferences = () => {
  const router = useRouter();
  const { fromProfile } = useLocalSearchParams();
  const userContext = useUser();
  
  const user = userContext?.user;
  const prefrences = userContext?.prefrences;
  const updateUserInfo = userContext?.updateUserInfo;

  const [currentStep, setCurrentStep] = useState(0);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [editingAllergyIndex, setEditingAllergyIndex] =
    useState<number | null>(null);
  const [culturalLifestylePreferences, setCulturalLifestylePreferences] =
    useState<DietaryPreference[]>([]);
  const [goals, setGoals] = useState<Goal[]>(["balanced"]);
  const [bodyInformation, setBodyInformation] = useState<BasicBodyInformation>(
    {
      age: null,
      height: null,
      weight: null,
      gender: null,
      isAthlete: false,
      trainingLevel: null,
    }
  );
  const [bodyUnits, setBodyUnits] = useState<BodyUnits>({
    heightUnit: "cm",
    weightUnit: "kg",
  });
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [prefilledFromSaved, setPrefilledFromSaved] = useState(false);
  const [bodyErrors, setBodyErrors] = useState<{
    age: string | null;
    height: string | null;
    weight: string | null;
  }>({
    age: null,
    height: null,
    weight: null,
  });
  const handleCalorieTargetChange = useCallback(
    (value: number) => setCalorieTarget(value),
    []
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const optionScaleRefs = useRef<Record<string, Animated.Value>>({});
  const transitionLockRef = useRef(false);
  const isSavingRef = useRef(false);
  const primaryGoal = useMemo(() => {
    const meaningful = goals.filter((g) => g !== "balanced");
    if (meaningful.length) return meaningful[meaningful.length - 1];
    return goals[0] ?? "balanced";
  }, [goals]);

  // Pre-fill user preferences from context when editing from profile
  useEffect(() => {
    if (fromProfile !== "true") return;

    // Pre-fill body information from user context
    if (user) {
      if (user.age || user.height || user.weight || user.gender) {
        setBodyInformation({
          age: user.age ?? null,
          height: user.height ?? null,
          weight: user.weight ?? null,
          gender: user.gender ?? null,
          isAthlete: false,
          trainingLevel: null,
        });
      }

      // Pre-fill calories from user context
      if (user.calories) {
        setCalorieTarget(user.calories);
      }
    }

    // Pre-fill preferences from context
    if (prefrences) {
      // Pre-fill goal
      if (prefrences.goal) {
        setGoals([prefrences.goal as Goal]);
      }

      // Pre-fill diet codes (cultural/lifestyle preferences)
      if (Array.isArray(prefrences.diet_codes)) {
        // Filter out allergy codes (they start with "allergy-")
        const culturalPrefs = prefrences.diet_codes.filter(
          (code: string) => !code.startsWith("allergy-")
        );
        setCulturalLifestylePreferences(
          culturalPrefs.filter(Boolean) as DietaryPreference[]
        );

        // Extract allergies from allergy codes
        const allergyItems = prefrences.diet_codes
          .filter((code: string) => code.startsWith("allergy-"))
          .map((code: string) => {
            // Convert "allergy-peanuts" to "Peanuts"
            const allergyName = code.replace("allergy-", "").replace(/-/g, " ");
            return allergyName.charAt(0).toUpperCase() + allergyName.slice(1);
          });
        setAllergies(allergyItems);
      }

      // Pre-fill calorie target from preferences if not set from user data
      if (prefrences.calorie_target && !user?.calories) {
        setCalorieTarget(prefrences.calorie_target);
      }
    }
  }, [fromProfile, user, prefrences]);

  const preferenceScreens: PreferenceScreenConfig[] = useMemo(
    () => [
      {
        key: "culturalLifestyle",
        title: "Cultural, Religious & Lifestyle",
        options: [
          { id: "halal", label: "Halal" },
          { id: "kosher", label: "Kosher" },
          { id: "vegetarian", label: "Vegetarian" },
          { id: "vegan", label: "Vegan" },
          { id: "pescatarian", label: "Pescatarian" },
        ],
        selectedValues: culturalLifestylePreferences,
        onChange: (values: string[]) =>
          setCulturalLifestylePreferences(values as DietaryPreference[]),
      },
      {
        key: "goal",
        title: "What is your goal?",
        options: [
          { id: "lose-weight", label: "Lose Weight" },
          { id: "weight-gain", label: "Gain Weight" },
          { id: "muscle-gain", label: "Muscle Gain" },
          { id: "leaner", label: "Get Leaner" },
          { id: "balanced", label: "Balanced" },
        ],
        selectedValues: goals,
        onChange: (values: string[]) =>
          setGoals((values as Goal[]).length ? (values as Goal[]) : ["balanced"]),
      },
    ],
    [culturalLifestylePreferences, goals]
  );

  const stageSequence = useMemo(() => {
    const preferenceKeys = preferenceScreens.map((screen) => screen.key);
    return ["welcome", ...preferenceKeys, "allergies", "body", "calories"];
  }, [preferenceScreens]);

  const lifestyleOptionIds = useMemo(
    () => ["halal", "kosher", "vegetarian", "vegan", "pescatarian"],
    []
  );

  const stageCount = stageSequence.length;

  const maxStepIndex = useMemo(
    () => Math.max(stageCount - 1, 0),
    [stageCount]
  );

  const clampStep = useCallback(
    (value: number) => Math.min(Math.max(value, 0), maxStepIndex),
    [maxStepIndex]
  );

  const safeCurrentStep = useMemo(
    () => clampStep(currentStep),
    [clampStep, currentStep]
  );

  const progressStages = useMemo(
    () => stageSequence.filter((stage) => stage !== "welcome"),
    [stageSequence]
  );

  const currentStageKey = useMemo(() => {
    return (
      stageSequence[safeCurrentStep] ??
      stageSequence[stageSequence.length - 1] ??
      "welcome"
    );
  }, [safeCurrentStep, stageSequence]);

  const stageFlags = useMemo(
    () => ({
      isGoalStage: currentStageKey === "goal",
      isAllergiesStage: currentStageKey === "allergies",
      isBodyStage: currentStageKey === "body",
      isCalorieStage: currentStageKey === "calories",
    }),
    [currentStageKey]
  );
  const { isGoalStage, isAllergiesStage, isBodyStage, isCalorieStage } = stageFlags;

  const currentPreferenceScreen = useMemo(
    () =>
      preferenceScreens.find((screen) => screen.key === currentStageKey) ?? null,
    [preferenceScreens, currentStageKey]
  );

  const currentProgressIndex = useMemo(
    () => Math.max(progressStages.indexOf(currentStageKey), 0),
    [progressStages, currentStageKey]
  );

  const getOptionScale = useCallback((id: string) => {
    if (!optionScaleRefs.current[id]) {
      optionScaleRefs.current[id] = new Animated.Value(1);
    }
    return optionScaleRefs.current[id];
  }, []);

  const animateOptionSelection = useCallback(
    (id: string) => {
      const scale = getOptionScale(id);
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.97,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [getOptionScale]
  );

  const bodyHasInvalidEntries = useMemo(
    () =>
      (bodyErrors.age && bodyInformation.age !== null) ||
      (bodyErrors.height && bodyInformation.height !== null) ||
      (bodyErrors.weight && bodyInformation.weight !== null),
    [bodyErrors, bodyInformation]
  );

  const hasGoalConflict = useMemo(() => {
    const hasLose = goals.includes("lose-weight");
    const hasGain = goals.includes("weight-gain");
    return hasLose && hasGain;
  }, [goals]);

  const allergiesCount = allergies.length;

  useEffect(() => {
    // Pre-fill from saved preferences/user profile when available
    if (prefilledFromSaved) return;
    const dietCodes = prefrences?.diet_codes ?? [];

    const savedLifestyle = dietCodes
      .filter((code) => lifestyleOptionIds.includes(code ?? ""))
      .filter(Boolean) as DietaryPreference[];
    const savedAllergies = dietCodes
      .filter((code) => (code ?? "").startsWith("allergy-"))
      .map((code) =>
        (code ?? "")
          .replace(/^allergy-/, "")
          .split("-")
          .map((part) =>
            part.length ? part[0].toUpperCase() + part.slice(1) : part
          )
          .join(" ")
          .trim()
      )
      .filter(Boolean);

    if (
      savedLifestyle.length ||
      savedAllergies.length ||
      user ||
      prefrences?.goal ||
      typeof prefrences?.calorie_target === "number"
    ) {
      setCulturalLifestylePreferences(savedLifestyle);
      setAllergies(savedAllergies);
      if (prefrences?.goal) setGoals([prefrences.goal as Goal]);
      if (typeof prefrences?.calorie_target === "number") {
        setCalorieTarget(prefrences.calorie_target);
      }
      setBodyInformation({
        age: user?.age ?? null,
        height: user?.height ?? null,
        weight: user?.weight ?? null,
        gender: user?.gender ?? null,
        isAthlete: false,
        trainingLevel: null,
      });
      setBodyUnits((prev) => ({
        ...prev,
        heightUnit: "cm",
        weightUnit: "kg",
      }));
      setPrefilledFromSaved(true);
    }

    // Either way, loading state can end after first attempt
    setIsLoadingPreferences(false);
  }, [
    lifestyleOptionIds,
    prefilledFromSaved,
    prefrences,
    user,
    setCulturalLifestylePreferences,
    setAllergies,
  ]);

  // Entrance animation - super fast and snappy
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

  const hasSelection = useMemo(() => {
    if (isBodyStage) {
      // Require all fields filled and no validation errors
      const allFilled =
        bodyInformation.age !== null &&
        bodyInformation.height !== null &&
        bodyInformation.weight !== null &&
        bodyInformation.gender !== null &&
        (!bodyInformation.isAthlete || bodyInformation.trainingLevel !== null);
      return allFilled && !bodyHasInvalidEntries;
    }
    // All other stages are skippable
    return true;
  }, [
    bodyInformation,
    isAllergiesStage,
    isBodyStage,
    isCalorieStage,
    calorieTarget,
  ]);

  const nextButtonLabel = useMemo(
    () => "Next",
    [hasSelection]
  );
  const isNextDisabled = useMemo(
    () => (isGoalStage && hasGoalConflict) || !hasSelection,
    [hasGoalConflict, hasSelection, isGoalStage]
  );

  const optionItems = useMemo(() => {
    if (!currentPreferenceScreen) return [];
    return currentPreferenceScreen.options.map((option) => {
      const isSelected = currentPreferenceScreen.singleSelect
        ? currentPreferenceScreen.selectedValues[0] === option.id
        : currentPreferenceScreen.selectedValues.includes(option.id);
      return {
        id: option.id,
        label: option.label,
        isSelected,
        scale: getOptionScale(option.id),
      };
    });
  }, [currentPreferenceScreen, getOptionScale]);

  const allergyItems = useMemo(
    () =>
      allergies.map((allergy, index) => ({
        key: `${allergy}-${index}`,
        allergy,
        index,
      })),
    [allergies]
  );

  const allergyLookup = useMemo(
    () => new Set(allergies.map((item) => item.toLowerCase())),
    [allergies]
  );

  const commonAllergyChips = useMemo(
    () =>
      COMMON_ALLERGIES.map((label) => ({
        label,
        isSelected: allergyLookup.has(label.toLowerCase()),
      })),
    [allergyLookup]
  );
  const nextButtonStyle = useMemo(
    () => [
      styles.nextButtonBase,
      hasSelection ? styles.nextButtonActive : styles.nextButtonInactive,
    ],
    [hasSelection]
  );
  const nextButtonTextStyle = useMemo(
    () => [
      styles.nextButtonText,
      !hasSelection && styles.nextButtonTextInactive,
    ],
    [hasSelection]
  );

  const toggleOption = useCallback(
    (id: string) => {
      if (!currentPreferenceScreen) return;
      animateOptionSelection(id);

      if (currentPreferenceScreen.singleSelect) {
        currentPreferenceScreen.onChange([id]);
        return;
      }

      const currentValues = currentPreferenceScreen.selectedValues;
      if (currentValues.includes(id)) {
        currentPreferenceScreen.onChange(
          currentValues.filter((value) => value !== id)
        );
      } else {
        currentPreferenceScreen.onChange([...currentValues, id]);
      }
    },
    [animateOptionSelection, currentPreferenceScreen]
  );

  const handleBodyUnitChange = useCallback((field: "height" | "weight", unit: string) => {
    setBodyUnits((prev) => ({
      ...prev,
      [field === "height" ? "heightUnit" : "weightUnit"]: unit,
    }));
  }, []);

  const handleBodyInputChange = useCallback(
    (
      field: "age" | "height" | "weight" | "gender",
      rawValue: string
    ) => {
      if (field === "gender") {
        setBodyInformation((prev) => ({
          ...prev,
          gender: (rawValue as "male" | "female" | null) || null,
        }));
        return;
      }

      const trimmed = rawValue.trim();
      if (!trimmed) {
        setBodyInformation((prev) => ({ ...prev, [field]: null }));
        setBodyErrors((prev) => ({ ...prev, [field]: null }));
        return;
      }

      const numeric = Number(trimmed);
      if (Number.isNaN(numeric)) {
        setBodyErrors((prev) => ({
          ...prev,
          [field]: "Please enter a valid number",
        }));
        setBodyInformation((prev) => ({ ...prev, [field]: null }));
        return;
      }

      let error: string | null = null;
      let valueInStandardUnit = numeric;

      // Validate and convert based on field and unit
      if (field === "age") {
        if (numeric < 10 || numeric > 120) {
          error = "Age must be between 10 and 120";
        }
      } else if (field === "height") {
        if (bodyUnits.heightUnit === "cm") {
          if (numeric < 100 || numeric > 250) {
            error = "Height must be between 100 and 250 cm";
          }
          valueInStandardUnit = numeric; // Already in cm
        } else {
          // feet input - expect total inches (e.g., 70 for 5'10")
          if (numeric < 39 || numeric > 98) {
            error = "Height must be between 3'3\" and 8'2\" (39-98 inches)";
          }
          // Convert inches to cm (1 inch = 2.54 cm)
          valueInStandardUnit = Math.round(numeric * 2.54);
        }
      } else if (field === "weight") {
        if (bodyUnits.weightUnit === "kg") {
          if (numeric < 30 || numeric > 300) {
            error = "Weight must be between 30 and 300 kg";
          }
          valueInStandardUnit = numeric; // Already in kg
        } else {
          // pounds
          if (numeric < 66 || numeric > 660) {
            error = "Weight must be between 66 and 660 lbs";
          }
          // Convert lbs to kg (1 lb = 0.453592 kg)
          valueInStandardUnit = Math.round(numeric * 0.453592);
        }
      }

      setBodyInformation((prev) => ({ ...prev, [field]: valueInStandardUnit }));
      setBodyErrors((prev) => ({ ...prev, [field]: error }));
    },
    [bodyUnits]
  );

  const handleAthleteToggle = useCallback((value: boolean) => {
    setBodyInformation((prev) => ({
      ...prev,
      isAthlete: value,
      trainingLevel: value ? prev.trainingLevel : null,
    }));
  }, []);

  const handleTrainingLevelChange = useCallback(
    (value: "light" | "casual" | "intense" | null) => {
      setBodyInformation((prev) => ({
        ...prev,
        trainingLevel: value,
      }));
    },
    []
  );

  const runStageTransition = useCallback(
    (direction: "forward" | "backward") => {
      if (transitionLockRef.current) return;
      if (direction === "backward" && safeCurrentStep === 0) return;

      transitionLockRef.current = true;
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();

      const exitToValue = direction === "forward" ? -50 : 50;
      const enterStartValue = direction === "forward" ? 50 : -50;
      const delta = direction === "forward" ? 1 : -1;

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: exitToValue,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep((prev) => clampStep(prev + delta));
        slideAnim.setValue(enterStartValue);
        fadeAnim.setValue(0);
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
        ]).start(() => {
          transitionLockRef.current = false;
        });
      });
    },
    [clampStep, fadeAnim, safeCurrentStep, slideAnim]
  );

  const handleNext = useCallback(async () => {
    const stage = currentStageKey;

    if (stage === "body") {
      // Check if all required fields are filled
      if (!bodyInformation.age || !bodyInformation.height ||
          !bodyInformation.weight || !bodyInformation.gender) {
        alert("Please fill in all body information fields to continue.");
        return;
      }

      // Check for validation errors
      if (bodyHasInvalidEntries) {
        alert("Please fix the highlighted body information before continuing.");
        return;
      }
    }

    if (stage === "calories") {
      if (calorieTarget === null) {
        alert("Please set your calorie target before continuing.");
        return;
      }
      if (isSavingRef.current) {
        return;
      }

      isSavingRef.current = true;
      try {
        const preferenceCodes = [...culturalLifestylePreferences];
        const allergyCodes = allergies.map((allergy) =>
          `allergy-${allergy.toLowerCase().replace(/\s+/g, "-")}`
        );

        if (updateUserInfo) {
          await updateUserInfo({
            age: bodyInformation.age,
            height: bodyInformation.height,
            weight: bodyInformation.weight,
            gender: bodyInformation.gender,
            calories: calorieTarget,
          });
        }

        const result = await setPrefrences({
          diet_codes: [...preferenceCodes, ...allergyCodes],
          allergen_ingredient_ids: [],
          disliked_ingredient_ids: [],
          goal: primaryGoal,
          is_athlete: bodyInformation.isAthlete,
          training_level: bodyInformation.isAthlete
            ? bodyInformation.trainingLevel
            : null,
          calorie_target: calorieTarget ?? 0,
        });

        if (result.ok) {
          if (fromProfile === "true") {
            router.replace("/(main)/(home)/profile");
          } else {
            router.replace("/(main)/(home)/main");
          }
        } else {
          alert(
            "Something went wrong while saving your preferences. Please try again."
          );
        }
      } catch (error) {
        console.log("Error saving preferences:", error);
        alert(
          "Something went wrong while saving your preferences. Please try again."
        );
      } finally {
        isSavingRef.current = false;
      }
      return;
    }

    runStageTransition("forward");
  }, [
    allergies,
    bodyHasInvalidEntries,
    bodyInformation.age,
    bodyInformation.gender,
    bodyInformation.height,
    bodyInformation.weight,
    calorieTarget,
    currentStageKey,
    culturalLifestylePreferences,
    fromProfile,
    primaryGoal,
    router,
    runStageTransition,
  ]);
  // TODO: 
  const handleBack = useCallback(() => {
    runStageTransition("backward");
  }, [runStageTransition]);

  const addAllergy = useCallback(() => {
    const trimmed = normalizeAllergyValue(allergyInput);
    if (!trimmed) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (editingAllergyIndex !== null) {
      if (
        editingAllergyIndex < 0 ||
        editingAllergyIndex >= allergies.length
      ) {
        setEditingAllergyIndex(null);
        setAllergyInput("");
        return;
      }

      if (allergyExistsInList(allergies, trimmed, editingAllergyIndex)) {
        setAllergyInput("");
        setEditingAllergyIndex(null);
        return;
      }

      setAllergies((prev) => {
        if (
          editingAllergyIndex === null ||
          editingAllergyIndex < 0 ||
          editingAllergyIndex >= prev.length
        ) {
          return prev;
        }
        const updated = [...prev];
        updated[editingAllergyIndex] = trimmed;
        return updated;
      });
      setEditingAllergyIndex(null);
      setAllergyInput("");
      return;
    }

    if (allergyExistsInList(allergies, trimmed)) {
      setAllergyInput("");
      return;
    }

    setAllergies((prev) => [...prev, trimmed]);
    setAllergyInput("");
  }, [allergies, allergyInput, editingAllergyIndex]);

  const editAllergy = useCallback(
    (index: number) => {
      if (index < 0 || index >= allergies.length) return;
      setAllergyInput(allergies[index]);
      setEditingAllergyIndex(index);
    },
    [allergies]
  );

  const deleteAllergy = useCallback(
    (index: number) => {
      if (index < 0 || index >= allergies.length) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAllergies((prev) => prev.filter((_, i) => i !== index));
      if (editingAllergyIndex === index) {
        setAllergyInput("");
        setEditingAllergyIndex(null);
      }
    },
    [editingAllergyIndex]
  );

  const selectCommonAllergy = useCallback(
    (allergy: string) => {
      const trimmed = normalizeAllergyValue(allergy);
      if (!trimmed || allergyExistsInList(allergies, trimmed)) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAllergies((prev) => [...prev, trimmed]);
    },
    [allergies]
  );

  useEffect(() => {
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      progressAnim.stopAnimation();
      Object.values(optionScaleRefs.current).forEach((value) => {
        value.stopAnimation && value.stopAnimation();
      });
    };
  }, [fadeAnim, slideAnim, progressAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentProgressIndex,
      duration: 240,
      useNativeDriver: false,
    }).start();
    return () => {
      progressAnim.stopAnimation();
    };
  }, [currentProgressIndex, progressAnim]);

  const renderProgressBar = useCallback(
    () => (
      <View style={styles.progressContainer}>
        {progressStages.map((stage, index) => (
          <ProgressDot key={stage} index={index} progressAnim={progressAnim} />
        ))}
      </View>
    ),
    [progressAnim, progressStages]
  );

  const renderNextButton = useCallback(
    (label?: string) => (
      <TouchableOpacity
        style={nextButtonStyle}
        onPress={handleNext}
        disabled={isNextDisabled}
        activeOpacity={0.9}
      >
        <Text style={nextButtonTextStyle}>{label ?? nextButtonLabel}</Text>
      </TouchableOpacity>
    ),
    [
      handleNext,
      isNextDisabled,
      hasSelection,
      nextButtonLabel,
      nextButtonStyle,
      nextButtonTextStyle,
    ]
  );

  // Show loading screen while fetching existing preferences
  if (isLoadingPreferences && fromProfile === "true") {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </View>
    );
  }

  if (currentStageKey === "welcome") {
    return (
      <View style={styles.container}>
        <View style={styles.welcomeContainer}>
          {fromProfile === "true" && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/(main)/(home)/profile")}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.welcomeTitle}>
            Now let's{"\n"}set up{"\n"}your{"\n"}preferences
          </Text>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            style={[styles.nextButtonBase, styles.nextButtonActive]}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentPreferenceScreen) {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.6}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>

            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              }}
            >
              <Text style={styles.title}>{currentPreferenceScreen.title}</Text>
              {renderProgressBar()}

              <View style={styles.optionsContainer}>
                {optionItems.map((option) => (
                  <PreferenceOptionItem
                    key={option.id}
                    id={option.id}
                    label={option.label}
                    isSelected={option.isSelected}
                    scale={option.scale}
                    onSelect={toggleOption}
                  />
                ))}
              </View>

              {isGoalStage && hasGoalConflict ? (
                <Text style={styles.goalConflictText}>
                  You can’t select both Lose Weight and Gain Weight. Please adjust your choices.
                </Text>
              ) : null}
            </Animated.View>

            {renderNextButton()}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  if (isAllergiesStage) {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.6}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>

            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              }}
            >
              <Text style={styles.title}>Food Allergies</Text>
              {renderProgressBar()}
              <Text style={styles.subtitle}>
                Let us know about any food allergies you have
              </Text>

              <View style={styles.allergyInputSection}>
                <Text style={styles.sectionLabel}>Add Custom Allergy</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.allergyInput}
                    placeholder="Enter allergy (e.g., Peanuts)"
                    placeholderTextColor="#B0B0B0"
                    value={allergyInput}
                    onChangeText={setAllergyInput}
                    onSubmitEditing={addAllergy}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      !allergyInput.trim() && styles.addButtonDisabled,
                    ]}
                    onPress={addAllergy}
                    disabled={!allergyInput.trim()}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addButtonText}>
                      {editingAllergyIndex !== null ? "Update" : "Add"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {allergies.length > 0 && (
                <View style={styles.allergiesListSection}>
                  <Text style={styles.sectionLabel}>Your Allergies</Text>
                  <View style={styles.allergiesList}>
                    {allergyItems.map(({ key, allergy, index }) => (
                      <AllergyTag
                        key={key}
                        index={index}
                        label={allergy}
                        isEditing={editingAllergyIndex === index}
                        onEdit={editAllergy}
                        onDelete={deleteAllergy}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.commonAllergiesSection}>
                <Text style={styles.sectionLabel}>
                  Common Allergies (Tap to add)
                </Text>
                <View style={styles.commonAllergiesGrid}>
                  {commonAllergyChips.map(({ label, isSelected }) => (
                    <CommonAllergyChip
                      key={label}
                      label={label}
                      selected={isSelected}
                      onSelect={selectCommonAllergy}
                    />
                  ))}
                </View>
              </View>
            </Animated.View>

            {renderNextButton()}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  if (isBodyStage) {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.6}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            {renderProgressBar()}
            <BasicBodyInformationScreen
              age={bodyInformation.age}
              height={bodyInformation.height}
              weight={bodyInformation.weight}
              gender={bodyInformation.gender}
              isAthlete={bodyInformation.isAthlete}
              trainingLevel={bodyInformation.trainingLevel}
              ageError={bodyErrors.age}
              heightError={bodyErrors.height}
              weightError={bodyErrors.weight}
              onChange={handleBodyInputChange}
              onUnitChange={handleBodyUnitChange}
              onAthleteToggle={handleAthleteToggle}
              onTrainingLevelChange={handleTrainingLevelChange}
            />
            {renderNextButton()}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  if (isCalorieStage) {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.6}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            {renderProgressBar()}
            <RecommendedCaloriesScreen
              age={bodyInformation.age}
              height={bodyInformation.height}
              weight={bodyInformation.weight}
              gender={bodyInformation.gender}
              goals={goals}
              dietaryPreferences={culturalLifestylePreferences}
              isAthlete={bodyInformation.isAthlete}
              trainingLevel={bodyInformation.trainingLevel}
              calorieTarget={calorieTarget}
              onCalorieTargetChange={handleCalorieTargetChange}
            />
            {renderNextButton("Complete Setup")}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.muted,
  },
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 60,
    justifyContent: "space-between",
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.dark,
    lineHeight: 44,
  },
  logoContainer: {
    alignItems: "center",
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.dark,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.dark,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
  },
  optionsContainer: {
    marginBottom: 32,
    gap: 12,
  },
  goalConflictText: {
    marginTop: -12,
    marginBottom: 12,
    color: "#FF3B30",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionItemSelected: {
    borderColor: COLORS.orange,
    backgroundColor: "#FFF4EC",
  },
  optionLabel: {
    fontSize: 16,
    color: COLORS.dark,
    fontWeight: "500",
  },
  optionLabelSelected: {
    color: COLORS.orange,
  },
  radioOuter: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.green,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterActive: {
    borderColor: COLORS.orange,
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.orange,
  },
  nextButtonBase: {
    borderRadius: 14,
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  nextButtonActive: {
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  nextButtonInactive: {
    backgroundColor: "#C4C4C4",
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  nextButtonTextInactive: {
    color: "#F6F6F6",
  },
  allergyInputSection: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  allergyInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
  addButton: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginLeft: 10,
  },
  addButtonDisabled: {
    backgroundColor: "#B0EAC0",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  allergiesListSection: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 30,
  },
  allergiesList: {
    gap: 10,
  },
  allergyTag: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  allergyTagEditing: {
    borderColor: COLORS.orange,
  },
  allergyTagText: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
  },
  allergyActions: {
    flexDirection: "row",
    gap: 10,
  },
  allergyActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  allergyEditIcon: {
    color: COLORS.green,
    fontSize: 16,
  },
  allergyDeleteIcon: {
    color: "#FF3B30",
    fontSize: 18,
    fontWeight: "700",
  },
  commonAllergiesSection: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 30,
  },
  commonAllergiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  commonAllergyChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commonAllergyChipSelected: {
    backgroundColor: "#FFF4EC",
    borderColor: COLORS.orange,
  },
  commonAllergyText: {
    fontSize: 14,
    color: COLORS.chipText,
    fontWeight: "500",
  },
  commonAllergyTextSelected: {
    color: COLORS.orange,
  },
});

type PreferenceOptionItemProps = {
  id: string;
  label: string;
  isSelected: boolean;
  scale: Animated.Value;
  onSelect: (id: string) => void;
};

const PreferenceOptionItem = React.memo(
  ({ id, label, isSelected, scale, onSelect }: PreferenceOptionItemProps) => {
    const handlePress = useCallback(() => onSelect(id), [id, onSelect]);

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={[
            styles.optionItem,
            isSelected && styles.optionItemSelected,
          ]}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.optionLabel,
              isSelected && styles.optionLabelSelected,
            ]}
          >
            {label}
          </Text>
          <View
            style={[
              styles.radioOuter,
              isSelected && styles.radioOuterActive,
            ]}
          >
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

type AllergyTagProps = {
  index: number;
  label: string;
  isEditing: boolean;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
};

const AllergyTag = React.memo(
  ({ index, label, isEditing, onEdit, onDelete }: AllergyTagProps) => {
    const handleEdit = useCallback(() => onEdit(index), [index, onEdit]);
    const handleDelete = useCallback(() => onDelete(index), [index, onDelete]);

    return (
      <View
        style={[
          styles.allergyTag,
          isEditing && styles.allergyTagEditing,
        ]}
      >
        <Text style={styles.allergyTagText}>{label}</Text>
        <View style={styles.allergyActions}>
          <TouchableOpacity
            onPress={handleEdit}
            style={styles.allergyActionButton}
          >
            <Text style={styles.allergyEditIcon}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.allergyActionButton}
          >
            <Text style={styles.allergyDeleteIcon}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

type CommonAllergyChipProps = {
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
};

const CommonAllergyChip = React.memo(
  ({ label, selected, onSelect }: CommonAllergyChipProps) => {
    const handleSelect = useCallback(() => onSelect(label), [label, onSelect]);
    return (
      <TouchableOpacity
        style={[
          styles.commonAllergyChip,
          selected && styles.commonAllergyChipSelected,
        ]}
        onPress={handleSelect}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.commonAllergyText,
            selected && styles.commonAllergyTextSelected,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
);

type ProgressDotProps = {
  index: number;
  progressAnim: Animated.Value;
};

const ProgressDot = React.memo(
  ({ index, progressAnim }: ProgressDotProps) => (
    <Animated.View
      style={[
        styles.progressDot,
        {
          backgroundColor: progressAnim.interpolate({
            inputRange: [index - 0.5, index + 0.5],
            outputRange: ["#E0E0E0", COLORS.orange],
            extrapolate: "clamp",
          }),
        },
      ]}
    />
  )
);

export default OnboardingPreferences;
