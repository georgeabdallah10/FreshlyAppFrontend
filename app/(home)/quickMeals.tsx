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
};

type CurrentMeal = {
  name: string;
  mealType: string;
  iconName: string;
  ingredients: string[];
  onPress: () => void;
  onSave: () => void;
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
  includeIngredients: string[];
  avoidIngredients: string[];
  onChangeIncludeInput: (t: string) => void;
  onChangeAvoidInput: (t: string) => void;
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
    includeIngredients,
    avoidIngredients,
    onChangeIncludeInput,
    onChangeAvoidInput,
    addInclude,
    removeInclude,
    addAvoid,
    removeAvoid,
  }) => {
    return (
      <>
        <Question animateKey={animateKey} title="Must include (optional)">
          <TextInput
            style={styles.input}
            value={includeInput}
            onChangeText={onChangeIncludeInput}
            placeholder="e.g. Chicken, onion"
            returnKeyType="done"
            onSubmitEditing={addInclude}
          />
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
          <TextInput
            style={styles.input}
            value={avoidInput}
            onChangeText={onChangeAvoidInput}
            placeholder="e.g. Peanuts, dairy"
            returnKeyType="done"
            onSubmitEditing={addAvoid}
          />
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
    onSave: () => {},
  });
  const [showMealComponent, setshowMealComponent] = useState(false);

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
  }, []);

  const back = useCallback(() => {
    Haptics.selectionAsync();
    if (phase === 0) router.back();
    else setPhase((p) => Math.max(p - 1, 0));
  }, [phase, router]);

  async function   handleSaveMeal(mealInput: any){
    const meal = {
      id: Date.now(),
      name: mealInput.trim(),
      image: mealInput.selectedEmoji,
      calories: parseInt(mealInput.calories),
      prepTime: mealInput.prepTime ? parseInt(mealInput.prepTime) : undefined,
      cookTime: mealInput.cookTime ? parseInt(mealInput.cookTime) : undefined,
      totalTime: mealInput.totalTime || undefined,
      mealType: mealInput.mealtType,
      cuisine: mealInput.cuisine.trim() || undefined,
      macros: {
        protein: mealInput.protein ? parseInt(mealInput.protein) : 0,
        fats: mealInput.fats ? parseInt(mealInput.fats) : 0,
        carbs: mealInput.carbs ? parseInt(mealInput.carbs) : 0,
      },
      difficulty: mealInput?.difficulty,
      servings: mealInput.servings ? parseInt(mealInput.servings) : undefined,
      ingredients: mealInput.ingredients
        .filter((i: any) => i.trim())
        .map((item: any, index: any) => ({
          id: index + 1,
          name: item.trim(),
          amount: 1,
          unit: 'unit',
        })),
      instructions: mealInput.instructions.filter((i: any) => i.trim()),
      notes: mealInput.notes.trim() || undefined,
      isFavorite: false,
    };
    const res = await createMealForSignleUser(meal)
    if (!res.ok){
      console.log(`ERROR,${res}`)
    }
    console.log(res)

  }

  const finish = useCallback(async () => {
    Haptics.selectionAsync();
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
You are Freshly AI professional chef.Make sure to have a real meals that is eatable and delicious .Return ONLY a valid, minified JSON object for one meal recipe that respects allergens, diet_codes, and the user's goal. Never invent pantry items. Respect allowed cookingMethods. No prose, no markdown, no comments. provide all the follwoing informaiton about the meal you are about to create,   
  name,
  icon,
  calories,
  prepTime:,
  cookTime,
  totalTime,
  mealType,
  cuisine,
  difficulty,
  servings,
  goalFit,
  ingredients
  instructions,
  cookingTools,
  notes,
`;
    // USER: inputs + JSON schema directive
    const user_prompt = `${inputsBlock}
${JSON_DIRECTIVE}`;

    // Call API
    const res = await askAI({ system: system_prompt, prompt: user_prompt });
    const test = JSON.parse(res);
    console.log(test);
    const ingredients: string[] = Array.isArray(test.ingredients)
      ? test.ingredients.map((s: any) => String(s).trim()).filter(Boolean)
      : [];
    setCurrentMeal({
      name: test.name,
      mealType: test.mealType,
      iconName: test.iconName,
      ingredients: ingredients,
      onPress: () => console.log("pressed"),
      onSave: () => console.log("Leave"),
    });
    setshowMealComponent(true);
    await handleSaveMeal(test)
    // eslint-disable-next-line no-console
  }, [form]);

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
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.sub} />
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
      >
        <View style={{ width: "100%" }}>
          {phase === 4 ? (
            <Phase4Block
              animateKey={phase}
              includeInput={includeInput}
              avoidInput={avoidInput}
              includeIngredients={form.includeIngredients}
              avoidIngredients={form.avoidIngredients}
              onChangeIncludeInput={setIncludeInput}
              onChangeAvoidInput={setAvoidInput}
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
          style={[styles.btnGhost, phase === 0 && styles.btnGhostDisabled]}
          disabled={phase === 0}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={phase === 0 ? "#B8C1C7" : COLORS.primary}
          />
          <Text
            style={[styles.btnGhostText, phase === 0 && { color: "#B8C1C7" }]}
          >
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (phase === TOTAL_PHASES - 1 ? finish() : next())}
          style={styles.btnSolid}
        >
          <Text style={styles.btnSolidText}>
            {phase === TOTAL_PHASES - 1 ? "Generate Meal" : "Next"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
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
});

export default QuickMealsCreateScreen;
