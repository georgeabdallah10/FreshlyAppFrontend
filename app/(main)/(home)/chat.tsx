import ToastBanner from "@/components/generalMessage";
import { useUser } from "@/context/usercontext";
import { createMealForSignleUser, type CreateMealInput } from "@/src/user/meals";
import { getMealImage } from "@/src/services/mealImageService";
import {
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  sendMessage,
  updateConversationTitle,
  type Conversation
} from "@/src/home/chat";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Stable id for chat messages
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type PantryItem = {
  id: number;
  name: string;
  quantity: number;
  category: string;
};

type IngredientSection = {
  title: string;
  items: string[];
};

export type RecipeCard = {
  mealName: string;
  headerSummary: string;
  cuisine: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings: number;
  calories: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  proteinGrams: number;
  fatGrams: number;
  carbGrams: number;
  notes: string;
  ingredients: IngredientSection[];
  instructions: string[][];
  optionalAdditions: string[];
  finalNote: string;
  pantryCheck: { usedFromPantry: string[] };
  shoppingListMinimal: string[];
};

type ChatMessage =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "ai_text"; text: string; isTyping?: boolean }
  | { id: string; kind: "ai_recipe"; recipe: RecipeCard };

const OUTPUT_FORMAT_MARKER = "\n\nOUTPUT FORMAT (REQUIRED)";

const IMAGE_PROMPT_MARKERS = [
  "a delicious, appetizing photo of",
  "professional photograph of",
  "clean white background",
  "restaurant-style presentation",
];

const IMAGE_RESPONSE_MARKERS = [
  '"image_url"',
  '"imageurl"',
  '"b64_json"',
  "generate-image",
  "generated image url",
  "dall-e",
];

const IMAGE_FILE_EXTENSION_REGEX = /\.(png|jpe?g|gif|webp|svg)$/i;

const isLikelyImageUrl = (value?: string | null): boolean => {
  if (!value) {
    return false;
  }
  const candidate = value.trim();
  if (!candidate) {
    return false;
  }
  if (candidate.startsWith("data:image/")) {
    return true;
  }
  if (!candidate.startsWith("http")) {
    return false;
  }
  if (IMAGE_FILE_EXTENSION_REGEX.test(candidate)) {
    return true;
  }
  if (candidate.includes("supabase.co/storage")) {
    return true;
  }
  return false;
};

const isImageGenerationContent = (rawContent?: string | null): boolean => {
  if (!rawContent) {
    return false;
  }

  const content = rawContent.trim();
  if (!content) {
    return false;
  }

  const lower = content.toLowerCase();

  if (IMAGE_PROMPT_MARKERS.some((marker) => lower.includes(marker))) {
    return true;
  }

  if (IMAGE_RESPONSE_MARKERS.some((marker) => lower.includes(marker))) {
    return true;
  }

  if (isLikelyImageUrl(content)) {
    return true;
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      const candidateValues: Array<unknown> = [
        (parsed as any).url,
        (parsed as any).image_url,
        (parsed as any).imageUrl,
      ];

      const dataField = (parsed as any).data;
      if (Array.isArray(dataField)) {
        for (const entry of dataField) {
          if (entry?.url) {
            candidateValues.push(entry.url);
          }
          if (entry?.b64_json) {
            candidateValues.push(`data:image/png;base64,${entry.b64_json}`);
          }
        }
      }

      if (
        candidateValues.some(
          (value) => typeof value === "string" && isLikelyImageUrl(value)
        )
      ) {
        return true;
      }

      if (
        Array.isArray(dataField) &&
        dataField.some((entry) => typeof entry?.b64_json === "string")
      ) {
        return true;
      }
    }
  } catch {
    // Not JSON, ignore
  }

  return false;
};

const cleanUserPromptText = (raw?: string | null): string => {
  if (!raw) {
    return "";
  }

  let content = raw.replace(/^\s*USER:\s*/i, "");
  const markerIndex = content.indexOf(OUTPUT_FORMAT_MARKER);
  if (markerIndex > 0) {
    content = content.substring(0, markerIndex);
  }
  return content.trim();
};

const findFirstUserPrompt = (
  messages: Array<{ role?: string; content?: string }>
): string | null => {
  for (const msg of messages) {
    if ((msg.role || "").toLowerCase() === "user") {
      const cleaned = cleanUserPromptText(msg.content);
      if (cleaned) {
        return cleaned;
      }
    }
  }
  return null;
};

const INGREDIENT_DESCRIPTOR_KEYWORDS = [
  "chopped",
  "diced",
  "minced",
  "sliced",
  "shredded",
  "grated",
  "crushed",
  "peeled",
  "halved",
  "quartered",
  "julienned",
  "rinsed",
  "drained",
  "mashed",
  "pureed",
  "roasted",
  "toasted",
  "steamed",
  "cooked",
  "uncooked",
  "raw",
  "softened",
  "melted",
];

const descriptorCorePattern = INGREDIENT_DESCRIPTOR_KEYWORDS.join("|");
const descriptorSuffixPattern = new RegExp(
  `^(.*)\\s+((?:[a-z-]+\\s+)*(?:${descriptorCorePattern}))$`,
  "i"
);

const capitalizeDescriptorPhrase = (phrase: string) =>
  phrase
    .split(/\s+/)
    .filter(Boolean)
    .map((word, idx) =>
      idx === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()
    )
    .join(" ");

const reorderIngredientDescriptor = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const commaParts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length > 1) {
    const ingredientPart = commaParts[0];
    const descriptorPart = commaParts.slice(1).join(" ").trim();
    if (ingredientPart && descriptorPart) {
      return `${capitalizeDescriptorPhrase(descriptorPart)} ${ingredientPart}`.trim();
    }
  }

  const suffixMatch = trimmed.match(descriptorSuffixPattern);
  if (suffixMatch) {
    const ingredientPart = suffixMatch[1]?.trim();
    const descriptorPart = suffixMatch[2]?.trim();
    if (ingredientPart && descriptorPart) {
      return `${capitalizeDescriptorPhrase(descriptorPart)} ${ingredientPart}`.trim();
    }
  }

  return trimmed;
};

const normalizeIngredientName = (value: string) =>
  reorderIngredientDescriptor(value.replace(/^of\s+/i, "").trim());

