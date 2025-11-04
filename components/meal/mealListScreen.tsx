// ==================== screens/MealListScreen.tsx ====================
import { createMealForSignleUser, getAllmealsforSignelUser } from "@/src/user/meals";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { AddMealModal } from "./addMealModal";

interface MealListScreenProps {
  onMealSelect: (meal: any) => void;
  isLoading?: boolean;
  hasError?: boolean;
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

const MealListScreen: React.FC<MealListScreenProps> = ({ 
  onMealSelect,
  isLoading: parentLoading = false,
  hasError: parentError = false 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [meals, setMeals] = useState<any[]>([]); // normalized meals
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Helper: map backend meal to UI shape with safe defaults
  const mapMealType = (mt?: string): Category | "All" => {
    const s = String(mt || "").toLowerCase();
    if (s === "breakfast") return "Breakfast";
    if (s === "lunch") return "Lunch";
    if (s === "dinner") return "Dinner";
    if (s === "snack") return "Snack";
    if (s === "dessert") return "Dessert";
    return "Dinner"; // sensible default
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

  // Enable LayoutAnimation on Android
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
    // Placeholder for add meal handler (e.g., navigation or backend call)
    console.log("Add Meal button pressed");
    setShowAddMealModal(true);
  };

  const handleMealSubmit = async (meal: any) => {
    try {
      setIsSubmitting(true);

      // Call your API
      const response = await createMealForSignleUser(meal);

      // Add the meal to local state (normalize to ensure filtering works)
      setMeals([...meals, normalizeMeal(response || meal)]);

      // Close modal
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
    // Placeholder for add category handler
    console.log("Add Category button pressed");
  };

  // Derived filtered list using category + search
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
    <View style={styles.container}>
      {/* Header */}
      <AddMealModal
        visible={showAddMealModal}
        onClose={() => setShowAddMealModal(false)}
        onSubmit={handleMealSubmit}
      />
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      )}
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
        <Text pointerEvents="none" style={styles.headerTitle}>
          Meal plans
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search meals..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      {/* Categories and Add Category Button */}
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
          {CATEGORIES.map((category) => (
            <Pressable
              key={category}
              onPress={() => onSelectCategory(category)}
              style={({ pressed }) => [
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
                pressed && styles.categoryChipPressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Loading State */}
      {parentLoading ? (
        <View style={styles.emptyStateContainer}>
          <ActivityIndicator size="large" color="#00A86B" />
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
            <Text style={styles.retryButtonText}>Try Again</Text>
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
            <Text style={styles.addFirstMealButtonText}>+ Add Your First Meal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Meal cards */
        <ScrollView
          style={styles.mealsContainer}
          showsVerticalScrollIndicator={false}
        >
          {filteredMeals.map((meal: any, index: any) => (
            <TouchableOpacity
              key={meal.id}
              style={[styles.mealCard, index === 0 && styles.mealCardHighlighted]}
              onPress={() => onMealSelect(meal)}
              activeOpacity={0.9}
            >
              <View style={styles.mealImageContainer}>
                <Text style={styles.mealImageEmoji}>{meal.image}</Text>
              </View>

              <View style={styles.mealOverlay}>
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

                <View style={styles.macrosRow}>
                  {meal.macros?.protein !== 0 ? (
                    <View style={styles.macroItem}>
                      <View style={styles.macroCircle}>
                        <View style={[styles.macroProgress, { width: "70%" }]} />
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
                        <View style={[styles.macroProgress, { width: "40%" }]} />
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
                        <View style={[styles.macroProgress, { width: "60%" }]} />
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
          ))}
        </ScrollView>
      )}

      {/* Add Meal Floating Button */}
      <TouchableOpacity
        style={styles.addMealButton}
        onPress={onAddMeal}
        activeOpacity={0.8}
      >
        <Text style={styles.addMealButtonText}>+ Add Meal</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FB", paddingTop: 90 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    position: "relative",
    zIndex: 10,
    backgroundColor: "#F7F8FB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    zIndex: 2,
    position: "relative",
  },
  backIcon: { fontSize: 22, color: "#1A1A1A" },
  headerTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
  },

  /* Search */
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchInput: {
    height: 40,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#1A1A1A",
  },

  /* Categories and Add Category wrapper */
  categoriesWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },

  /* Categories */
  categoriesContainer: { maxHeight: 40, flexGrow: 0 },
  categoriesContent: { gap: 10 },

  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9ECF2",
    marginRight: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categoryChipActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  categoryChipPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  categoryText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  categoryTextActive: { color: "#FFFFFF" },

  addCategoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  addCategoryPlus: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6B7280",
    lineHeight: 20,
  },

  /* List */
  mealsContainer: { flex: 1, paddingHorizontal: 20 },

  /* Card */
  mealCard: {
    height: 240,
    borderRadius: 22,
    marginBottom: 18,
    overflow: "hidden",
    backgroundColor: "#E8E8E8",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  mealCardHighlighted: {
    borderWidth: 0, // remove green stroke look
    borderColor: "transparent",
  },

  /* Image placeholder (you’ll swap this when real images are in) */
  mealImageContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F2F5",
  },
  mealImageEmoji: { fontSize: 84 },

  /* Dark overlay like Figma (photo remains vibrant) */
  mealOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 18,
    justifyContent: "space-between",
  },

  /* Title */
  mealName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  /* Kcal + time “pills” */
  mealMetaRow: { flexDirection: "row", gap: 10 },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  metaIcon: { fontSize: 15, color: "#FFFFFF" },
  metaText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  /* Macros row */
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  macroItem: { flexDirection: "row", alignItems: "center", gap: 10 },

  /* White ring like Figma */
  macroCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  /* Hide the “progress” bar since Figma uses a ring */
  macroProgress: { width: "0%", height: "100%", borderRadius: 20 },

  macroValue: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  macroLabel: { fontSize: 12, color: "rgba(255,255,255,0.9)" },

  /* Add Meal Floating Button */
  addMealButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#10B981",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  addMealButtonText: {
    color: "#FFFFFF",
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
  emptyStateEmoji: { fontSize: 64, marginBottom: 20 },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  addFirstMealButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },
  addFirstMealButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default MealListScreen;
