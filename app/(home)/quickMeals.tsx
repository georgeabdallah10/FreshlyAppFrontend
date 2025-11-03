import RecipeItem from "@/components/meal/mealPreview";
import { useUser } from "@/context/usercontext";
import { askAI } from "@/src/home/chat";
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
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

type FormState = {
  ingredientSource: "pantry" | "outside";
  budget: 1 | 2 | 3 | null;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | null;
  goal: "loss" | "gain" | "prefs";
  speed: "fast" | "medium" | "leisure";
  difficulty: "easy" | "medium";
  cookingMethods: string[]; // multi-select
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
  primary: "#00A86B", // green
  accent: "#FD8100", // orange
  card: "#F6F7F9",
  border: "#E7EBEF",
  selectedTint: "#EAF7F1",
};

const TOTAL_PHASES = 6;

// ---- Option Row (radio / check) - MEMOIZED ----
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const OptionRow: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
  mode?: "radio" | "check";
}> = React.memo(({ label, selected, onPress, mode = "radio" }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();
  }, [scale]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <AnimatedTouchable
      activeOpacity={0.9}
      onPress={handlePress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[
        styles.option,
        { transform: [{ scale }] },
        selected && {
          backgroundColor: COLORS.selectedTint,
          borderColor: COLORS.primary,
        },
      ]}
    >
      <View
        style={[
          styles.radio,
          mode === "check" && { borderRadius: 6 },
          selected && {
            backgroundColor: COLORS.primary,
            borderColor: COLORS.primary,
          },
        ]}
      >
        {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
      <Text style={[styles.optionText, selected && { color: COLORS.primary }]}>
        {label}
      </Text>
    </AnimatedTouchable>
  );
});

