// ==================== screens/MealListScreen.tsx ====================
import { preloadMealImages } from "@/src/services/mealImageService";
import { createMealForSignleUser, getAllmealsforSignelUser } from "@/src/user/meals";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddMealModal } from "./addMealModal";
import { MealImage } from "./MealImage";

interface MealListScreenProps {
  onMealSelect: (meal: any) => void;
  isLoading?: boolean;
  hasError?: boolean;
  onImageError?: (message: string) => void;
  scrollToEnd?: boolean;
}

const COLORS = {
  primary: "#00A86B",
  primaryLight: "#E8F8F1",
  accent: "#FD8100",
  accentLight: "#FFF3E6",
  charcoal: "#4C4D59",
  charcoalLight: "#F0F0F2",
  white: "#FFFFFF",
  background: "#F7F8FB",
  text: "#0A0A0A",
  textMuted: "#6B7280",
  border: "#E9ECF2",
};

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

const MealListScreen: React.FC<MealListScreenProps> = ({ 
  onMealSelect,
  isLoading: parentLoading = false,
  hasError: parentError = false,
  onImageError,
  scrollToEnd = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [meals, setMeals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const mapMealType = (mt?: string): Category | "All" => {
    const s = String(mt || "").toLowerCase();
    if (s === "breakfast") return "Breakfast";
    if (s === "lunch") return "Lunch";
    if (s === "dinner") return "Dinner";
    if (s === "snack") return "Snack";
    if (s === "dessert") return "Dessert";
    return "Dinner";
  };

  const normalizeMeal = (m: any) => ({
    id: m.id,
    name: m.name ?? "Untitled Meal",
    image: m.image ?? "🍽️",
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
    familyId: m.family_id ?? m.familyId ?? null,
    createdByUserId: m.created_by_user_id ?? m.createdByUserId,
  });

  const reloadMeals = async () => {
    try {
      const res = await getAllmealsforSignelUser();
      const data = await res?.json();
      const list = Array.isArray(data) ? data.map(normalizeMeal) : [];
      setMeals(list);
    } catch (e) {
      console.log("Failed to load meals:", e);
    }
  };

  useEffect(() => {
    reloadMeals();
  }, []);

  useEffect(() => {
    if (meals.length > 0) {
      const mealNames = meals.map(m => m.name);
      preloadMealImages(mealNames);
    }
  }, [meals]);

  // Scroll to end when scrollToEnd prop is true and meals are loaded
  useEffect(() => {
    if (scrollToEnd && meals.length > 0 && scrollViewRef.current) {
      // Small delay to ensure the ScrollView has rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [scrollToEnd, meals]);

  if (
    Platform.OS === "android" &&
    (UIManager as any).setLayoutAnimationEnabledExperimental
  ) {
    (UIManager as any).setLayoutAnimationEnabledExperimental(true);
  }

  const onSelectCategory = (cat: Category) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(cat);
  };

  const onAddMeal = async () => {
    console.log("Add Meal button pressed");
    setShowAddMealModal(true);
  };

  const handleMealSubmit = async (meal: any) => {
    try {
      setIsSubmitting(true);
      const response = await createMealForSignleUser(meal);
      setMeals([...meals, normalizeMeal(response || meal)]);
      setShowAddMealModal(false);
      alert("Meal added successfully!");
    } catch (error) {
      console.error("Error creating meal:", error);
      alert("Failed to add meal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAddCategory = () => {
    console.log("Add Category button pressed");
  };

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AddMealModal
        visible={showAddMealModal}
        onClose={() => setShowAddMealModal(false)}
        onSubmit={handleMealSubmit}
      />
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          onPress={() =>
            router?.canGoBack?.() ? router.back() : router.replace("/")
          }
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Plans</Text>
        <TouchableOpacity
          style={styles.groceryButton}
          activeOpacity={0.8}
          onPress={() => router.push("/(main)/(home)/groceryLists")}
        >
          <Text style={styles.groceryButtonIcon}>🛒</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search meals..."
          placeholderTextColor={COLORS.textMuted}
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
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={styles.addCategoryChip}
            onPress={onAddCategory}
            activeOpacity={0.8}
          >
            <Text style={styles.addCategoryPlus}>+</Text>
          </TouchableOpacity>
          {CATEGORIES.map((category, index) => {
            const colors = [COLORS.primary, COLORS.accent, COLORS.charcoal];
            const color = colors[index % 3];
            const isActive = selectedCategory === category;
            
            return (
              <Pressable
                key={category}
                onPress={() => onSelectCategory(category)}
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

      {/* Loading State */}
      {parentLoading ? (
        <View style={styles.emptyStateContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyStateTitle}>Loading your meals...</Text>
          <Text style={styles.emptyStateSubtitle}>Just a moment</Text>
        </View>
      ) : parentError ? (
        /* Error State */
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>😕</Text>
          <Text style={styles.emptyStateTitle}>Couldn't Load Meals</Text>
          <Text style={styles.emptyStateSubtitle}>
            We had trouble loading your meals. Please check your connection and try again.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={reloadMeals}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, "#008F5C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : filteredMeals.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>🍽️</Text>
          <Text style={styles.emptyStateTitle}>No Meals Yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start by adding your first meal plan or use Quick Meals to generate one!
          </Text>
          <TouchableOpacity 
            style={styles.addFirstMealButton}
            onPress={onAddMeal}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.addFirstMealButtonText}>+ Add Your First Meal</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        /* Meal cards */
        <ScrollView
          ref={scrollViewRef}
          style={styles.mealsContainer}
          contentContainerStyle={styles.mealsContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {filteredMeals.map((meal: any, index: any) => {
            const colors = [COLORS.primary, COLORS.accent, COLORS.charcoal];
            const accentColor = colors[index % 3];
            
            return (
              <TouchableOpacity
                key={meal.id}
                style={[
                  styles.mealCard,
                  { borderLeftWidth: 5, borderLeftColor: accentColor }
                ]}
                onPress={() => onMealSelect(meal)}
                activeOpacity={0.9}
              >
                <MealImage 
                  mealName={meal.name}
                  imageUrl={meal.image?.startsWith('http') ? meal.image : null}
                  size={240}
                  style={styles.mealImageContainer}
                  showLoading={true}
                  onError={onImageError}
                  silent={!onImageError}
                />

                <View style={styles.mealOverlay}>
                  <View>
                    <Text style={styles.mealName}>{meal.name}</Text>

                    <View style={styles.mealMetaRow}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaIcon}>🔥</Text>
                        <Text style={styles.metaText}>{meal.calories}kcal</Text>
                      </View>
                      {meal.totalTime !== 0 ? (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaIcon}>⏱</Text>
                          <Text style={styles.metaText}>{meal.totalTime}min</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.macrosRow}>
                    {meal.macros?.protein !== 0 ? (
                      <View style={styles.macroItem}>
                        <View style={styles.macroCircle}>
                          <LinearGradient
                            colors={[COLORS.primary, "#008F5C"]}
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
                    ) : null}
                    {meal.macros?.fats !== 0 ? (
                      <View style={styles.macroItem}>
                        <View style={styles.macroCircle}>
                          <LinearGradient
                            colors={[COLORS.accent, "#E67700"]}
                            style={styles.macroGradient}
                          />
                        </View>
                        <View>
                          <Text style={styles.macroValue}>{meal.macros.fats}g</Text>
                          <Text style={styles.macroLabel}>Fats</Text>
                        </View>
                      </View>
                    ) : null}
                    {meal.macros?.carbs !== 0 ? (
                      <View style={styles.macroItem}>
                        <View style={styles.macroCircle}>
                          <LinearGradient
                            colors={[COLORS.charcoal, "#3A3B44"]}
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
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add Meal Floating Button */}
      <TouchableOpacity
        style={styles.addMealButton}
        onPress={onAddMeal}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.accent, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Text style={styles.addMealButtonText}>+ Add Meal</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  backIcon: { fontSize: 22, color: COLORS.primary, fontWeight: "600" },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    flex: 1,
    textAlign: "center",
    marginRight: 0,
  },
  groceryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  groceryButtonIcon: {
    fontSize: 20,
  },

  /* Search */
  searchContainer: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchInput: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
  },

  /* Categories */
  categoriesWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  categoriesContainer: { 
    maxHeight: 50, 
    flexGrow: 0 
  },
  categoriesContent: { gap: 10 },

  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categoryChipPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  categoryText: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: COLORS.textMuted 
  },
  categoryTextActive: { color: COLORS.white },

  addCategoryChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  addCategoryPlus: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    lineHeight: 24,
  },

  /* List */
  mealsContainer: { 
    flex: 1,
  },
  mealsContent: {
    paddingHorizontal: 20,
  },

  /* Card */
  mealCard: {
    height: 240,
    borderRadius: 20,
    marginBottom: 18,
    overflow: "hidden",
    backgroundColor: COLORS.charcoalLight,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  /* Meal image container */
  mealImageContainer: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },

  /* Dark overlay */
  mealOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 20,
    justifyContent: "space-between",
  },

  /* Title */
  mealName: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 12,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  /* Kcal + time pills */
  mealMetaRow: { flexDirection: "row", gap: 10 },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  metaIcon: { fontSize: 16, color: COLORS.white },
  metaText: { fontSize: 14, fontWeight: "700", color: COLORS.white },

  /* Macros row */
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  macroItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10 
  },

  /* Gradient ring */
  macroCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  macroGradient: {
    width: "100%",
    height: "100%",
    opacity: 0.4,
  },

  macroValue: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: COLORS.white,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  macroLabel: { 
    fontSize: 12, 
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },

  /* Add Meal Floating Button */
  addMealButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    borderRadius: 30,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: "hidden",
  },
  fabGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addMealButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
  
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  /* Empty State */
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyStateEmoji: { 
    fontSize: 80, 
    marginBottom: 24 
  },
  emptyStateTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 16, 
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
  addFirstMealButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: COLORS.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addFirstMealButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
});

export default MealListScreen;
