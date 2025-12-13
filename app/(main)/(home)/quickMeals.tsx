import RecipeItem from "@/components/meal/mealPreview";
import { useUser } from "@/context/usercontext";
import { askAI } from "@/src/home/chat";
import { getMealImage } from "@/src/services/mealImageService";
import { createMealForSignleUser } from "@/src/user/meals";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type FormState = {
  ingredientSource: "pantry" | "outside";
  budget: 1 | 2 | 3 | null;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | null;
  goal: "loss" | "gain" | "prefs";
  speed: "fast" | "medium" | "leisure";
  difficulty: "easy" | "medium";
  cookingMethods: string[];
  includeIngredients: string[];
  avoidIngredients: string[];
  servings: number;
  additionalInstructions: string;
};

type CurrentMeal = {
  name: string;
  mealType: string;
  iconName: string;
  ingredients: string[];
  onPress: () => void | Promise<void>;
  onSave: () => Promise<void>;
};

const COLORS = {
  bg: "#FFFFFF",
  text: "#111214",
  sub: "#6B7280",
  grey: "#4C4D59",
  primary: "#00A86B",
  accent: "#FD8100",
  card: "#F8F9FA",
  border: "#E5E7EB",
  selectedTint: "#E8F5EF",
  selectedBorder: "#B8E6D5",
  dangerTint: "#FFF1F0",
  dangerBorder: "#FFCCC7",
  disabled: "#D1D5DB",
};

const TOTAL_PHASES = 6;

// ---- Enhanced Option Row with better visual feedback ----
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const OptionRow: React.FC<{
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  mode?: "radio" | "check";
  icon?: keyof typeof Ionicons.glyphMap;
}> = React.memo(({ label, description, selected, onPress, mode = "radio", icon }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkmarkScale, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [selected, checkmarkScale]);

  const pressIn = useCallback(() => {
    Haptics.selectionAsync();
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [scale]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [scale]);

  return (
    <AnimatedTouchable
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[
        styles.option,
        { transform: [{ scale }] },
        selected && styles.optionSelected,
      ]}
    >
      <View
        style={[
          styles.radio,
          mode === "check" && styles.checkbox,
          selected && styles.radioSelected,
        ]}
      >
        <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
          <Ionicons 
            name={mode === "check" ? "checkmark-sharp" : "checkmark"} 
            size={mode === "check" ? 18 : 16} 
            color="#fff" 
          />
        </Animated.View>
      </View>
      {icon && (
        <Ionicons 
          name={icon} 
          size={20} 
          color={selected ? COLORS.primary : COLORS.sub} 
          style={{ marginLeft: -4 }}
        />
      )}
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
      {description ? (
        <Text style={[styles.optionDescription, selected && styles.optionDescriptionSelected]}>
          {description}
        </Text>
      ) : null}
    </AnimatedTouchable>
  );
});

OptionRow.displayName = "OptionRow";

// ---- Enhanced Phase 4 Block ----
type Phase4Props = {
  animateKey: number;
  includeInput: string;
  avoidInput: string;
  additionalInstructions: string;
  includeIngredients: string[];
  avoidIngredients: string[];
  onChangeIncludeInput: (t: string) => void;
  onChangeAvoidInput: (t: string) => void;
  onChangeAdditionalInstructions: (t: string) => void;
  addInclude: () => void;
  removeInclude: (idx: number) => void;
  addAvoid: () => void;
  removeAvoid: (idx: number) => void;
};

const Phase4Block: React.FC<Phase4Props> = React.memo(
  ({
    animateKey,
    includeInput,
    avoidInput,
    additionalInstructions,
    includeIngredients,
    avoidIngredients,
    onChangeIncludeInput,
    onChangeAvoidInput,
    onChangeAdditionalInstructions,
    addInclude,
    removeInclude,
    addAvoid,
    removeAvoid,
  }) => {
    return (
      <>
        <Question animateKey={animateKey} title="Include specific ingredients">
          <Text style={styles.helperText}>
            Add ingredients you want in your meal (optional)
          </Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={includeInput}
              onChangeText={onChangeIncludeInput}
              placeholder="e.g., Chicken, garlic, spinach"
              placeholderTextColor="#9CA3AF"
              returnKeyType="done"
              onSubmitEditing={addInclude}
            />
            <TouchableOpacity
              onPress={addInclude}
              style={[styles.addButton, !includeInput.trim() && styles.addButtonDisabled]}
              disabled={!includeInput.trim()}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          {includeIngredients.length > 0 && (
            <View style={styles.tokens}>
              {includeIngredients.map((ing, i) => (
                <Tag
                  key={i}
                  label={ing}
                  onRemove={() => removeInclude(i)}
                  tone="positive"
                />
              ))}
            </View>
          )}
        </Question>

        <Question animateKey={animateKey} title="Avoid ingredients">
          <Text style={styles.helperText}>
            List ingredients to exclude from your meal (optional)
          </Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={avoidInput}
              onChangeText={onChangeAvoidInput}
              placeholder="e.g., Peanuts, dairy, shellfish"
              placeholderTextColor="#9CA3AF"
              returnKeyType="done"
              onSubmitEditing={addAvoid}
            />
            <TouchableOpacity
              onPress={addAvoid}
              style={[styles.addButton, styles.addButtonDanger, !avoidInput.trim() && styles.addButtonDisabled]}
              disabled={!avoidInput.trim()}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          {avoidIngredients.length > 0 && (
            <View style={styles.tokens}>
              {avoidIngredients.map((ing, i) => (
                <Tag
                  key={i}
                  label={ing}
                  onRemove={() => removeAvoid(i)}
                  tone="danger"
                />
              ))}
            </View>
          )}
        </Question>

        <Question animateKey={animateKey} title="Additional instructions">
          <Text style={styles.helperText}>
            Any special requests or cooking preferences (optional)
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={additionalInstructions}
            onChangeText={onChangeAdditionalInstructions}
            placeholder="e.g., Make it spicy, extra crispy, low sodium"
            placeholderTextColor="#9CA3AF"
            returnKeyType="default"
            multiline
            numberOfLines={4}
          />
        </Question>
      </>
    );
  }
);
Phase4Block.displayName = "Phase4Block";