// Add display name for debugging
OptionRow.displayName = "OptionRow";
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
        <Question animateKey={animateKey} title="Must include (optional)">
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={includeInput}
              onChangeText={onChangeIncludeInput}
              placeholder="e.g. Chicken, onion"
              returnKeyType="done"
              onSubmitEditing={addInclude}
            />
            <TouchableOpacity
              onPress={addInclude}
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color="#fff" />
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

        <Question animateKey={animateKey} title="Avoid ingredients (optional)">
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={avoidInput}
              onChangeText={onChangeAvoidInput}
              placeholder="e.g. Peanuts, dairy"
              returnKeyType="done"
              onSubmitEditing={addAvoid}
            />
            <TouchableOpacity
              onPress={addAvoid}
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color="#fff" />
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

        <Question animateKey={animateKey} title="Additional Instructions (optional)">
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={additionalInstructions}
            onChangeText={onChangeAdditionalInstructions}
            placeholder="e.g. Make it spicy, add extra garlic, use olive oil only"
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
  const { user, prefrences, pantryItems } = useUser();
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
  
  // Loading state for meal generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const spinnerRotation = useRef(new Animated.Value(0)).current;

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
  
  // Spinner rotation animation
  useEffect(() => {
    if (isGenerating) {
      spinnerRotation.setValue(0);
      Animated.loop(
        Animated.timing(spinnerRotation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinnerRotation.setValue(0);
    }
  }, [isGenerating, spinnerRotation]);
  
  // Progress simulator for loading state
  useEffect(() => {
    if (isGenerating) {
      setGenerationProgress(0);
      const interval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 95) return 95; // Cap at 95% until real completion
          return prev + Math.random() * 15;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setGenerationProgress(0);
    }
  }, [isGenerating]);

  // Start cooldown function
  const startCooldown = (seconds: number = 30) => {
    setIsButtonDisabled(true);
    setCooldownRemaining(seconds);
  };

  const JSON_DIRECTIVE = `
OUTPUT FORMAT (REQUIRED)
Return ONLY a valid, minified JSON object matching this exact TypeScript shape:

type IngredientSection = { title: string; items: string[] };

type RecipeCard = {
  headerSummary: string;                 // mention servings and dish type
  ingredients: IngredientSection[];      // group if useful, else one section with title: ""
  instructions: string[][];              // array of steps; each step is an array of 1–2 short sentences
  optionalAdditions: string[];           // 2–4 items
  finalNote: string;                     // friendly, one sentence
  pantryCheck: { usedFromPantry: string[] };
  shoppingListMinimal: string[];         // missing essentials only
};

Rules:
- No markdown, no code fences, no comments, no trailing commas.
- Use concise, realistic quantities scaled to choices_json.servings.
- Do not include allergens, disliked items, or avoidIngredients.
- Respect cookingMethods strictly if provided.
- Prefer items actually present in pantry_json (by name).
- If something is not applicable, use [] or "".
`;

  // wizard state
  const [phase, setPhase] = useState(0);
  const [includeInput, setIncludeInput] = useState("");
  const [avoidInput, setAvoidInput] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
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
  // Stable handlers for Phase 4 so TextInput keeps focus (no remounts)
  const addInclude = useCallback(() => {
    const trimmed = includeInput.trim();
    if (!trimmed) return;
    setForm((f) => ({
      ...f,
      includeIngredients: [...f.includeIngredients, trimmed],
    }));
    setIncludeInput("");
  }, [includeInput]);

  const removeInclude = useCallback((idx: number) => {
    setForm((f) => ({
      ...f,
      includeIngredients: f.includeIngredients.filter((_, i) => i !== idx),
    }));
  }, []);

  const addAvoid = useCallback(() => {
    const trimmed = avoidInput.trim();
    if (!trimmed) return;
    setForm((f) => ({
      ...f,
      avoidIngredients: [...f.avoidIngredients, trimmed],
    }));
    setAvoidInput("");
  }, [avoidInput]);

  const removeAvoid = useCallback((idx: number) => {
    setForm((f) => ({
      ...f,
      avoidIngredients: f.avoidIngredients.filter((_, i) => i !== idx),
    }));
  }, []);

  // ---- Animations ----
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_PHASES)).current;

  const animateProgress = useCallback(
    (to: number) => {
      Animated.timing(progressAnim, {
        toValue: to,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [progressAnim]
  );
  useEffect(() => {
    animateProgress((phase + 1) / TOTAL_PHASES);
  }, [phase, animateProgress]);

  // utils - wrapped in useCallback to maintain referential stability
  const setSingle = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    []
  );

  const next = useCallback(() => {
    Haptics.selectionAsync();
    setPhase((p) => Math.min(p + 1, TOTAL_PHASES - 1));
    // Hide meal component when navigating forward (in case user is going through phases again)
    if (showMealComponent) {
      setshowMealComponent(false);
    }
  }, [showMealComponent]);

  const back = useCallback(() => {
    Haptics.selectionAsync();
    if (phase === 0) {
      router.back();
    } else {
      setPhase((p) => Math.max(p - 1, 0));
      // Hide meal component when navigating back through phases
      if (showMealComponent) {
        setshowMealComponent(false);
      }
    }
  }, [phase, router, showMealComponent]);

  const finish = useCallback(async () => {
    if (isGenerating || isButtonDisabled) {
      if (cooldownRemaining > 0) {
        alert(`Please wait ${cooldownRemaining} seconds before trying again.`);
      }
      return;
    }

    Haptics.selectionAsync();
    setIsGenerating(true);
    setshowMealComponent(false); // Hide previous meal if any
    
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
      // Build a compact inputs block
      const inputsBlock = `preferences_json:
${JSON.stringify(prefrences)}

pantry_json:
${JSON.stringify(pantryItems)}

choices_json:
${JSON.stringify(payload)}
`;

      // SYSTEM: only hard, timeless rules
      const system_prompt = `
You are Freshly AI professional chef. Make sure to create real meals that are eatable and delicious. Return ONLY a valid, minified JSON object for one meal recipe that respects allergens, diet_codes, and the user's goal. Never invent pantry items. Respect allowed cookingMethods and any additional instructions provided by the user. No prose, no markdown, no comments. Provide all the following information about the meal you are about to create:
  name,
  icon,
  calories,
  prepTime,
  cookTime,
  totalTime,
  mealType,
  cuisine,
  difficulty,
  servings,
  goalFit,
  ingredients,
  instructions,
  cookingTools,
  notes,

CRITICAL: If the user provides additionalInstructions in choices_json, follow them EXACTLY. Incorporate them into the recipe generation.
`;
      // USER: inputs + JSON schema directive
      const user_prompt = `${inputsBlock}
${JSON_DIRECTIVE}`;

      // Call API with timeout
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

      // Log the entire AI response for debugging
      console.log('[QuickMeals] Full AI Response:', JSON.stringify(parsed, null, 2));
      console.log('[QuickMeals] AI Response name:', parsed?.name);
      console.log('[QuickMeals] AI Response ingredients:', parsed?.ingredients);

      // The AI returns a RecipeCard structure, we need to extract the flat fields
      // RecipeCard has: headerSummary, ingredients: IngredientSection[], instructions: string[][]
      
      // Extract name from headerSummary or fallback
      const name = String(parsed?.name || parsed?.headerSummary || 'Untitled Meal');
      const mt = String(parsed?.mealType || form.mealType || 'meal');
      const iconName = String(parsed?.icon || parsed?.iconName || 'restaurant');

      // Handle ingredients - RecipeCard format has ingredients as IngredientSection[]
      let ingredients: string[] = [];
      if (Array.isArray(parsed?.ingredients)) {
        // RecipeCard format: ingredients is array of { title: string, items: string[] }
        ingredients = parsed.ingredients.flatMap((section: any) => {
          if (typeof section === 'object' && section !== null && Array.isArray(section.items)) {
            // Extract items from each section
            return section.items.map((item: any) => String(item).trim()).filter(Boolean);
          } else if (typeof section === 'object' && section !== null) {
            // Old format: array of objects with name property
            return String(section.name || section.ingredient || '').trim();
          } else {
            // Simple string format
            return String(section).trim();
          }
        }).filter(Boolean);
      }
      
      // Handle instructions - RecipeCard format has instructions as string[][]
      let instructions: string[] = [];
      if (Array.isArray(parsed?.instructions)) {
        instructions = parsed.instructions.flatMap((step: any) => {
          if (Array.isArray(step)) {
            // RecipeCard format: each step is an array of sentences
            return step.map((s: any) => String(s).trim()).filter(Boolean).join(' ');
          }
          // Simple string format
          return String(step).trim();
        }).filter(Boolean);
      }
      
      console.log('[QuickMeals] Processed name:', name);
      console.log('[QuickMeals] Processed ingredients:', ingredients);
      console.log('[QuickMeals] Processed instructions:', instructions);

      // Prepare meal data for saving
      const mealData = {
        name,
        selectedEmoji: iconName,
        calories: parsed?.calories ?? 0,
        prepTime: parsed?.prepTime,
        cookTime: parsed?.cookTime,
        totalTime: parsed?.totalTime,
        mealtType: mt,
        cuisine: parsed?.cuisine ?? '',
        difficulty: parsed?.difficulty ?? form.difficulty ?? 'easy',
        servings: parsed?.servings ?? form.servings ?? 1,
        ingredients: ingredients,
        instructions: instructions,
        notes: parsed?.finalNote ?? parsed?.notes ?? '',
        protein: parsed?.macros?.protein ?? 0,
        fats: parsed?.macros?.fats ?? 0,
        carbs: parsed?.carbs ?? parsed?.macros?.carbs ?? 0,
      };

      setCurrentMeal({
        name,
        mealType: mt,
        iconName,
        ingredients,
        onPress: async () => { console.log('pressed'); },
        onSave: async () => {
          // This will be called when user taps "Save Meal"
          await handleSaveMeal(mealData);
        },
      });
      
      setGenerationProgress(100);
      setshowMealComponent(true);
    } catch (error: any) {
      console.error('[QuickMeals] Generation error:', error);
      
      let errorMessage = 'Unable to generate meal. ';
      const errorStr = error.message?.toLowerCase() || '';
      
      if (errorStr.includes('timeout')) {
        errorMessage = 'Request timed out. The AI is taking too long. Please try again with simpler preferences.';
        startCooldown(60);
      } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
        errorMessage = 'No internet connection. Please check your network and try again.';
        startCooldown(30);
      } else if (errorStr.includes('401')) {
        errorMessage = 'Session expired. Please log in again.';
        startCooldown(30);
      } else if (errorStr.includes('429')) {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
        startCooldown(120);
      } else if (errorStr.includes('500') || errorStr.includes('503')) {
        errorMessage = 'Server error. Please try again in a moment.';
        startCooldown(45);
      } else {
        errorMessage = 'Something went wrong generating your meal. Please try again.';
        startCooldown(30);
      }
      
      alert(errorMessage);
      setshowMealComponent(false);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
    // eslint-disable-next-line no-console
  }, [form, prefrences, pantryItems, JSON_DIRECTIVE, isGenerating, isButtonDisabled, cooldownRemaining]);

  async function handleSaveMeal(mealInput: any) {
    if (isSubmitting || isButtonDisabled) {
      throw new Error('Already saving or on cooldown');
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
    };

    setIsSubmitting(true);
    try {
      const res = await createMealForSignleUser(meal as any);
      console.log('[QuickMeals] Meal saved successfully:', res);
      // Success - no alert needed, animation handles it
    } catch (error: any) {
      startCooldown(30);
      console.error('[QuickMeals] Failed to save meal:', error);
      
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
      
      // Show alert and throw error for animation
      alert(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---- Phases ----
  const Phase0: React.FC<{ animateKey: number }> = useCallback(
    ({ animateKey }) => (
      <>
        <Question
          animateKey={animateKey}
          title="Where should we pull ingredients from?"
        >
          <OptionRow
            label="Pantry only"
            selected={form.ingredientSource === "pantry"}
            onPress={() => setSingle("ingredientSource", "pantry")}
          />
          <OptionRow
            label="Allow outside items"
            selected={form.ingredientSource === "outside"}
            onPress={() => setSingle("ingredientSource", "outside")}
          />
        </Question>

        <Question animateKey={animateKey} title="Which meal are you planning?">
          {(["breakfast", "lunch", "dinner", "snack", "dessert"] as const).map(
            (t) => (
              <OptionRow
                key={t}
                label={t[0].toUpperCase() + t.slice(1)}
                selected={form.mealType === t}
                onPress={() => setSingle("mealType", t)}
              />
            )
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
            selected={form.budget === 1}
            onPress={() => setSingle("budget", 1 as 1 | 2 | 3)}
          />
          <OptionRow
            label="Balanced cost"
            selected={form.budget === 2}
            onPress={() => setSingle("budget", 2 as 1 | 2 | 3)}
          />
          <OptionRow
            label="Premium or specialty"
            selected={form.budget === 3}
            onPress={() => setSingle("budget", 3 as 1 | 2 | 3)}
          />
        </Question>

        <Question animateKey={animateKey} title="How much time do you have?">
          <OptionRow
            label="Quick (≤ 15m)"
            selected={form.speed === "fast"}
            onPress={() => setSingle("speed", "fast")}
          />
          <OptionRow
            label="Normal (≤ 25m)"
            selected={form.speed === "medium"}
            onPress={() => setSingle("speed", "medium")}
          />
          <OptionRow
            label="Takes time (≤ 40m)"
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
            selected={form.goal === "loss"}
            onPress={() => setSingle("goal", "loss")}
          />
          <OptionRow
            label="Gain weight"
            selected={form.goal === "gain"}
            onPress={() => setSingle("goal", "gain")}
          />
          <OptionRow
            label="Use my saved preferences"
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
          title="Which cooking methods do you have access to?"
        >
          {["stovetop", "oven", "microwave", "airfryer", "nocook"].map((m) => (
            <OptionRow
              key={m}
              mode="check"
              label={
                m === "nocook"
                  ? "No appliances available"
                  : m === "airfryer"
                  ? "Air fryer"
                  : m[0].toUpperCase() + m.slice(1)
              }
              selected={form.cookingMethods.includes(m)}
              onPress={() =>
                setForm((f) => {
                  const has = f.cookingMethods.includes(m);
                  return {
                    ...f,
                    cookingMethods: has
                      ? f.cookingMethods.filter((x) => x !== m)
                      : [...f.cookingMethods, m],
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
        setForm((f) => ({ ...f, servings: Math.min(f.servings + 1, 12) }));
      }, []);

      const decrement = useCallback(() => {
        setForm((f) => ({ ...f, servings: Math.max(f.servings - 1, 1) }));
      }, []);

      return (
        <>
          <Question animateKey={animateKey} title="How many servings?">
            <View style={styles.servingsRow}>
              <TouchableOpacity
                style={styles.stepper}
                onPress={decrement}
                disabled={form.servings <= 1}
              >
                <Text
                  style={[
                    styles.stepperSymbol,
                    form.servings <= 1 && { color: "#CCC" },
                  ]}
                >
                  −
                </Text>
              </TouchableOpacity>
              <Text style={styles.servings}>{form.servings}</Text>
              <TouchableOpacity
                style={styles.stepper}
                onPress={increment}
                disabled={form.servings >= 12}
              >
                <Text
                  style={[
                    styles.stepperSymbol,
                    form.servings >= 12 && { color: "#CCC" },
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
          </Question>

          <Question animateKey={animateKey} title="Review your choices">
            <View style={styles.review}>
              <ReviewRow k="Source" v={form.ingredientSource} />
              <ReviewRow
                k="Budget"
                v={form.budget ? "$".repeat(form.budget) : "—"}
              />
              <ReviewRow
                k="Meal"
                v={
                  form.mealType
                    ? form.mealType[0].toUpperCase() + form.mealType.slice(1)
                    : "—"
                }
              />
              <ReviewRow k="Goal" v={form.goal} />
              <ReviewRow k="Speed" v={form.speed} />
              <ReviewRow k="Difficulty" v={form.difficulty} />
              <ReviewRow
                k="Methods"
                v={form.cookingMethods.join(", ") || "—"}
              />
              <ReviewRow k="Servings" v={String(form.servings)} />
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
      // phase 4 is rendered via Phase4Block directly (stable component)
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={isGenerating}
        >
          <Ionicons name="arrow-back" size={22} color={isGenerating ? "#CCC" : COLORS.sub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Meals</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Progress */}
      <View style={styles.track}>
        <Animated.View style={[styles.bar, { width: progressWidth }]} />
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
        <View style={styles.MealComponentContainer}>
          {showMealComponent ? (
            <RecipeItem
              name={currentMeal.name}
              iconName="apps-outline"
              mealType={currentMeal.mealType}
              onPress={currentMeal.onPress}
              onSave={currentMeal.onSave}
              ingredients={currentMeal.ingredients}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Footer nav */}
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
            size={18}
            color={phase === 0 || isGenerating ? "#B8C1C7" : COLORS.primary}
          />
          <Text
            style={[
              styles.btnGhostText, 
              (phase === 0 || isGenerating) && { color: "#B8C1C7" }
            ]}
          >
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (phase === TOTAL_PHASES - 1 ? finish() : next())}
          style={[
            styles.btnSolid,
            (isGenerating || isButtonDisabled) && { opacity: 0.6 }
          ]}
          disabled={isGenerating || isButtonDisabled}
        >
          <Text style={styles.btnSolidText}>
            {phase === TOTAL_PHASES - 1 
              ? (isGenerating ? "Generating..." : "Generate Meal")
              : "Next"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Loading Overlay */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <View style={styles.loadingSpinnerContainer}>
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
            </View>
            <Text style={styles.loadingTitle}>Creating Your Meal</Text>
            <Text style={styles.loadingSubtitle}>
              Our AI chef is crafting the perfect recipe...
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <View 
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
            <Text style={styles.loadingHint}>
              This may take up to 45 seconds
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

/* ---------- Presentational bits ---------- */
const Question: React.FC<{
  title: string;
  children: React.ReactNode;
  animateKey: number;
}> = React.memo(({ title, children, animateKey }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const prevAnimateKey = useRef(animateKey);

  useEffect(() => {
    // Only animate if the animateKey actually changed
    if (prevAnimateKey.current !== animateKey) {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      prevAnimateKey.current = animateKey;
    }
  }, [animateKey, opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <Text style={styles.question}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </Animated.View>
  );
});

Question.displayName = "Question";

const Tag: React.FC<{
  label: string;
  onRemove: () => void;
  tone?: "positive" | "danger";
}> = React.memo(({ label, onRemove, tone = "positive" }) => (
  <TouchableOpacity
    onPress={onRemove}
    style={[
      styles.tag,
      tone === "positive"
        ? { backgroundColor: COLORS.selectedTint, borderColor: COLORS.primary }
        : { backgroundColor: "#FFECEC", borderColor: "#FFCDCD" },
    ]}
  >
    <Text
      style={[
        styles.tagText,
        tone === "positive" ? { color: COLORS.primary } : { color: "#C93333" },
      ]}
    >
      {label} ×
    </Text>
  </TouchableOpacity>
));

Tag.displayName = "Tag";

const ReviewRow: React.FC<{ k: string; v: string }> = React.memo(({ k, v }) => (
  <View style={styles.row}>
    <Text style={styles.rowK}>{k}</Text>
    <Text style={styles.rowV}>{v}</Text>
  </View>
));

ReviewRow.displayName = "ReviewRow";

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  MealComponentContainer: {
    width: 350,
    height: "auto",
    marginLeft: -19,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: COLORS.sub },
  track: {
    height: 6,
    backgroundColor: "#EEF2F5",
    marginHorizontal: 16,
    borderRadius: 6,
    overflow: "hidden",
  },
  bar: {
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
  },
  scrollInner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
    alignItems: "center",
    gap: 12,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  question: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  optionText: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.bg,
  },
  inputWithButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tokens: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tag: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: { fontSize: 13, fontWeight: "800" },

  servingsRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperSymbol: { fontSize: 22, color: COLORS.text, lineHeight: 22 },
  servings: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    minWidth: 32,
    textAlign: "center",
  },

  review: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.bg,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowK: { fontSize: 14, color: COLORS.sub },
  rowV: { fontSize: 14, fontWeight: "800", color: COLORS.primary },

  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: Platform.OS === "ios" ? 28 : 16,
    flexDirection: "row",
    gap: 12,
  },
  btnGhost: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.bg,
  },
  btnGhostDisabled: {
    borderColor: "#DDE6E3",
    backgroundColor: "#F4F7F6",
  },
  btnGhostText: { fontSize: 16, fontWeight: "800", color: COLORS.primary },

  btnSolid: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.accent,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  btnSolidText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  counter: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 6 : 2,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 10,
    color: "#A7B0B5",
    letterSpacing: 1,
  },
  
  // Loading overlay styles
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "85%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingSpinnerContainer: {
    marginBottom: 24,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: "#E8F5E9",
    borderTopColor: COLORS.primary,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 15,
    color: COLORS.sub,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  progressBarContainer: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  progressBarTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "#E8F5E9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  loadingHint: {
    fontSize: 12,
    color: COLORS.sub,
    textAlign: "center",
    marginTop: 16,
    opacity: 0.7,
  },
});

export default QuickMealsCreateScreen;
