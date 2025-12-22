// MemberMealsOverlay.tsx - Full-screen overlay for viewing a family member's meals
import { getMemberMeals } from "@/src/user/familyMeals";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppTextInput from "@/components/ui/AppTextInput";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MealImage } from "../meal/MealImage";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MemberMealsOverlayProps {
  visible: boolean;
  memberName: string;
  memberId: string;
  familyId: string;
  onClose: () => void;
  onSaveMeal: (meal: any) => Promise<void>;
}

const CATEGORIES = [
  "All",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Dessert",
  "Favourites",
] as const;

type Category = (typeof CATEGORIES)[number];

const MemberMealsOverlay: React.FC<MemberMealsOverlayProps> = ({
  visible,
  memberName,
  memberId,
  familyId,
  onClose,
  onSaveMeal,
}) => {
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [meals, setMeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [savingMealId, setSavingMealId] = useState<number | null>(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Normalize meal data from backend to frontend format
  const normalizeMeal = useCallback((m: any) => ({
    id: m.id,
    name: m.name ?? "Untitled Meal",
    image: m.image ?? "",
    calories: Number(m.calories ?? 0),
    prepTime: Number(m.prep_time ?? m.prepTime ?? 0),
    cookTime: Number(m.cook_time ?? m.cookTime ?? 0),
    totalTime: Number(m.total_time ?? m.totalTime ?? 0),
    mealType: mapMealType(m.meal_type ?? m.mealType),
    cuisine: m.cuisine ?? "",
    tags: Array.isArray(m.tags) ? m.tags : [],
    macros: m.macros ?? { protein: 0, fats: 0, carbs: 0 },
    difficulty: (m.difficulty ?? "Easy") as "Easy" | "Medium" | "Hard",
    servings: Number(m.servings ?? 1),
    dietCompatibility: Array.isArray(m.diet_compatibility ?? m.dietCompatibility)
      ? (m.diet_compatibility ?? m.dietCompatibility)
      : [],
    goalFit: Array.isArray(m.goal_fit ?? m.goalFit)
      ? (m.goal_fit ?? m.goalFit)
      : [],
    ingredients: Array.isArray(m.ingredients)
      ? m.ingredients.map((ing: any) => ({
          name: ing.name ?? "",
          amount: String(ing.amount ?? ""),
          inPantry: Boolean(ing.in_pantry ?? ing.inPantry ?? false),
        }))
      : [],
    instructions: Array.isArray(m.instructions) ? m.instructions : [],
    cookingTools: Array.isArray(m.cooking_tools ?? m.cookingTools)
      ? (m.cooking_tools ?? m.cookingTools)
      : [],
    notes: m.notes ?? "",
    isFavorite: Boolean(m.is_favorite ?? m.isFavorite ?? false),
  }), []);

  const mapMealType = (mt?: string): Category | "All" => {
    const s = String(mt || "").toLowerCase();
    if (s === "breakfast") return "Breakfast";
    if (s === "lunch") return "Lunch";
    if (s === "dinner") return "Dinner";
    if (s === "snack") return "Snack";
    if (s === "dessert") return "Dessert";
    return "Dinner";
  };

  // Fetch meals when overlay opens
  const loadMeals = useCallback(async () => {
    if (!familyId || !memberId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getMemberMeals(Number(familyId), Number(memberId));
      const normalizedMeals = data.map(normalizeMeal);
      setMeals(normalizedMeals);
    } catch (err: any) {
      setError(err?.message || "Failed to load meals");
      setMeals([]);
    } finally {
      setIsLoading(false);
    }
  }, [familyId, memberId, normalizeMeal]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      loadMeals();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, loadMeals]);

  // Filter meals by category and search
  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = meals;

    if (selectedCategory === "Favourites") {
      list = list.filter((m) => m.isFavorite);
    } else if (selectedCategory !== "All") {
      list = list.filter((m) => m.mealType === selectedCategory);
    }

    if (q) {
      list = list.filter((m) => String(m.name).toLowerCase().includes(q));
    }

    return list;
  }, [meals, selectedCategory, searchQuery]);

  // Handle saving a meal copy
  const handleSaveMeal = async (meal: any) => {
    try {
      setSavingMealId(meal.id);
      await onSaveMeal(meal);
    } finally {
      setSavingMealId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
        />

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {memberName}'s Meals
            </Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={palette.textMuted} style={styles.searchIcon} />
            <AppTextInput
              style={styles.searchInput}
              placeholder="Search meals..."
              placeholderTextColor={palette.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>

          {/* Categories */}
          <View style={styles.categoriesWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContent}
            >
              {CATEGORIES.map((category, index) => {
                const colors = [palette.primary, palette.accent, palette.charcoal];
                const color = colors[index % 3];
                const isActive = selectedCategory === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      isActive && { backgroundColor: color, borderColor: color },
                      pressed && styles.categoryChipPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isActive && styles.categoryTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Content Area */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={styles.loadingText}>Loading meals...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={palette.textMuted}
                  style={styles.centerStateIcon}
                />
              <Text style={styles.errorTitle}>Couldn't Load Meals</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadMeals}
                activeOpacity={0.8}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : filteredMeals.length === 0 ? (
            <View style={styles.centerContainer}>
                <Ionicons
                  name="restaurant-outline"
                  size={48}
                  color={palette.textMuted}
                  style={styles.centerStateIcon}
                />
              <Text style={styles.emptyTitle}>No Meals Found</Text>
              <Text style={styles.emptyText}>
                {meals.length === 0
                  ? `${memberName} hasn't added any meals yet.`
                  : "No meals match your search or filter."}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.mealsContainer}
              contentContainerStyle={styles.mealsContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredMeals.map((meal, index) => {
                const colors = [palette.primary, palette.accent, palette.charcoal];
                const accentColor = colors[index % 3];
                const isSaving = savingMealId === meal.id;

                return (
                  <View
                    key={meal.id}
                    style={[
                      styles.mealCard,
                      { borderLeftWidth: 5, borderLeftColor: accentColor },
                    ]}
                  >
                    <MealImage
                      mealName={meal.name}
                      imageUrl={meal.image?.startsWith("http") ? meal.image : null}
                      size={220}
                      style={styles.mealImageContainer}
                      showLoading={true}
                      silent={true}
                    />

                    {/* Save Button */}
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => handleSaveMeal(meal)}
                      disabled={isSaving}
                      activeOpacity={0.8}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color={palette.card} />
                      ) : (
                        <Ionicons name="add-circle" size={28} color={palette.card} />
                      )}
                    </TouchableOpacity>

                    {/* Favorite indicator */}
                  {meal.isFavorite && (
                    <View style={styles.favoriteIndicator}>
                      <Ionicons name="heart" size={16} color={palette.error} />
                    </View>
                  )}

                    <View style={styles.mealOverlay}>
                      <View>
                        <Text style={styles.mealName}>{meal.name}</Text>

                        <View style={styles.mealMetaRow}>
                        <View style={styles.metaItem}>
                          <Ionicons name="flame-outline" size={14} color={palette.card} />
                          <Text style={styles.metaText}>{meal.calories}kcal</Text>
                        </View>
                        {meal.totalTime !== 0 && (
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color={palette.card} />
                            <Text style={styles.metaText}>{meal.totalTime}min</Text>
                          </View>
                        )}
                        </View>
                      </View>

                      <View style={styles.macrosRow}>
                        {meal.macros?.protein !== 0 && (
                          <View style={styles.macroItem}>
                          <View style={styles.macroCircle}>
                            <LinearGradient
                                colors={[palette.primary, withAlpha(palette.primary, 0.85)]}
                                style={styles.macroGradient}
                              />
                            </View>
                            <View>
                              <Text style={styles.macroValue}>
                                {meal.macros.protein}g
                              </Text>
                              <Text style={styles.macroLabel}>Protein</Text>
                            </View>
                          </View>
                        )}
                        {meal.macros?.fats !== 0 && (
                          <View style={styles.macroItem}>
                          <View style={styles.macroCircle}>
                            <LinearGradient
                                colors={[palette.accent, withAlpha(palette.accent, 0.85)]}
                                style={styles.macroGradient}
                              />
                            </View>
                            <View>
                              <Text style={styles.macroValue}>
                                {meal.macros.fats}g
                              </Text>
                              <Text style={styles.macroLabel}>Fats</Text>
                            </View>
                          </View>
                        )}
                        {meal.macros?.carbs !== 0 && (
                          <View style={styles.macroItem}>
                          <View style={styles.macroCircle}>
                            <LinearGradient
                                colors={[palette.charcoal, withAlpha(palette.charcoal, 0.85)]}
                                style={styles.macroGradient}
                              />
                            </View>
                            <View>
                              <Text style={styles.macroValue}>
                                {meal.macros.carbs}g
                              </Text>
                              <Text style={styles.macroLabel}>Carbs</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
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
  primary: colors.primary,
  accent: colors.warning,
  charcoal: colors.textPrimary,
  charcoalLight: withAlpha(colors.textSecondary, 0.1),
  card: colors.card,
  white: colors.card,
  background: colors.background,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  border: colors.border,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
});

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha(palette.text, 0.5),
    },
    content: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: SCREEN_HEIGHT * 0.92,
      backgroundColor: palette.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: palette.border,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: palette.charcoalLight,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
      textAlign: "center",
      marginHorizontal: 12,
    },
    headerPlaceholder: {
      width: 40,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginVertical: 12,
      borderRadius: 12,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 12,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      height: 44,
      fontSize: 16,
      color: palette.text,
    },
    categoriesWrapper: {
      marginBottom: 12,
    },
    categoriesContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: palette.card,
      borderWidth: 2,
      borderColor: palette.border,
    },
    categoryChipPressed: {
      transform: [{ scale: 0.97 }],
      opacity: 0.92,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.textMuted,
    },
    categoryTextActive: {
      color: palette.card,
    },
    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: palette.textMuted,
    },
    centerStateIcon: {
      marginBottom: 16,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: palette.textMuted,
      textAlign: "center",
      marginBottom: 20,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: palette.primary,
      borderRadius: 12,
    },
    retryButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.card,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: palette.textMuted,
      textAlign: "center",
    },
    mealsContainer: {
      flex: 1,
    },
    mealsContent: {
      paddingHorizontal: 16,
    },
    mealCard: {
      height: 220,
      borderRadius: 16,
      marginBottom: 16,
      overflow: "hidden",
      backgroundColor: palette.charcoalLight,
      position: "relative",
      shadowColor: palette.text,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    mealImageContainer: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    saveButton: {
      position: "absolute",
      top: 12,
      left: 12,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: withAlpha(palette.primary, 0.9),
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      shadowColor: palette.text,
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    favoriteIndicator: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: withAlpha(palette.card, 0.9),
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    },
    mealOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      padding: 16,
      justifyContent: "space-between",
    },
    mealName: {
      fontSize: 22,
      fontWeight: "800",
      color: palette.card,
      marginBottom: 10,
      marginTop: 50,
      letterSpacing: 0.3,
      textShadowColor: "rgba(0,0,0,0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    mealMetaRow: {
      flexDirection: "row",
      gap: 8,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: "rgba(0,0,0,0.4)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    metaIcon: {
      fontSize: 14,
    },
    metaText: {
      fontSize: 13,
      fontWeight: "700",
      color: palette.card,
    },
    macrosRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 8,
    },
    macroItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    macroCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.4)",
    },
    macroGradient: {
      flex: 1,
    },
    macroValue: {
      fontSize: 14,
      fontWeight: "700",
      color: palette.card,
    },
    macroLabel: {
      fontSize: 11,
      color: "rgba(255,255,255,0.8)",
    },
  });

export default MemberMealsOverlay;
