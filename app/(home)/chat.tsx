import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { askAI } from "@/src/home/chat";
import { useUser } from "@/context/usercontext";

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
  headerSummary: string;
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

// Helper to parse ingredient strings into structured data
function parseIngredientToJson(ingredient: string) {
  const patterns = [
    /^(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|g|grams?|kg|ml|l|oz|lbs?|pounds?)\s+(.+)$/i,
    /^(.+?)\s*-\s*(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|g|grams?|kg|ml|l|oz|lbs?|pounds?)$/i,
    /^(\d+(?:\.\d+)?)\s+(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = ingredient.match(pattern);
    if (match) {
      if (patterns.indexOf(pattern) === 0) {
        return {
          ingredient_name: match[3].trim(),
          quantity: match[1],
          unit: match[2].toLowerCase(),
        };
      } else if (patterns.indexOf(pattern) === 1) {
        return {
          ingredient_name: match[1].trim(),
          quantity: match[2],
          unit: match[3].toLowerCase(),
        };
      } else {
        return {
          ingredient_name: match[2].trim(),
          quantity: match[1],
          unit: "",
        };
      }
    }
  }

  return {
    ingredient_name: ingredient.trim(),
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
    if (
      typeof obj?.headerSummary === "string" &&
      Array.isArray(obj?.ingredients) &&
      Array.isArray(obj?.instructions)
    ) {
      return obj as RecipeCard;
    }
  } catch {}
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
type RecipeCardViewProps = { data: RecipeCard; onMatchGrocery: (r: RecipeCard) => void };

function RecipeCardViewBase({ data, onMatchGrocery }: RecipeCardViewProps) {
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(30)).current;

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
      <Text style={styles.headerSummaryText}>{data.headerSummary}</Text>

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

      <TouchableOpacity
        style={styles.matchGroceryButton}
        onPress={() => onMatchGrocery(data)}
        activeOpacity={0.8}
      >
        <Ionicons name="cart-outline" size={20} color="#FFF" />
        <Text style={styles.matchGroceryText}>Match My Grocery</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const RecipeCardView = React.memo(RecipeCardViewBase);

export default function ChatAIScreen() {
  const { prefrences } = useUser();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [message, setMessage] = useState("");
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"camera" | "gallery" | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const system_prompt = `
You are Freshly, an advanced meal-planning and cooking assistant. You generate complete, structured, easy-to-read outputs with precise formatting and clear section breaks. Use a calm, friendly, and helpful tone.

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
- Strictly exclude any allergens and any items listed in disliked_ingredient_ids.
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
   - Numbered steps.
   - Each step 1–2 sentences describing actions and reasoning.
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
Return ONLY a valid, minified JSON object matching this exact TypeScript shape:

type IngredientSection = { title: string; items: string[] };

type RecipeCard = {
  headerSummary: string;
  ingredients: IngredientSection[];
  instructions: string[][];
  optionalAdditions: string[];
  finalNote: string;
  pantryCheck: { usedFromPantry: string[] };
  shoppingListMinimal: string[];
};

Rules:
- Do not include markdown, code fences, or explanations.
- No trailing commas, no comments.
- If something is not applicable, use [] or "".
- Keep quantities inside ingredient item strings.`;

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

  // Auto scroll to bottom when new message
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

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
        Alert.alert("Permission Denied", "Camera permission is required.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        Alert.alert("Success", "Image captured successfully!");
        setShowActionSheet(false);
      }
    } else if (selectedAction === "gallery") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Gallery permission is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        Alert.alert("Success", "Image selected successfully!");
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

    const response = await askAI({
      prompt: `\n\nUSER:\n${userText}\n\n${JSON_DIRECTIVE}`,
      system: `${system_prompt}`,
    });

    // Remove typing indicator by id
    setMessages((prev) => prev.filter((msg) => msg.id !== typingId));

    const recipe = tryParseRecipe(response);
    if (recipe) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), kind: "ai_recipe", recipe },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { id: uid(), kind: "ai_text", text: response },
      ]);
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
      Alert.alert("Error", "No ingredients found in recipe");
      return;
    }

    // Navigate to Match My Grocery screen with actual recipe data and pantry items
    router.push({
      pathname: "/(home)/matchMyGrocery",
      params: {
        groceryData: JSON.stringify(groceryList),
        pantryData: JSON.stringify(pantryItems),
      },
    });
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
        <Text style={styles.headerTitle}>Freshly AI</Text>
      </View>

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
              />
            );
          }
          return null;
        })}
      </ScrollView>

      <View style={styles.inputContainer}>
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
    justifyContent: "space-evenly",
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
  },
  addButton: {
    padding: 4,
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
    paddingVertical: 16,
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
  matchGroceryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00A86B",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 16,
    shadowColor: "#00A86B",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  matchGroceryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});