const QuickMealsCreateScreen: React.FC = () => {
  const router = useRouter();
  const userContext = useUser();
  
  const user = userContext?.user;
  const prefrences = userContext?.prefrences;
  const pantryItems = userContext?.pantryItems ?? [];
  
  const [currentMeal, setCurrentMeal] = useState<CurrentMeal>({
    name: "",
    mealType: "",
    iconName: "",
    ingredients: [],
    onPress: () => {},
    onSave: async () => {},
  });
  const [showMealComponent, setshowMealComponent] = useState(false);

  // Rate limiting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Loading state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const spinnerRotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Track if meal was successfully generated (for button disabling)
  const [mealGenerated, setMealGenerated] = useState(false);
  const isGenerateDisabled = useMemo(
    () => isGenerating || isButtonDisabled,
    [isGenerating, isButtonDisabled]
  );

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(cooldownRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (cooldownRemaining === 0 && isButtonDisabled) {
      setIsButtonDisabled(false);
    }
  }, [cooldownRemaining, isButtonDisabled]);
  
  // Enhanced spinner animation
  useEffect(() => {
    if (isGenerating) {
      spinnerRotation.setValue(0);
      Animated.parallel([
        Animated.loop(
          Animated.timing(spinnerRotation, {
            toValue: 1,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.08,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      spinnerRotation.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [isGenerating, spinnerRotation, pulseAnim]);
  
  // Progress simulator
  useEffect(() => {
    if (isGenerating) {
      setGenerationProgress(0);
      const interval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 95) return 95;
          return prev + Math.random() * 15;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setGenerationProgress(0);
    }
  }, [isGenerating]);

  const startCooldown = (seconds: number = 30) => {
    setIsButtonDisabled(true);
    setCooldownRemaining(seconds);
  };

  const JSON_DIRECTIVE = `
OUTPUT FORMAT (REQUIRED)
Return ONLY a valid, minified JSON object matching this exact TypeScript shape:

type IngredientSection = { title: string; items: string[] };

type RecipeCard = {
  name: string;
  icon: string;
  calories: number;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";
  cuisine: string;
  difficulty: "Easy" | "Medium" | "Hard";
  servings: number;
  protein: number;
  fats: number;
  carbs: number;
  headerSummary: string;
  ingredients: IngredientSection[];
  instructions: string[][];
  optionalAdditions: string[];
  finalNote: string;
  pantryCheck: { usedFromPantry: string[] };
  shoppingListMinimal: string[];
};

Rules:
- No markdown, no code fences, no comments, no trailing commas.
- NUTRITIONAL DATA: Provide accurate macros and calories based on real recipes.
- Use concise, realistic quantities scaled to choices_json.servings.
- Do not include allergens, disliked items, or avoidIngredients.
- Respect cookingMethods strictly if provided.
- Prefer items actually present in pantry_json (by name).
- If something is not applicable, use [] or "".
- Ensure all numeric nutritional fields are present and realistic.
`;

  // Wizard state
  const [phase, setPhase] = useState(0);
  const [includeInput, setIncludeInput] = useState("");
  const [avoidInput, setAvoidInput] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [families, setFamilies] = useState<Array<{ id: number; name: string }>>([]);
  const [form, setForm] = useState<FormState>({
    ingredientSource: "pantry",
    budget: null,
    mealType: null,
    goal: "prefs",
    speed: "medium",
    difficulty: "easy",
    cookingMethods: ["stovetop"],
    includeIngredients: [],
    avoidIngredients: [],
    servings: 2,
    additionalInstructions: "",
  });

  // Stable handlers for Phase 4
  const addInclude = useCallback(() => {
    const trimmed = includeInput.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setForm((f) => ({
      ...f,
      includeIngredients: [...f.includeIngredients, trimmed],
    }));
    setIncludeInput("");
  }, [includeInput]);

  const removeInclude = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setForm((f) => ({
      ...f,
      includeIngredients: f.includeIngredients.filter((_, i) => i !== idx),
    }));
  }, []);

  const addAvoid = useCallback(() => {
    const trimmed = avoidInput.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setForm((f) => ({
      ...f,
      avoidIngredients: [...f.avoidIngredients, trimmed],
    }));
    setAvoidInput("");
  }, [avoidInput]);

  const removeAvoid = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setForm((f) => ({
      ...f,
      avoidIngredients: f.avoidIngredients.filter((_, i) => i !== idx),
    }));
  }, []);

  // Progress animation
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_PHASES)).current;

  const animateProgress = useCallback(
    (to: number) => {
      Animated.timing(progressAnim, {
        toValue: to,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [progressAnim]
  );

  useEffect(() => {
    animateProgress((phase + 1) / TOTAL_PHASES);
  }, [phase, animateProgress]);

  // Load families
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const { listMyFamilies } = await import('@/src/user/family');
        const data = await listMyFamilies();
        const familyList = Array.isArray(data) ? data.map((f: any) => ({
          id: f.id,
          name: f.display_name || f.name || 'Family'
        })) : [];
        setFamilies(familyList);
      } catch (error) {
        console.log('[QuickMeals] Failed to load families:', error);
      }
    };
    loadFamilies();
  }, []);

  const setSingle = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    []
  );

  const next = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase((p) => Math.min(p + 1, TOTAL_PHASES - 1));
    if (showMealComponent) {
      setshowMealComponent(false);
    }
    // Reset meal generated state when navigating to next phase
    setMealGenerated(false);
  }, [showMealComponent]);

  const goHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(main)/(home)/main");
  }, [router]);

  const back = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (phase === 0) {
      router.back();
    } else {
      setPhase((p) => Math.max(p - 1, 0));
      if (showMealComponent) {
        setshowMealComponent(false);
      }
      // Reset meal generated state when navigating back
      setMealGenerated(false);
    }
  }, [phase, router, showMealComponent]);

  const finish = useCallback(async () => {
    if (isGenerating || isButtonDisabled) {
      if (cooldownRemaining > 0) {
        alert(`Please wait ${cooldownRemaining} seconds before trying again.`);
      }
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsButtonDisabled(true);
    setIsGenerating(true);
    setshowMealComponent(false);
    setMealGenerated(false);

    let triggeredCooldown = false;
    try {
      const payload = {
        ingredientSource: form.ingredientSource,
        budget: form.budget,
        mealType: form.mealType,
        goal: form.goal,
        speed: form.speed,
        difficulty: form.difficulty,
        cookingMethods: form.cookingMethods,
        includeIngredients: form.includeIngredients,
        avoidIngredients: form.avoidIngredients,
        servings: form.servings,
        additionalInstructions: form.additionalInstructions,
      };

      const inputsBlock = `preferences_json:
${JSON.stringify(prefrences)}

pantry_json:
${JSON.stringify(pantryItems)}

choices_json:
${JSON.stringify(payload)}
`;

      // Check cooking method choices for LLM guidance
      const useAllMethods = form.cookingMethods.includes("all");
      const useBasicMethods = form.cookingMethods.includes("basic");
      const cookingMethodsInstruction = useAllMethods
        ? "\n\nUser selected all available cooking methods. You may use any reasonable household technique that fits the recipe."
        : useBasicMethods
          ? "\n\nUser chose basic cooking methods. Provide easy beginner-friendly cooking steps using simple techniques like boiling, sautéing, baking, pan-frying, steaming, or air-frying. The steps must be short and straightforward."
          : "";

      const system_prompt = `
You are Savr AI professional chef. Make sure to create real meals that are eatable and delicious. Return ONLY a valid, minified JSON object for one meal recipe that respects allergens, diet_codes, and the user's goal. Never invent pantry items. Respect allowed cookingMethods and any additional instructions provided by the user. No prose, no markdown, no comments.

NUTRITIONAL ACCURACY IS CRITICAL:
- Calculate calories, protein, fats, and carbs from actual ingredient quantities in the recipe
- Provide realistic, scientifically-based nutritional data
- Scale all nutritional values to the total recipe servings
- Do not estimate or invent nutritional data
- Ensure macros align with the calorie total (1g protein/carbs = 4cal, 1g fat = 9cal)

CRITICAL: If the user provides additionalInstructions in choices_json, follow them EXACTLY. Incorporate them into the recipe generation.${cookingMethodsInstruction}
`;

      const user_prompt = `${inputsBlock}
${JSON_DIRECTIVE}`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 45000)
      );
      
      const apiPromise = askAI({ system: system_prompt, prompt: user_prompt });
      const res = await Promise.race([apiPromise, timeoutPromise]);

      let parsed: any = null;
      try {
        parsed = typeof res === 'string' ? JSON.parse(res) : res;
      } catch (e) {
        console.log('[QuickMeals] Non-JSON AI response:', res);
        alert('Sorry, the meal generator returned an unexpected format. Please try again.');
        startCooldown(30);
        return;
      }

      const name = String(parsed?.name || parsed?.headerSummary || 'Untitled Meal');
      const mt = String(parsed?.mealType || form.mealType || 'meal');
      const iconName = String(parsed?.icon || parsed?.iconName || 'restaurant');

      const extractNumeric = (value: any, defaultVal: number = 0): number => {
        const num = parseInt(String(value), 10);
        return isNaN(num) || num < 0 ? defaultVal : num;
      };

      const calories = extractNumeric(parsed?.calories, 500);
      const prepTime = extractNumeric(parsed?.prepTime, 10);
      const cookTime = extractNumeric(parsed?.cookTime, 15);
      const totalTime = extractNumeric(parsed?.totalTime, prepTime + cookTime);
      const protein = extractNumeric(parsed?.protein, 20);
      const fats = extractNumeric(parsed?.fats, 15);
      const carbs = extractNumeric(parsed?.carbs, 50);
      const servings = extractNumeric(parsed?.servings, form.servings || 2);
      const cuisine = String(parsed?.cuisine || '').trim();
      const difficulty = (['Easy', 'Medium', 'Hard'].includes(parsed?.difficulty) 
        ? parsed.difficulty 
        : form.difficulty || 'Easy');

      let ingredients: string[] = [];
      if (Array.isArray(parsed?.ingredients)) {
        ingredients = parsed.ingredients.flatMap((section: any) => {
          if (typeof section === 'object' && section !== null && Array.isArray(section.items)) {
            return section.items.map((item: any) => String(item).trim()).filter(Boolean);
          } else if (typeof section === 'object' && section !== null) {
            return String(section.name || section.ingredient || '').trim();
          } else {
            return String(section).trim();
          }
        }).filter(Boolean);
      }
      
      let instructions: string[] = [];
      if (Array.isArray(parsed?.instructions)) {
        instructions = parsed.instructions.flatMap((step: any) => {
          if (Array.isArray(step)) {
            return step.map((s: any) => String(s).trim()).filter(Boolean).join(' ');
          }
          return String(step).trim();
        }).filter(Boolean);
      }

      const mealData = {
        name,
        selectedEmoji: iconName,
        calories,
        prepTime,
        cookTime,
        totalTime,
        mealtType: mt,
        cuisine,
        difficulty,
        servings,
        ingredients: ingredients,
        instructions: instructions,
        notes: parsed?.finalNote ?? parsed?.notes ?? '',
        protein,
        fats,
        carbs,
      };

      setCurrentMeal({
        name,
        mealType: mt,
        iconName,
        ingredients,
        onPress: async () => { console.log('pressed'); },
        onSave: async () => {
          await handleSaveMeal(mealData);
        },
      });
      
      setGenerationProgress(100);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setshowMealComponent(true);
      // Mark meal as generated to disable the button
      setMealGenerated(true);
      // Brief cooldown after success to avoid spamming
      startCooldown(10);
      triggeredCooldown = true;
    } catch (error: any) {
      console.log('[QuickMeals] Generation error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      let errorMessage = 'Unable to generate meal. ';
      const errorStr = error.message?.toLowerCase() || '';
      
      if (errorStr.includes('timeout')) {
        errorMessage = 'Request timed out. The AI is taking too long. Please try again with simpler preferences.';
        startCooldown(60);
        triggeredCooldown = true;
      } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
        errorMessage = 'No internet connection. Please check your network and try again.';
        startCooldown(30);
        triggeredCooldown = true;
      } else if (errorStr.includes('401')) {
        errorMessage = 'Session expired. Please log in again.';
        startCooldown(30);
        triggeredCooldown = true;
      } else if (errorStr.includes('429')) {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
        startCooldown(120);
        triggeredCooldown = true;
      } else if (errorStr.includes('500') || errorStr.includes('503')) {
        errorMessage = 'Server error. Please try again in a moment.';
        startCooldown(45);
        triggeredCooldown = true;
      } else {
        errorMessage = 'Something went wrong generating your meal. Please try again.';
        startCooldown(30);
        triggeredCooldown = true;
      }
      
      alert(errorMessage);
      setshowMealComponent(false);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      if (!triggeredCooldown) {
        setIsButtonDisabled(false);
      }
    }
  }, [form, prefrences, pantryItems, JSON_DIRECTIVE, isGenerating, isButtonDisabled, cooldownRemaining]);

  async function handleSaveMeal(mealInput: any) {
    if (isSubmitting || isButtonDisabled) {
      console.log('Already saving or on cooldown');
    }

    const normalizeMealType = (mt?: string) => {
      const s = String(mt || '').toLowerCase();
      const map: Record<string, 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert'> = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snack: 'Snack',
        dessert: 'Dessert',
      };
      return map[s] || 'Dinner';
    };

    const normalizeDifficulty = (d?: string) => {
      const s = String(d || '').toLowerCase();
      const map: Record<string, 'Easy' | 'Medium' | 'Hard'> = {
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',
      };
      return map[s] || 'Easy';
    };

    const safeName = typeof mealInput?.name === 'string' ? mealInput.name.trim() : 'Untitled Meal';

    let familyId: number | undefined;
    if (families.length > 0) {
      familyId = families[0].id;
    }

    const meal = {
      id: Date.now(),
      name: safeName,
      image: mealInput?.selectedEmoji ?? '🍽️',
      calories: parseInt(String(mealInput?.calories ?? 0)),
      prepTime: mealInput?.prepTime ? parseInt(String(mealInput.prepTime)) : undefined,
      cookTime: mealInput?.cookTime ? parseInt(String(mealInput.cookTime)) : undefined,
      totalTime: mealInput?.totalTime ?? undefined,
      mealType: normalizeMealType(mealInput?.mealtType ?? mealInput?.mealType),
      cuisine: typeof mealInput?.cuisine === 'string' ? mealInput.cuisine.trim() : undefined,
      macros: {
        protein: mealInput?.protein ? parseInt(String(mealInput.protein)) : 0,
        fats: mealInput?.fats ? parseInt(String(mealInput.fats)) : 0,
        carbs: mealInput?.carbs ? parseInt(String(mealInput.carbs)) : 0,
      },
      difficulty: normalizeDifficulty(mealInput?.difficulty),
      servings: mealInput?.servings ? parseInt(String(mealInput.servings)) : undefined,
      ingredients: Array.isArray(mealInput?.ingredients)
        ? mealInput.ingredients
            .map((item: any) => ({
              name: String(item).trim(),
              amount: '1',
              inPantry: false,
            }))
            .filter((i: any) => i.name)
        : [],
      instructions: Array.isArray(mealInput?.instructions)
        ? mealInput.instructions.map((i: any) => String(i)).filter(Boolean)
        : [],
      notes: typeof mealInput?.notes === 'string' ? mealInput.notes.trim() : undefined,
      isFavorite: false,
      family_id: familyId,
    };

    setIsSubmitting(true);
    try {
      // Generate and upload image to Supabase, then save URL to meal
      console.log('[QuickMeals] Generating image for meal:', meal.name);
      const imageUrl = await getMealImage(meal.name);

      if (imageUrl) {
        meal.image = imageUrl;
        console.log('[QuickMeals] Image URL saved to meal:', imageUrl);
      } else {
        console.warn('[QuickMeals] Image generation failed, using emoji fallback');
        // Keep the emoji fallback already set in meal.image
      }

      const res = await createMealForSignleUser(meal as any);
      console.log('[QuickMeals] Meal saved successfully:', res);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      startCooldown(30);
      console.log('[QuickMeals] Failed to save meal:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      let errorMessage = 'Unable to save meal. ';
      const errorStr = error.message?.toLowerCase() || '';
      
      if (errorStr.includes('network') || errorStr.includes('fetch')) {
        errorMessage = 'No internet connection. Please check your network and try again.';
      } else if (errorStr.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (errorStr.includes('401')) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (errorStr.includes('409')) {
        errorMessage = 'A meal with this name already exists. Please use a different name.';
      } else if (errorStr.includes('422')) {
        errorMessage = 'Invalid meal data. Please check all required fields.';
      } else if (errorStr.includes('429')) {
        startCooldown(120);
        errorMessage = 'Too many requests. Please wait before trying again.';
      } else if (errorStr.includes('500') || errorStr.includes('503')) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        errorMessage = 'Failed to save meal. Please try again.';
      }
      
      alert(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---- Phase Components with enhanced icons ----
  const Phase0: React.FC<{ animateKey: number }> = useCallback(
    ({ animateKey }) => (
      <>
        <Question
          animateKey={animateKey}
          title="Where should we pull ingredients from?"
        >
          <OptionRow
            label="Pantry only"
            icon="home"
            selected={form.ingredientSource === "pantry"}
            onPress={() => setSingle("ingredientSource", "pantry")}
          />
          <OptionRow
            label="Allow outside items"
            icon="cart"
            selected={form.ingredientSource === "outside"}
            onPress={() => setSingle("ingredientSource", "outside")}
          />
        </Question>

        <Question animateKey={animateKey} title="Which meal are you planning?">
          {(["breakfast", "lunch", "dinner", "snack", "dessert"] as const).map(
            (t) => {
              const icons = {
                breakfast: "sunny" as const,
                lunch: "restaurant" as const,
                dinner: "moon" as const,
                snack: "fast-food" as const,
                dessert: "ice-cream" as const,
              };
              return (
                <OptionRow
                  key={t}
                  icon={icons[t]}
                  label={t[0].toUpperCase() + t.slice(1)}
                  selected={form.mealType === t}
                  onPress={() => setSingle("mealType", t)}
                />
              );
            }
          )}
        </Question>
      </>
    ),
    [form.ingredientSource, form.mealType, setSingle]
  );

  const Phase1: React.FC<{ animateKey: number }> = useCallback(
    ({ animateKey }) => (
      <>
        <Question animateKey={animateKey} title="What's your ideal meal budget?">
          <OptionRow
            label="Cheap and simple"
            icon="cash-outline"
            selected={form.budget === 1}
            onPress={() => setSingle("budget", 1 as 1 | 2 | 3)}
          />
          <OptionRow
            label="Balanced cost"
            icon="wallet-outline"
            selected={form.budget === 2}
            onPress={() => setSingle("budget", 2 as 1 | 2 | 3)}
          />
          <OptionRow
            label="Premium or specialty"
            icon="diamond-outline"
            selected={form.budget === 3}
            onPress={() => setSingle("budget", 3 as 1 | 2 | 3)}
          />
        </Question>

        <Question animateKey={animateKey} title="How much time do you have?">
          <OptionRow
            label="Quick (≤ 15 min)"
            icon="flash"
            selected={form.speed === "fast"}
            onPress={() => setSingle("speed", "fast")}
          />
          <OptionRow
            label="Normal (≤ 25 min)"
            icon="time"
            selected={form.speed === "medium"}
            onPress={() => setSingle("speed", "medium")}
          />
          <OptionRow
            label="Takes time (≤ 40 min)"
            icon="hourglass"
            selected={form.speed === "leisure"}
            onPress={() => setSingle("speed", "leisure")}
          />
        </Question>
      </>
    ),
    [form.budget, form.speed, setSingle]
  );

  const Phase2: React.FC<{ animateKey: number }> = useCallback(
    ({ animateKey }) => (
      <>
        <Question
          animateKey={animateKey}
          title="What's the goal for this meal?"
        >
          <OptionRow
            label="Lose weight"
            icon="trending-down"
            selected={form.goal === "loss"}
            onPress={() => setSingle("goal", "loss")}
          />
          <OptionRow
            label="Gain weight"
            icon="trending-up"
            selected={form.goal === "gain"}
            onPress={() => setSingle("goal", "gain")}
          />
          <OptionRow
            label="Use my saved preferences"
            icon="heart"
            selected={form.goal === "prefs"}
            onPress={() => setSingle("goal", "prefs")}
          />
        </Question>
      </>
    ),
    [form.goal, setSingle]
  );

  const Phase3: React.FC<{ animateKey: number }> = useCallback(
    ({ animateKey }) => (
      <>
        <Question
          animateKey={animateKey}
          title="Which cooking methods do you have?"
        >
          {[
            { key: "all", label: "All available methods", icon: "" as const, },
            { key: "stovetop", label: "Stovetop", icon: "flame" as const },
            { key: "oven", label: "Oven", icon: "business" as const },
            { key: "microwave", label: "Microwave", icon: "radio-outline" as const },
            { key: "airfryer", label: "Air fryer", icon: "airplane" as const },
            { key: "nocook", label: "No appliances", icon: "close-circle-outline" as const },
          ].map((m) => (
            <OptionRow
              key={m.key}
              mode="check"
              label={m.label}
              selected={form.cookingMethods.includes(m.key)}
              onPress={() =>
                setForm((f) => {
                  const has = f.cookingMethods.includes(m.key);
                  return {
                    ...f,
                    cookingMethods: has
                      ? f.cookingMethods.filter((x) => x !== m.key)
                      : [...f.cookingMethods, m.key],
                  };
                })
              }
            />
          ))}
        </Question>
      </>
    ),
    [form.cookingMethods]
  );

  const Phase5: React.FC<{ animateKey: number }> = useCallback(
    ({ animateKey }) => {
      const increment = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setForm((f) => ({ ...f, servings: Math.min(f.servings + 1, 12) }));
      }, []);

      const decrement = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setForm((f) => ({ ...f, servings: Math.max(f.servings - 1, 1) }));
      }, []);

      return (
        <>
          <Question animateKey={animateKey} title="How many servings?">
            <View style={styles.servingsRow}>
              <TouchableOpacity
                style={[
                  styles.stepper,
                  form.servings <= 1 && styles.stepperDisabled
                ]}
                onPress={decrement}
                disabled={form.servings <= 1}
              >
                <Ionicons 
                  name="remove" 
                  size={22} 
                  color={form.servings <= 1 ? COLORS.disabled : COLORS.grey}
                />
              </TouchableOpacity>
              <View style={styles.servingsDisplay}>
                <Text style={styles.servings}>{form.servings}</Text>
                <Text style={styles.servingsLabel}>
                  {form.servings === 1 ? "serving" : "servings"}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.stepper,
                  form.servings >= 12 && styles.stepperDisabled
                ]}
                onPress={increment}
                disabled={form.servings >= 12}
              >
                <Ionicons 
                  name="add" 
                  size={22} 
                  color={form.servings >= 12 ? COLORS.disabled : COLORS.grey}
                />
              </TouchableOpacity>
            </View>
          </Question>

          <Question animateKey={animateKey} title="Review your choices">
            <View style={styles.review}>
              <ReviewRow 
                icon="home" 
                k="Source" 
                v={form.ingredientSource === "pantry" ? "Pantry only" : "Outside items"} 
              />
              <ReviewRow
                icon="wallet-outline"
                k="Budget"
                v={form.budget ? "$".repeat(form.budget) : "Not set"}
              />
              <ReviewRow
                icon="restaurant"
                k="Meal"
                v={
                  form.mealType
                    ? form.mealType[0].toUpperCase() + form.mealType.slice(1)
                    : "Not set"
                }
              />
              <ReviewRow 
                icon="heart" 
                k="Goal" 
                v={form.goal === "loss" ? "Lose weight" : form.goal === "gain" ? "Gain weight" : "My preferences"} 
              />
              <ReviewRow 
                icon="time" 
                k="Speed" 
                v={form.speed === "fast" ? "≤ 15 min" : form.speed === "medium" ? "≤ 25 min" : "≤ 40 min"} 
              />
              <ReviewRow 
                icon="flame" 
                k="Methods" 
                v={form.cookingMethods.length > 0 ? `${form.cookingMethods.length} selected` : "None"} 
              />
              <ReviewRow 
                icon="people" 
                k="Servings" 
                v={`${form.servings} ${form.servings === 1 ? "serving" : "servings"}`} 
              />
            </View>
          </Question>
        </>
      );
    },
    [form]
  );

  const PhaseComponent = useMemo(() => {
    switch (phase) {
      case 0:
        return Phase0;
      case 1:
        return Phase1;
      case 2:
        return Phase2;
      case 3:
        return Phase3;
      case 5:
        return Phase5;
      default:
        return Phase0;
    }
  }, [phase, Phase0, Phase1, Phase2, Phase3, Phase5]);

  const progressWidth = useMemo(
    () =>
      progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
      }),
    [progressAnim]
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            onPress={back}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={isGenerating}
            style={styles.headerButton}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isGenerating ? COLORS.disabled : COLORS.grey} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Quick Meals</Text>
          <Text style={styles.headerSubtitle}>
            Step {phase + 1} of {TOTAL_PHASES}
          </Text>
        </View>
        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            onPress={goHome}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={isGenerating}
            style={styles.headerButton}
          >
            <Ionicons
              name="home-outline"
              size={22}
              color={isGenerating ? COLORS.disabled : COLORS.grey}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, { width: progressWidth }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isGenerating}
      >
        <View style={{ width: "100%" }}>
          {phase === 4 ? (
            <Phase4Block
              animateKey={phase}
              includeInput={includeInput}
              avoidInput={avoidInput}
              additionalInstructions={additionalInstructions}
              includeIngredients={form.includeIngredients}
              avoidIngredients={form.avoidIngredients}
              onChangeIncludeInput={setIncludeInput}
              onChangeAvoidInput={setAvoidInput}
              onChangeAdditionalInstructions={setAdditionalInstructions}
              addInclude={addInclude}
              removeInclude={removeInclude}
              addAvoid={addAvoid}
              removeAvoid={removeAvoid}
            />
          ) : (
            <PhaseComponent animateKey={phase} />
          )}
        </View>
        
        {showMealComponent && (
          <View style={styles.mealComponentContainer}>
            <RecipeItem
              name={currentMeal.name}
              iconName="apps-outline"
              mealType={currentMeal.mealType}
              onPress={currentMeal.onPress}
              onSave={currentMeal.onSave}
              ingredients={currentMeal.ingredients}
            />
          </View>
        )}
      </ScrollView>

      {/* Enhanced Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={back}
          style={[
            styles.btnGhost, 
            (phase === 0 || isGenerating) && styles.btnGhostDisabled
          ]}
          disabled={phase === 0 || isGenerating}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            colxor={phase === 0 || isGenerating ? COLORS.disabled : COLORS.primary}
          />
          <Text
            style={[
              styles.btnGhostText, 
              (phase === 0 || isGenerating) && styles.btnGhostTextDisabled
            ]}
          >
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (phase === TOTAL_PHASES - 1 ? finish() : next())}
          style={[
            styles.btnSolid,
            isGenerateDisabled && styles.btnSolidDisabled
          ]}
          disabled={isGenerateDisabled}
        >
          <Text style={styles.btnSolidText}>
            {phase === TOTAL_PHASES - 1
              ? (isGenerating
                  ? "Generating..."
                  : mealGenerated
                    ? "Generate Meal"
                    : "Generate Meal")
              : "Next"}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Enhanced Loading Overlay */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Animated.View 
              style={[
                styles.loadingSpinnerContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Animated.View 
                style={[
                  styles.loadingSpinner,
                  {
                    transform: [{
                      rotate: spinnerRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    }],
                  },
                ]} 
              />
              <View style={styles.spinnerCore} />
            </Animated.View>
            <Text style={styles.loadingTitle}>Creating Your Perfect Meal</Text>
            <Text style={styles.loadingSubtitle}>
              SAVR AI chef is analyzing your preferences and crafting a delicious recipe...
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <Animated.View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${Math.min(generationProgress, 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(Math.min(generationProgress, 100))}%
              </Text>
            </View>

          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

/* ---------- Presentational Components ---------- */
const Question: React.FC<{
  title: string;
  children: React.ReactNode;
  animateKey: number;
}> = React.memo(({ title, children, animateKey }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const prevAnimateKey = useRef(animateKey);

  useEffect(() => {
    if (prevAnimateKey.current !== animateKey) {
      opacity.setValue(0);
      translateY.setValue(20);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      prevAnimateKey.current = animateKey;
    }
  }, [animateKey, opacity, translateY]);

  return (
    <Animated.View 
      style={[
        styles.card, 
        { 
          opacity,
          transform: [{ translateY }]
        }
      ]}
    >
      <Text style={styles.question}>{title}</Text>
      <View style={styles.optionsContainer}>{children}</View>
    </Animated.View>
  );
});

Question.displayName = "Question";

const Tag: React.FC<{
  label: string;
  onRemove: () => void;
  tone?: "positive" | "danger";
}> = React.memo(({ label, onRemove, tone = "positive" }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onRemove());
  };

  return (
    <AnimatedTouchable
      onPress={handlePress}
      style={[
        styles.tag,
        { transform: [{ scale }] },
        tone === "positive" ? styles.tagPositive : styles.tagDanger,
      ]}
    >
      <Text
        style={[
          styles.tagText,
          tone === "positive" ? styles.tagTextPositive : styles.tagTextDanger,
        ]}
      >
        {label}
      </Text>
      <Ionicons 
        name="close-circle" 
        size={16} 
        color={tone === "positive" ? COLORS.primary : "#EF4444"}
        style={{ marginLeft: 4 }}
      />
    </AnimatedTouchable>
  );
});

Tag.displayName = "Tag";

const ReviewRow: React.FC<{ 
  icon: keyof typeof Ionicons.glyphMap;
  k: string; 
  v: string;
}> = React.memo(({ icon, k, v }) => (
  <View style={styles.row}>
    <View style={styles.rowLeft}>
      <Ionicons name={icon} size={18} color={COLORS.sub} />
      <Text style={styles.rowK}>{k}</Text>
    </View>
    <Text style={styles.rowV}>{v}</Text>
  </View>
));

ReviewRow.displayName = "ReviewRow";

/* ---------- Enhanced Styles ---------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    width: 52,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: { 
    fontSize: 17, 
    fontWeight: "700", 
    color: COLORS.grey,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.sub,
    marginTop: 2,
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: 52,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
  },
  track: {
    height: 6,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    overflow: "hidden",
  },
  bar: {
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
    alignItems: "center",
    gap: 16,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  question: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  helperText: {
    fontSize: 14,
    color: COLORS.sub,
    marginBottom: 14,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionSelected: {
    backgroundColor: COLORS.selectedTint,
    borderColor: COLORS.selectedBorder,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkbox: {
    borderRadius: 8,
  },
  radioSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: { 
    flex: 1,
    fontSize: 16, 
    fontWeight: "600", 
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  optionDescription: {
    flexBasis: "100%",
    marginTop: 4,
    fontSize: 13,
    color: COLORS.sub,
  },
  optionDescriptionSelected: {
    color: COLORS.primary,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  inputWithButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  addButtonDanger: {
    backgroundColor: "#EF4444",
  },
  addButtonDisabled: {
    backgroundColor: COLORS.disabled,
    shadowOpacity: 0,
  },
  tokens: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 10, 
    marginTop: 12 
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagPositive: {
    backgroundColor: COLORS.selectedTint,
    borderColor: COLORS.selectedBorder,
  },
  tagDanger: {
    backgroundColor: COLORS.dangerTint,
    borderColor: COLORS.dangerBorder,
  },
  tagText: { 
    fontSize: 14, 
    fontWeight: "600",
  },
  tagTextPositive: {
    color: COLORS.primary,
  },
  tagTextDanger: {
    color: "#EF4444",
  },

  servingsRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    gap: 24,
    paddingVertical: 8,
  },
  stepper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  servingsDisplay: {
    alignItems: "center",
    minWidth: 80,
  },
  servings: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: -1,
  },
  servingsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.sub,
    marginTop: 2,
  },

  review: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    backgroundColor: COLORS.card,
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowK: { 
    fontSize: 15, 
    fontWeight: "600",
    color: COLORS.sub 
  },
  rowV: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: COLORS.primary 
  },

  footer: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: Platform.OS === "ios" ? 36 : 20,
    flexDirection: "row",
    gap: 12,
  },
  btnGhost: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.bg,
  },
  btnGhostDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  btnGhostText: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: COLORS.primary 
  },
  btnGhostTextDisabled: {
    color: COLORS.disabled,
  },

  btnSolid: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnSolidDisabled: {
    opacity: 0.5,
  },
  btnSolidText: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#fff" 
  },
  
  mealComponentContainer: {
    width: "100%",
    marginTop: 8,
  },

  // Enhanced Loading Overlay
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17, 18, 20, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 28,
    padding: 36,
    alignItems: "center",
    width: "88%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  loadingSpinnerContainer: {
    marginBottom: 28,
    position: "relative",
  },
  loadingSpinner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 5,
    borderColor: "#E8F5EF",
    borderTopColor: COLORS.primary,
  },
  spinnerCore: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.selectedTint,
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  loadingSubtitle: {
    fontSize: 15,
    color: COLORS.sub,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  progressBarContainer: {
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  progressBarTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "#E8F5EF",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: "100%",
    justifyContent: "center",
  },
  loadingHint: {
    fontSize: 13,
    color: COLORS.sub,
    fontWeight: "500",
  },
});

export default QuickMealsCreateScreen;