// Helper to parse ingredient strings into structured data
function parseIngredientToJson(ingredient: string) {
  const cleaned = ingredient?.trim() ?? "";

  if (!cleaned) {
    return { ingredient_name: "", quantity: "", unit: "" };
  }

  const quantityPattern = "(\\d+(?:\\.\\d+)?|\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+)";
  const unitPattern =
    "(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|g|grams?|kg|kilograms?|ml|l|liters?|oz|ounces?|lbs?|pounds?)";

  const patterns = [
    new RegExp(`^${quantityPattern}\\s*${unitPattern}(?:\\s+of)?\\s+(.+)$`, "i"),
    new RegExp(`^(.+?)\\s*-\\s*${quantityPattern}\\s*${unitPattern}$`, "i"),
    new RegExp(`^${quantityPattern}\\s+(.+)$`, "i"),
  ];

  for (const [index, pattern] of patterns.entries()) {
    const match = cleaned.match(pattern);
    if (!match) continue;

    if (index === 0) {
      return {
        ingredient_name: normalizeIngredientName(match[3]),
        quantity: match[1],
        unit: match[2].toLowerCase(),
      };
    }

    if (index === 1) {
      return {
        ingredient_name: normalizeIngredientName(match[1]),
        quantity: match[2],
        unit: match[3].toLowerCase(),
      };
    }

    return {
      ingredient_name: normalizeIngredientName(match[2]),
      quantity: match[1],
      unit: "",
    };
  }

  return {
    ingredient_name: normalizeIngredientName(cleaned),
    quantity: "",
    unit: "",
  };
}

// Animated Text Component for typing effect (memoized)
const AnimatedTypingTextBase = ({ text }: { text: string }) => {
  useEffect(() => {
    console.log("MOUNT typing");
    return () => console.log("UNMOUNT typing");
  }, []);
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setDisplayedText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const t = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((i) => i + 1);
      }, 35);
      return () => clearTimeout(t);
    }
  }, [index, text]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.Text style={[styles.messageText, { opacity: fadeAnim }]}>
      {displayedText}
    </Animated.Text>
  );
};
const AnimatedTypingText = React.memo(AnimatedTypingTextBase);

function extractJson(s: string) {
  const trimmed = s
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  return trimmed;
}

function tryParseRecipe(s: string): RecipeCard | null {
  try {
    const obj = JSON.parse(extractJson(s));
    const hasCoreFields =
      typeof obj?.mealName === "string" &&
      typeof obj?.headerSummary === "string" &&
      typeof obj?.cuisine === "string" &&
      typeof obj?.mealType === "string" &&
      typeof obj?.difficulty === "string" &&
      typeof obj?.servings === "number" &&
      typeof obj?.calories === "number" &&
      typeof obj?.prepTimeMinutes === "number" &&
      typeof obj?.cookTimeMinutes === "number" &&
      typeof obj?.totalTimeMinutes === "number" &&
      typeof obj?.proteinGrams === "number" &&
      typeof obj?.fatGrams === "number" &&
      typeof obj?.carbGrams === "number" &&
      typeof obj?.notes === "string" &&
      Array.isArray(obj?.ingredients) &&
      Array.isArray(obj?.instructions) &&
      Array.isArray(obj?.optionalAdditions) &&
      Array.isArray(obj?.shoppingListMinimal) &&
      obj?.pantryCheck &&
      Array.isArray(obj?.pantryCheck?.usedFromPantry);

    if (hasCoreFields) {
      return obj as RecipeCard;
    }

    const legacyShape =
      typeof obj?.headerSummary === "string" &&
      Array.isArray(obj?.ingredients) &&
      Array.isArray(obj?.instructions);

    if (legacyShape) {
      const fallbackName = obj.headerSummary;
      return {
        mealName: fallbackName,
        headerSummary: fallbackName,
        cuisine: obj.cuisine || "Fusion",
        mealType: (obj.mealType as RecipeCard['mealType']) || 'Dinner',
        difficulty: (obj.difficulty as RecipeCard['difficulty']) || 'Easy',
        servings: Number(obj.servings) || 2,
        calories: Number(obj.calories) || 400,
        prepTimeMinutes: Number(obj.prepTimeMinutes) || 10,
        cookTimeMinutes: Number(obj.cookTimeMinutes) || 15,
        totalTimeMinutes: Number(obj.totalTimeMinutes) || 25,
        proteinGrams: Number(obj.proteinGrams) || 20,
        fatGrams: Number(obj.fatGrams) || 18,
        carbGrams: Number(obj.carbGrams) || 35,
        notes: obj.notes || "",
        ingredients: obj.ingredients,
        instructions: obj.instructions,
        optionalAdditions: obj.optionalAdditions || [],
        finalNote: obj.finalNote || "",
        pantryCheck: obj.pantryCheck || { usedFromPantry: [] },
        shoppingListMinimal: obj.shoppingListMinimal || [],
      } as RecipeCard;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/** --- HOISTED: TypingIndicator (memoized) --- */
const TypingIndicator = React.memo(function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.typingIndicator}>
      <Animated.View
        style={[
          styles.typingDot,
          {
            opacity: dot1,
            transform: [
              {
                translateY: dot1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.typingDot,
          {
            opacity: dot2,
            transform: [
              {
                translateY: dot2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.typingDot,
          {
            opacity: dot3,
            transform: [
              {
                translateY: dot3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
});

/** --- HOISTED: RecipeCardView (memoized) --- */
type RecipeCardViewProps = {
  data: RecipeCard;
  onMatchGrocery: (r: RecipeCard) => void;
  onSaveMeal: (r: RecipeCard) => void;
  isSaving?: boolean;
};

function RecipeCardViewBase({ data, onMatchGrocery, onSaveMeal, isSaving = false }: RecipeCardViewProps) {
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(30)).current;
  const title = data.mealName?.trim() || data.headerSummary?.trim() || "AI Meal";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardSlideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageBubble,
        styles.aiMessage,
        styles.cardRoot,
        { opacity: cardFadeAnim, transform: [{ translateY: cardSlideAnim }] },
      ]}
    >
      <Text style={styles.headerSummaryText}>{title}</Text>

      <View style={styles.metaChipsRow}>
        <View style={styles.metaChip}>
          <Ionicons name="restaurant" size={14} color="#00A86B" />
          <Text style={styles.metaChipText}>{data.mealType}</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="earth-outline" size={14} color="#FD8100" />
          <Text style={styles.metaChipText}>{data.cuisine}</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="barbell" size={14} color="#2563EB" />
          <Text style={styles.metaChipText}>{data.difficulty}</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="people-outline" size={14} color="#6B7280" />
          <Text style={styles.metaChipText}>{data.servings} serving{data.servings === 1 ? '' : 's'}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Calories</Text>
          <Text style={styles.statValue}>{Math.round(data.calories)} kcal</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Protein</Text>
          <Text style={styles.statValue}>{Math.round(data.proteinGrams)} g</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Fats</Text>
          <Text style={styles.statValue}>{Math.round(data.fatGrams)} g</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Carbs</Text>
          <Text style={styles.statValue}>{Math.round(data.carbGrams)} g</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Prep</Text>
          <Text style={styles.timeValue}>{data.prepTimeMinutes} min</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Cook</Text>
          <Text style={styles.timeValue}>{data.cookTimeMinutes} min</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Total</Text>
          <Text style={styles.timeValue}>{data.totalTimeMinutes} min</Text>
        </View>
      </View>

      {data.notes ? (
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Chef Notes</Text>
          <Text style={styles.bulletText}>{data.notes}</Text>
        </View>
      ) : null}

      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {data.ingredients.map((sec, i) => (
          <View key={i} style={{ marginTop: 8 }}>
            {!!sec.title && <Text style={styles.subTitle}>{sec.title}</Text>}
            {sec.items.map((line, j) => (
              <Text key={j} style={styles.bulletText}>• {line}</Text>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        {data.instructions.map((stepLines, idx) => (
          <View key={idx} style={{ marginTop: 10 }}>
            <Text style={styles.stepNumber}>{idx + 1}.</Text>
            {stepLines.map((ln, k) => (
              <Text key={k} style={styles.bulletText}>{ln}</Text>
            ))}
          </View>
        ))}
      </View>

      {data.optionalAdditions?.length ? (
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Optional Additions</Text>
          {data.optionalAdditions.map((ln, i) => (
            <Text key={i} style={styles.bulletText}>• {ln}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Pantry Check</Text>
        <Text style={styles.bulletText}>
          Used from pantry: {data.pantryCheck?.usedFromPantry?.join(", ") || "None"}
        </Text>
      </View>

      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Shopping List (Minimal)</Text>
        {data.shoppingListMinimal?.length ? (
          data.shoppingListMinimal.map((ln, i) => (
            <Text key={i} style={styles.bulletText}>• {ln}</Text>
          ))
        ) : (
          <Text style={styles.bulletText}>Nothing needed</Text>
        )}
      </View>

      {data.finalNote ? (
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Final Note</Text>
          <Text style={styles.bulletText}>{data.finalNote}</Text>
        </View>
      ) : null}

      <View style={styles.cardActionsRow}>
        <TouchableOpacity
          style={[styles.matchGroceryButton, styles.cardActionButton]}
          onPress={() => onMatchGrocery(data)}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={20} color="#FFF" />
          <Text style={styles.matchGroceryText}>Match My Grocery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveMealButton, styles.cardActionButton, isSaving && styles.saveMealButtonDisabled]}
          onPress={() => onSaveMeal(data)}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#00A86B" />
          ) : (
            <>
              <Ionicons name="bookmark-outline" size={20} color="#00A86B" />
              <Text style={styles.saveMealText}>Save Meal</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
const RecipeCardView = React.memo(RecipeCardViewBase);

export default function ChatAIScreen() {
  const { prefrences, isInFamily, families } = useUser();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [message, setMessage] = useState("");
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"camera" | "gallery" | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Conversation management state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | undefined>();
  const [showConversationList, setShowConversationList] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const conversationSlideAnim = useRef(new Animated.Value(-300)).current;
  const [firstPrompts, setFirstPrompts] = useState<Record<number, string>>({});
  const firstPromptsRef = useRef(firstPrompts);
  const firstPromptFetchesRef = useRef<Partial<Record<number, Promise<void>>>>({});

  useEffect(() => {
    firstPromptsRef.current = firstPrompts;
  }, [firstPrompts]);

  const setFirstPromptForConversation = useCallback((conversationId: number, prompt: string) => {
    const sanitized = prompt.trim();
    if (!sanitized || firstPromptsRef.current[conversationId]) {
      return;
    }
    firstPromptsRef.current[conversationId] = sanitized;
    setFirstPrompts((prev) => ({
      ...prev,
      [conversationId]: sanitized,
    }));
  }, []);

  const ensureFirstPrompt = useCallback(
    async (conversationId: number) => {
      if (firstPromptsRef.current[conversationId]) {
        return firstPromptsRef.current[conversationId];
      }
      if (firstPromptFetchesRef.current[conversationId]) {
        await firstPromptFetchesRef.current[conversationId];
        return firstPromptsRef.current[conversationId];
      }

      const fetchPromise = (async () => {
        try {
          const { messages } = await getConversation(conversationId);
          const prompt = findFirstUserPrompt(messages);
          if (prompt) {
            setFirstPromptForConversation(conversationId, prompt);
          }
        } catch (error) {
          console.error(
            `[ChatAI] Failed to prefetch first prompt for conversation ${conversationId}:`,
            error
          );
        }
      })();

      firstPromptFetchesRef.current[conversationId] = fetchPromise;
      await fetchPromise;
      delete firstPromptFetchesRef.current[conversationId];
      return firstPromptsRef.current[conversationId];
    },
    [setFirstPromptForConversation]
  );

  const prefetchFirstPrompts = useCallback(
    (conversationList: Conversation[]) => {
      conversationList.forEach((convo) => {
        if (!firstPromptsRef.current[convo.id]) {
          ensureFirstPrompt(convo.id).catch(() => {
            /* handled in ensureFirstPrompt */
          });
        }
      });
    },
    [ensureFirstPrompt]
  );

  // Toast state for better UX
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'confirm' | 'info';
    message: string;
    title?: string;
    buttons?: Array<{text: string; onPress: () => void; style?: 'default' | 'destructive' | 'cancel'}>;
  }>({
    visible: false,
    type: 'success',
    message: '',
  });
  
  // Rate limiting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

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

  // Start cooldown function
  const startCooldown = (seconds: number = 30) => {
    setIsButtonDisabled(true);
    setCooldownRemaining(seconds);
  };

  const showToast = (
    type: 'success' | 'error' | 'confirm' | 'info',
    message: string,
    title?: string,
    buttons?: Array<{text: string; onPress: () => void; style?: 'default' | 'destructive' | 'cancel'}>
  ) => {
    setToast({ visible: true, type, message, title, buttons });
  };

  const system_prompt = `
You are Savr, an advanced meal-planning and cooking assistant. You generate complete, structured, easy-to-read outputs with precise formatting and clear section breaks. Use a calm, friendly, and helpful tone.

Here are the inputs:
User prefrences: ${prefrences}
User's pantry Items: ${pantryItems}

INPUTS YOU WILL RECEIVE
- preferences_json: a JSON object with keys like:
  {"allergen_ingredient_ids": [], "calorie_target": 0, "created_at": "2025-10-13T20:06:12.063577Z", "diet_codes": [], "disliked_ingredient_ids": [], "goal": "balanced", "id": 43, "updated_at": "2025-10-13T20:06:12.063577Z", "user_id": 64}
  • diet_codes can include things like "gluten_free", "vegan", "vegetarian", "keto", etc.
  • goal can be "weight_loss", "muscle_gain", "balanced", etc.
  • calorie_target is 0 if unspecified, otherwise an approximate daily target in kcal.
- pantry_json: a JSON array of pantry items, e.g.:
  [
    {"category": "Dairy","created_at":"2025-10-13T20:10:37.853299Z","expires_at":null,"family_id":null,"id":6,"ingredient_id":3,"ingredient_name":"Milk","owner_user_id":64,"quantity":"1.000","scope":"personal","unit_id":null,"updated_at":"2025-10-13T20:10:37.853299Z"},
    {"category":"Fruits","created_at":"2025-10-14T00:33:34.564895Z","expires_at":null,"family_id":null,"id":8,"ingredient_id":1,"ingredient_name":"Apples","owner_user_id":64,"quantity":"27.000","scope":"personal","unit_id":null,"updated_at":"2025-10-14T00:33:34.564895Z"}
  ]

GLOBAL RULES (NEVER VIOLATE)
- Strictly exclude any allergens and any items listed in disliked_ingredient_ids. u 
- Obey diet_codes (e.g., gluten_free, vegan) and user goal (e.g., weight_loss, muscle_gain, balanced).
- Prefer ingredients already in pantry_json and favor items close to expiry if expires_at is present.
- If a requested meal needs items not in the pantry, you may suggest a short, easy shopping list (widely available basics only).
- NEVER guess what is in the user's pantry, if it is not in there, its not. Make sure to have the correct information
- You can assume the normal spices are provided

WHAT TO PRODUCE
  - Produce one recipe card using the recipe format below.
  - At the end, include a short "Pantry Check" noting which ingredients came from the pantry and a "Shopping List (Minimal)" for anything missing.

RECIPE FORMAT (ALWAYS USE THIS EXACT ORDER)
1) Header Summary
   - One short friendly sentence saying what the recipe is and how many people it serves.
2) Ingredients
   - Group by parts if relevant (e.g., For the Pasta, For the Sauce).
   - Give exact measurements (grams, cups, tbsp, etc.) and include salt/pepper/seasonings explicitly.
3) Instructions
   - Numbered steps with clear headers for each step (e.g., "Step 1: Prepare the ingredients", "Step 2: Cook the pasta").
   - Each step should have a descriptive header followed by 1–2 sentences describing actions and reasoning.
   - Make headers action-oriented and clear so users can easily scan through the recipe.
4) Optional Additions
   - 2–4 ideas for variations or diet-compliant add-ins.
5) Final Note
   - Warm, encouraging sign-off.

FORMATTING GUIDELINES
- Use clear section titles exactly as written above (Header Summary, Ingredients, Instructions, Optional Additions, Final Note, Weekly Plan, Pantry Utilization, Shopping List, Recipes, Pantry Check).
- Use line breaks between sections.
- Format numbers and bullet points cleanly.
- Do NOT use Markdown markup (no **bold**, no *italics*). Plain text only.
- Dont include the headers like this **header**, make everything seem friendly but still professional

CALORIE / GOAL GUIDANCE
- If calorie_target > 0, aim for sensible per-meal splits (e.g., 25–35% breakfast, 30–40% lunch, 30–40% dinner) across the day.
- For weight_loss: emphasize lean protein, high-fiber veg, controlled carbs, modest fats.
- For muscle_gain: emphasize protein and complex carbs; include healthy fats.
- For balanced: varied macros, whole foods.

ALLERGEN/DIET CHECKLIST (APPLY BEFORE FINALIZING)
- Ensure every dish respects diet_codes (e.g., replace non-compliant ingredients with compliant alternatives).
- If a substitution is needed, choose one commonly available at any nearby store.

PANTRY POLICY
- Prefer pantry_json ingredients in recipes; if quantity is unspecified, assume modest household amounts (use reasonable portions).
- If a key pantry item is missing, list it in Shopping List (Minimal) with simple units.

OUTPUT TONE
- Professional yet friendly.
- Concise but descriptive.
- Focused on clarity and user experience.
`;

const JSON_DIRECTIVE = `
OUTPUT FORMAT (REQUIRED)
Respond ONLY with valid, minified JSON that matches this exact TypeScript shape:

type IngredientSection = { title: string; items: string[] };

type RecipeCard = {
  mealName: string; // plain title, e.g. "Chicken Salad"
  headerSummary: string; // MUST be identical to mealName
  cuisine: string; // e.g. "Mediterranean"
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";
  difficulty: "Easy" | "Medium" | "Hard";
  servings: number; // integer >=1
  calories: number; // total kcal >= 50
  prepTimeMinutes: number; // >= 1
  cookTimeMinutes: number; // >= 0
  totalTimeMinutes: number; // MUST equal prepTimeMinutes + cookTimeMinutes
  proteinGrams: number; // >= 0
  fatGrams: number; // >= 0
  carbGrams: number; // >= 0
  notes: string; // helpful serving/storage tips
  ingredients: IngredientSection[];
  instructions: string[][]; // each inner array = bullet lines for a numbered step
  optionalAdditions: string[];
  finalNote: string;
  pantryCheck: { usedFromPantry: string[] };
  shoppingListMinimal: string[];
};

Rules:
- Do not include markdown, code fences, or explanations.
- No trailing commas, no comments.
- Provide realistic numbers for nutrition and times; never leave them 0.
- Ingredients strings must include quantity + unit (e.g. "2 cups spinach").
- Notes/finalNote should be complete sentences.`;

  useEffect(() => {
    if (showActionSheet) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      setSelectedAction(null);
    }
  }, [showActionSheet]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Animate conversation sidebar
  useEffect(() => {
    Animated.timing(conversationSlideAnim, {
      toValue: showConversationList ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showConversationList]);

  // Auto scroll to bottom when new message
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Load all conversations
  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const convos = await getConversations();
      setConversations(convos);
      prefetchFirstPrompts(convos);
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      showToast('error', 'Failed to load conversation history');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Load a specific conversation
  const loadConversation = async (conversationId: number) => {
    try {
      const { conversation, messages: apiMessages } = await getConversation(conversationId);
      
      // Convert API messages to UI messages, filtering out system messages
      const uiMessages: ChatMessage[] = apiMessages
        .filter(msg => {
          const content = msg.content || '';
          if (isImageGenerationContent(content)) {
            return false;
          }
          const contentLower = content.toLowerCase();
          
          // Filter out system prompts (messages with 3+ system markers)
          const systemMarkers = [
            'you are savr',
            'output format (required)',
            'inputs you will receive',
            'global rules (never violate)',
            'recipe format (always use this exact order)',
            'formatting guidelines',
            'calorie / goal guidance',
            'pantry policy'
          ];
          
          const markerCount = systemMarkers.filter(marker => contentLower.includes(marker)).length;
          if (markerCount >= 3) {
            return false;
          }
          
          // Filter out very long system-like messages
          if (content.length > 1000 && (
            contentLower.startsWith('you are savr') ||
            contentLower.includes('user prefrences:') ||
            contentLower.includes('user preferences:') ||
            contentLower.includes('user\'s pantry items:')
          )) {
            return false;
          }
          
          return true;
        })
        .map(msg => {
          let content = msg.content;
          
          // If it's a user message, clean up the prompt formatting
          if (msg.role === 'user') {
            content = cleanUserPromptText(content);
          }
          
          // Try to parse as recipe
          const recipe = tryParseRecipe(content);
          if (recipe && msg.role === 'assistant') {
            return { id: uid(), kind: "ai_recipe", recipe };
          }
          
          return {
            id: uid(),
            kind: msg.role === 'user' ? 'user' : 'ai_text',
            text: content,
          } as ChatMessage;
        });
      
      const firstPrompt = findFirstUserPrompt(apiMessages);
      if (firstPrompt) {
        setFirstPromptForConversation(conversationId, firstPrompt);
      }

      setMessages(uiMessages);
      setCurrentConversationId(conversationId);
      setShowConversationList(false);
    } catch (error: any) {
      console.error('Failed to load conversation:', error);
      showToast('error', 'Failed to load conversation');
    }
  };

  // Create a new conversation
  const handleNewConversation = async () => {
    if (isSubmitting || isButtonDisabled) return;

    setIsSubmitting(true);
    try {
      const newConvo = await createConversation('New Chat');
      setConversations([newConvo, ...conversations]);
      setCurrentConversationId(newConvo.id);
      setMessages([]);
      setShowConversationList(false);
      showToast('success', 'New conversation created');
    } catch (error: any) {
      startCooldown(30);
      console.error('Failed to create conversation:', error);
      
      let errorMessage = "Unable to create conversation. ";
      const errorStr = error.message?.toLowerCase() || "";
      
      if (errorStr.includes("network") || errorStr.includes("fetch")) {
        errorMessage = "No internet connection. Please check your network and try again.";
      } else if (errorStr.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (errorStr.includes("401")) {
        errorMessage = "Session expired. Please log in again.";
      } else if (errorStr.includes("429")) {
        startCooldown(120);
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (errorStr.includes("500") || errorStr.includes("503")) {
        errorMessage = "Server error. Please try again later.";
      } else {
        errorMessage = "Failed to create conversation. Please try again.";
      }
      
      showToast('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (conversationId: number) => {
    showToast(
      'confirm',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      'Delete Conversation',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isSubmitting || isButtonDisabled) return;

            setIsSubmitting(true);
            try {
              await deleteConversation(conversationId);
              setConversations(conversations.filter(c => c.id !== conversationId));
              if (currentConversationId === conversationId) {
                setMessages([]);
                setCurrentConversationId(undefined);
              }
              showToast('success', 'Conversation deleted');
            } catch (error: any) {
              startCooldown(30);
              console.error('Failed to delete conversation:', error);
              
              let errorMessage = "Unable to delete conversation. ";
              const errorStr = error.message?.toLowerCase() || "";
              
              if (errorStr.includes("network") || errorStr.includes("fetch")) {
                errorMessage = "No internet connection. Please check your network and try again.";
              } else if (errorStr.includes("timeout")) {
                errorMessage = "Request timed out. Please try again.";
              } else if (errorStr.includes("401")) {
                errorMessage = "Session expired. Please log in again.";
              } else if (errorStr.includes("404")) {
                errorMessage = "Conversation not found. It may have already been deleted.";
              } else if (errorStr.includes("429")) {
                startCooldown(120);
                errorMessage = "Too many requests. Please wait before trying again.";
              } else if (errorStr.includes("500") || errorStr.includes("503")) {
                errorMessage = "Server error. Please try again later.";
              } else {
                errorMessage = "Failed to delete conversation. Please try again.";
              }
              
              showToast('error', errorMessage);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Rename conversation
  const handleRenameConversation = async (conversationId: number, currentTitle: string) => {
    // Helper function to perform the actual rename
    const performRename = async (newTitle: string) => {
      if (!newTitle?.trim()) return;
      if (isSubmitting || isButtonDisabled) return;

      setIsSubmitting(true);
      try {
        await updateConversationTitle(conversationId, newTitle.trim());
        setConversations(conversations.map(c => 
          c.id === conversationId ? { ...c, title: newTitle.trim() } : c
        ));
        showToast('success', 'Conversation renamed');
      } catch (error: any) {
        startCooldown(30);
        console.error('Failed to rename conversation:', error);
        
        let errorMessage = "Unable to rename conversation. ";
        const errorStr = error.message?.toLowerCase() || "";
        
        if (errorStr.includes("network") || errorStr.includes("fetch")) {
          errorMessage = "No internet connection. Please check your network and try again.";
        } else if (errorStr.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        } else if (errorStr.includes("401")) {
          errorMessage = "Session expired. Please log in again.";
        } else if (errorStr.includes("404")) {
          errorMessage = "Conversation not found.";
        } else if (errorStr.includes("429")) {
          startCooldown(120);
          errorMessage = "Too many requests. Please wait before trying again.";
        } else if (errorStr.includes("500") || errorStr.includes("503")) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = "Failed to rename conversation. Please try again.";
        }
        
        showToast('error', errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    };

    // For iOS/Android, use TextInput in an Alert-style modal
    const newTitle = await new Promise<string | null>((resolve) => {
      if (Platform.OS === 'ios') {
        // iOS supports Alert.prompt
        const Alert = require('react-native').Alert;
        Alert.prompt(
          'Rename Conversation',
          'Enter new title:',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            {
              text: 'Save',
              onPress: (text?: string) => resolve(text || null),
            },
          ],
          'plain-text',
          currentTitle
        );
      } else {
        // Android doesn't support Alert.prompt, fallback to a basic approach
        // In a production app, you'd create a custom modal with TextInput
        showToast('info', 'Rename feature requires custom modal on Android');
        resolve(null);
      }
    });
    
    if (newTitle) {
      await performRename(newTitle);
    }
  };

  const handleCameraPress = () => {
    setShowActionSheet(true);
  };

  const handleActionSelect = (action: "camera" | "gallery") => {
    setSelectedAction(action);
  };

  const handleOk = async () => {
    if (selectedAction === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showToast('error', "Camera permission is required.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        showToast('success', "Image captured successfully!");
        setShowActionSheet(false);
      }
    } else if (selectedAction === "gallery") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast('error', "Gallery permission is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        showToast('success', "Image selected successfully!");
        setShowActionSheet(false);
      }
    }
  };

  const handleSendMessage = async () => {
    const userText = message.trim();
    if (!userText) return;

    const userId = uid();
    const typingId = "__typing__"; // stable id for typing indicator

    setMessages((prev) => [
      ...prev,
      { id: userId, kind: "user", text: userText },
    ]);
    setMessage("");

    // Add typing message (stable id)
    setMessages((prev) => [
      ...prev,
      { id: typingId, kind: "ai_text", text: "", isTyping: true },
    ]);

    try {
      // Send message with conversation context
      const response = await sendMessage({
        prompt: `\n\nUSER:\n${userText}\n\n${JSON_DIRECTIVE}`,
        system: `${system_prompt}`,
        conversationId: currentConversationId,
      });

      const resolvedConversationId = currentConversationId ?? response.conversation_id;

      // If no conversation was active, set the new one
      if (!currentConversationId && response.conversation_id) {
        setCurrentConversationId(response.conversation_id);
        // Reload conversations to show the new one
        loadConversations();
      }

      if (resolvedConversationId) {
        setFirstPromptForConversation(resolvedConversationId, userText);
      }

      // Remove typing indicator by id
      setMessages((prev) => prev.filter((msg) => msg.id !== typingId));

      const recipe = tryParseRecipe(response.reply);
      if (recipe) {
        setMessages((prev) => [
          ...prev,
          { id: uid(), kind: "ai_recipe", recipe },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: uid(), kind: "ai_text", text: response.reply },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== typingId));
      showToast('error', error.message || 'Failed to send message');
    }
  };

  const [savingMealId, setSavingMealId] = useState<string | null>(null);

  const inferMealTypeFromSummary = (summary?: string): CreateMealInput['mealType'] => {
    const text = summary?.toLowerCase() ?? '';
    if (text.includes('breakfast')) return 'Breakfast';
    if (text.includes('lunch')) return 'Lunch';
    if (text.includes('snack')) return 'Snack';
    if (text.includes('dessert') || text.includes('sweet')) return 'Dessert';
    return 'Dinner';
  };

  const extractMealName = (summary?: string) => {
    if (!summary) return 'AI Meal';
    const firstLine = summary.split('\n')[0];
    const firstSentence = firstLine.split(/[.!?]/)[0];
    const sanitized = firstSentence.replace(/recipe|delicious|tasty/gi, '').trim();
    return sanitized || 'AI Meal';
  };

  const buildMealInputFromRecipe = (recipe: RecipeCard): CreateMealInput => {
    const toNumber = (value: unknown, fallback = 0) => {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? num : fallback;
    };

    const positiveInt = (value: unknown, fallback = 0) => {
      const num = Math.max(0, Math.round(toNumber(value, fallback)));
      return num;
    };

    const normalizeMealType = (value?: string): CreateMealInput['mealType'] => {
      const map: Record<string, CreateMealInput['mealType']> = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snack: 'Snack',
        dessert: 'Dessert',
      };
      const key = (value || '').toLowerCase();
      return map[key] ?? inferMealTypeFromSummary(recipe.headerSummary);
    };

    const normalizeDifficulty = (value?: string): CreateMealInput['difficulty'] => {
      const map: Record<string, CreateMealInput['difficulty']> = {
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',
      };
      const key = (value || '').toLowerCase();
      return map[key] ?? 'Easy';
    };

    const allIngredients = (recipe.ingredients || []).flatMap((section) => section.items || []);
    const normalizedIngredients = allIngredients
      .map((item) => {
        const parsed = parseIngredientToJson(item);
        const rawName = parsed.ingredient_name || item;
        const name = String(rawName).replace(/^•\s*/, '').trim();
        const amountParts = [parsed.quantity, parsed.unit].map((part) => String(part || '').trim()).filter(Boolean);
        const amount = amountParts.join(' ') || '1';
        if (!name) {
          return null;
        }
        return {
          name,
          amount,
          inPantry: false,
        };
      })
      .filter((ing): ing is { name: string; amount: string; inPantry: boolean } => Boolean(ing));

    if (!normalizedIngredients.length) {
      throw new Error('Meal is missing ingredients.');
    }

    const instructions = (recipe.instructions || [])
      .map((stepLines) => {
        const lines = Array.isArray(stepLines) ? stepLines : [String(stepLines)];
        return lines.filter(Boolean).join(' ').trim();
      })
      .filter(Boolean);

    const prepTime = positiveInt(recipe.prepTimeMinutes, 10);
    const cookTime = positiveInt(recipe.cookTimeMinutes, 10);
    const totalTime = positiveInt(recipe.totalTimeMinutes, prepTime + cookTime);

    const mealName = (recipe.mealName || extractMealName(recipe.headerSummary)).trim() || "AI Meal";

    return {
      id: Date.now(),
      name: mealName,
      image: "🍽️",
      calories: positiveInt(recipe.calories, 200),
      prepTime,
      cookTime,
      totalTime,
      mealType: normalizeMealType(recipe.mealType),
      cuisine: recipe.cuisine?.trim() || undefined,
      tags: undefined,
      macros: {
        protein: positiveInt(recipe.proteinGrams, 10),
        fats: positiveInt(recipe.fatGrams, 10),
        carbs: positiveInt(recipe.carbGrams, 20),
      },
      difficulty: normalizeDifficulty(recipe.difficulty),
      servings: Math.max(1, positiveInt(recipe.servings, 2)),
      dietCompatibility: [],
      goalFit: [],
      ingredients: normalizedIngredients,
      instructions,
      cookingTools: [],
      notes: recipe.notes?.trim() || recipe.finalNote?.trim() || undefined,
      isFavorite: false,
    };
  };

  const handleSaveGeneratedMeal = async (messageId: string, recipe: RecipeCard) => {
    if (savingMealId) {
      return;
    }

    try {
      const payload = buildMealInputFromRecipe(recipe);
      setSavingMealId(messageId);

      // Generate and upload image to Supabase, then save URL to meal
      console.log('[ChatAI] Generating image for meal:', payload.name);
      const imageUrl = await getMealImage(payload.name);

      if (imageUrl) {
        payload.image = imageUrl;
        console.log('[ChatAI] Image URL saved to meal:', imageUrl);
      } else {
        console.warn('[ChatAI] Image generation failed, using emoji fallback');
        // Keep the emoji fallback from buildMealInputFromRecipe
      }

      await createMealForSignleUser(payload);
      showToast('success', 'Meal saved to your collection! Redirecting...');
      router.push("/(main)/(home)/meals");
    } catch (error: any) {
      console.error('[ChatAI] Failed to save meal:', error);
      const errorMessage =
        error?.message?.toLowerCase().includes('409')
          ? 'This meal already exists. Try renaming it or tweaking the recipe.'
          : error?.message || 'Failed to save meal. Please try again.';
      showToast('error', errorMessage);
    } finally {
      setSavingMealId(null);
    }
  };

  const handleMatchGrocery = (recipe: RecipeCard) => {
    const groceryList: any[] = [];

    // Extract all ingredients from the recipe
    recipe.ingredients.forEach((section) => {
      section.items.forEach((item) => {
        const parsed = parseIngredientToJson(item);
        groceryList.push(parsed);
      });
    });

    console.log("Grocery List to send:", groceryList);
    console.log("Pantry Items to send:", pantryItems);

    // Validate we have data
    if (groceryList.length === 0) {
      showToast('error', 'No ingredients found in recipe');
      return;
    }

    // Navigate to Match My Grocery screen with actual recipe data and pantry items
    router.push({
      pathname: "/(main)/(home)/matchMyGrocery",
      params: {
        groceryData: JSON.stringify(groceryList),
        pantryData: JSON.stringify(pantryItems),
      },
    });
  };

  const handleFamilyContextPress = () => {
    if (!isInFamily || !families || families.length === 0) return;

    const family = families[0];
    const memberCount = family?.count ?? 2;

    const familyText = ` serving my family of ${memberCount}`;
    setMessage((prev) => prev + familyText);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SAVR AI</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleNewConversation}
          >
            <Ionicons name="add" size={24} color="#00A86B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowConversationList(!showConversationList)}
          >
            <Ionicons name="menu" size={24} color="#00A86B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversation Sidebar */}
      {showConversationList && (
        <TouchableOpacity
          style={styles.conversationOverlay}
          activeOpacity={1}
          onPress={() => setShowConversationList(false)}
        >
          <Animated.View
            style={[
              styles.conversationSidebar,
              { transform: [{ translateX: conversationSlideAnim }] },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.conversationHeader}>
              <Text style={styles.conversationHeaderTitle}>Conversations</Text>
              <TouchableOpacity onPress={() => setShowConversationList(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.conversationList}>
              {isLoadingConversations ? (
                <Text style={styles.loadingText}>Loading...</Text>
              ) : conversations.length === 0 ? (
                <Text style={styles.emptyConversationsText}>
                  No conversations yet. Start chatting!
                </Text>
              ) : (
                conversations.map((convo) => {
                  const promptPreview =
                    firstPrompts[convo.id]?.trim() ||
                    convo.title ||
                    "New Chat";
                  
                  return (
                    <View key={convo.id} style={styles.conversationItem}>
                      <TouchableOpacity
                        style={[
                          styles.conversationItemButton,
                          currentConversationId === convo.id && styles.conversationItemActive,
                        ]}
                        onPress={() => loadConversation(convo.id)}
                      >
                        <View style={styles.conversationItemContent}>
                          <Text style={styles.conversationItemPrompt}>
                            {promptPreview}
                          </Text>
                          <Text style={styles.conversationItemMeta}>
                            {convo.message_count} messages
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.conversationItemActions}>
                        <TouchableOpacity
                          onPress={() => handleRenameConversation(convo.id, convo.title)}
                          style={styles.conversationActionButton}
                        >
                          <Ionicons name="pencil" size={18} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteConversation(convo.id)}
                          style={styles.conversationActionButton}
                        >
                          <Ionicons name="trash" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>How can I help you?</Text>
          </View>
        )}
        {messages.map((msg) => {
          if (msg.kind === "user") {
            return (
              <View
                key={msg.id}
                style={[styles.messageBubble, styles.userMessage]}
              >
                <Text style={[styles.messageText, { color: "#FFF" }]}>
                  {msg.text}
                </Text>
              </View>
            );
          }
          if (msg.kind === "ai_text") {
            return (
              <View
                key={msg.id}
                style={[styles.messageBubble, styles.aiMessage]}
              >
                {msg.isTyping ? (
                  <TypingIndicator />
                ) : (
                  <AnimatedTypingText text={msg.text} />
                )}
              </View>
            );
          }
          if (msg.kind === "ai_recipe") {
            return (
              <RecipeCardView
                key={msg.id}
                data={msg.recipe}
                onMatchGrocery={handleMatchGrocery}
                onSaveMeal={() => handleSaveGeneratedMeal(msg.id, msg.recipe)}
                isSaving={savingMealId === msg.id}
              />
            );
          }
          return null;
        })}
      </ScrollView>

      <View style={styles.inputContainer}>
        {/* Floating Family Context Button */}
        {isInFamily && families && families.length > 0 && (
          <TouchableOpacity
            style={styles.familyContextButton}
            onPress={handleFamilyContextPress}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={16} color="#FFF" />
            <Text style={styles.familyContextButtonText}>For My Family</Text>
          </TouchableOpacity>
        )}

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Write your message"
            placeholderTextColor="#B4B8BF"
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={styles.bottomIconButton}
              onPress={handleCameraPress}
            >
              <Ionicons name="camera-outline" size={20} color="#B4B8BF" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.sendFab} onPress={handleSendMessage}>
          <Ionicons name="send" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showActionSheet}
        transparent
        animationType="none"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <Animated.View
            style={[
              styles.actionSheetOverlay,
              {
                opacity: fadeAnim,
              },
            ]}
          />
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View
              style={[
                styles.actionSheet,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [300, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.actionSheetHandle} />

              <Text style={styles.actionSheetTitle}>Choose an Action</Text>
              <Text style={styles.actionSheetSubtitle}>
                Capture or select an image.
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionOption,
                    selectedAction === "camera" && styles.actionOptionSelected,
                  ]}
                  onPress={() => handleActionSelect("camera")}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      selectedAction === "camera" && styles.actionIconSelected,
                    ]}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={32}
                      color={selectedAction === "camera" ? "#FFF" : "#FD8100"}
                    />
                  </View>
                  <Text style={styles.actionLabel}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionOption,
                    selectedAction === "gallery" && styles.actionOptionSelected,
                  ]}
                  onPress={() => handleActionSelect("gallery")}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      selectedAction === "gallery" && styles.actionIconSelected,
                    ]}
                  >
                    <Ionicons
                      name="images-outline"
                      size={32}
                      color={selectedAction === "gallery" ? "#FFF" : "#FD8100"}
                    />
                  </View>
                  <Text style={styles.actionLabel}>Gallery</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.okButton,
                  !selectedAction && styles.okButtonDisabled,
                ]}
                onPress={handleOk}
                disabled={!selectedAction}
              >
                <Text style={styles.okButtonText}>Ok</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Toast Banner for better UX */}
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        buttons={toast.buttons}
        onHide={() => setToast({ ...toast, visible: false })}
        topOffset={60}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  addButton: {
    padding: 4,
  },
  conversationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  conversationSidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
    elevation: 5,
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginTop: 50,
  },
  conversationHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  conversationList: {
    flex: 1,
  },
  loadingText: {
    padding: 20,
    textAlign: "center",
    color: "#999",
  },
  emptyConversationsText: {
    padding: 20,
    textAlign: "center",
    color: "#999",
    fontSize: 14,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  conversationItemButton: {
    flex: 1,
    padding: 16,
  },
  conversationItemActive: {
    backgroundColor: "#F0F9F5",
  },
  conversationItemContent: {
    flex: 1,
  },
  conversationItemPrompt: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111",
    marginBottom: 4,
    lineHeight: 18,
  },
  conversationItemMeta: {
    fontSize: 12,
    color: "#999",
  },
  conversationItemActions: {
    flexDirection: "row",
    paddingRight: 8,
  },
  conversationActionButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyStateText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#00A86B",
  },
  aiMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#F0F0F0",
  },
  messageText: {
    fontSize: 15,
    color: "#000",
    lineHeight: 20,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00A86B",
    marginHorizontal: 3,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    position: "relative",
  },
  inputWrapper: {
    flexDirection: "column",
    backgroundColor: "#F7F8FA",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECEEF2",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
  },
  input: {
    flexGrow: 1,
    fontSize: 16,
    lineHeight: 22,
    color: "#000",
    maxHeight: 120,
    paddingVertical: 4,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  bottomIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ECEEF2",
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    marginLeft: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ECEEF2",
  },
  searchPillText: {
    fontSize: 15,
    color: "#B4B8BF",
    marginLeft: 6,
    fontWeight: "500",
  },
  sendFab: {
    position: "absolute",
    right: 24,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FD8100",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  actionSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  actionSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  actionSheetTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
  },
  actionSheetSubtitle: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  actionOption: {
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    minWidth: 120,
  },
  actionOptionSelected: {
    backgroundColor: "#FFF5F0",
  },
  actionIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionIconSelected: {
    backgroundColor: "#FD8100",
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  okButton: {
    backgroundColor: "#00A86B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  okButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  okButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFF",
  },
  cardRoot: {
    borderRadius: 16,
    padding: 14,
    maxWidth: "85%",
  },
  headerSummaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECEEF2",
    padding: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00A86B",
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FD8100",
    marginBottom: 2,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  cardActionButton: {
    flex: 1,
  },
  matchGroceryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00A86B",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: "#00A86B",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginRight: 12,
  },
  matchGroceryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  saveMealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#00A86B",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
  },
  saveMealButtonDisabled: {
    opacity: 0.7,
  },
  saveMealText: {
    color: "#00A86B",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  metaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2FDF6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#D1F2E3",
    gap: 6,
  },
  metaChipText: {
    fontSize: 13,
    color: "#065F46",
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flexBasis: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  timeBlock: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  timeLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  familyContextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FD8100",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#FD8100",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    gap: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  familyContextButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
