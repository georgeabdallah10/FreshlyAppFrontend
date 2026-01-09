// ==================== screens/MealListScreen.tsx ====================
import ToastBanner from "@/components/generalMessage";
import AppTextInput from "@/components/ui/AppTextInput";
import { useThemeContext } from "@/context/ThemeContext";
import { useBottomNavInset } from "@/hooks/useBottomNavInset";
import { useMeals, useCreateMeal } from "@/hooks/useMeals";
import { preloadMealImages } from "@/src/services/mealImageService";
import { ColorTokens } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddMealModal } from "./addMealModal";
import { MealImage } from "./MealImage";

type ToastType = "success" | "error";
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
}

interface MealListScreenProps {
  onMealSelect: (meal: any) => void;
  isLoading?: boolean;
  hasError?: boolean;
  onImageError?: (message: string) => void;
  scrollToEnd?: boolean;
}

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createPalette = (colors: ColorTokens, mode: "light" | "dark") => {
  const overlayBase = mode === "dark" ? colors.card : colors.textPrimary;

  return {
    primary: colors.primary,
    primaryLight: withAlpha(colors.primary, 0.12),
    primaryDeep: withAlpha(colors.primary, 0.85),
    accent: colors.warning,
    accentLight: withAlpha(colors.warning, 0.12),
    accentDeep: withAlpha(colors.warning, 0.85),
    charcoal: colors.textPrimary,
    charcoalLight: withAlpha(colors.textSecondary, 0.08),
    charcoalDeep: withAlpha(colors.textPrimary, 0.85),
    card: colors.card,
    background: colors.background,
    text: colors.textPrimary,
    textMuted: colors.textSecondary,
    border: colors.border,
    onPrimary: mode === "dark" ? colors.textPrimary : colors.background,
    overlay: withAlpha(overlayBase, mode === "dark" ? 0.7 : 0.45),
    overlaySoft: withAlpha(overlayBase, 0.3),
    shadow: withAlpha(colors.textPrimary, 0.25),
    shadowSoft: withAlpha(colors.textPrimary, 0.15),
  };
};

const CATEGORIES = [
  "All",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Dessert",
] as const;

type Category = (typeof CATEGORIES)[number];

const MealListScreen: React.FC<MealListScreenProps> = ({
  onMealSelect,
  isLoading: parentLoading = false,
  hasError: parentError = false,
  onImageError,
  scrollToEnd = false,
}) => {
  const { theme } = useThemeContext();
  const palette = useMemo(
    () => createPalette(theme.colors, theme.mode),
    [theme.colors, theme.mode]
  );
  const styles = useMemo(() => createStyles(palette), [palette]);
  const chipColors = useMemo(
    () => [palette.primary, palette.accent, palette.charcoal],
    [palette]
  );

  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  
  // React Query hooks
  const { data: meals = [], isLoading, error, refetch } = useMeals();
  const createMeal = useCreateMeal({
    onSuccess: () => {
      setShowAddMealModal(false);
      showToast("success", "Meal added successfully!");
    },
    onError: (error) => {
      showToast("error", error?.message || "Failed to add meal. Please try again.");
    },
  });
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
  });
  const router = useRouter();
  const bottomNavInset = useBottomNavInset();
  const scrollViewRef = useRef<ScrollView>(null);

  const showToast = (type: ToastType, message: string) => {
    setToast({ visible: true, type, message });
  };

  // Animation values
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const searchFadeAnim = useRef(new Animated.Value(0)).current;
  const categoriesFadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const categoryDropdownAnim = useRef(new Animated.Value(0)).current;

  const mapMealType = (mt?: string): Category | "All" => {
    const s = String(mt || "").toLowerCase();
    if (s === "breakfast") return "Breakfast";
    if (s === "lunch") return "Lunch";
    if (s === "dinner") return "Dinner";
    if (s === "snack") return "Snack";
    if (s === "dessert") return "Dessert";
    return "Dinner";
  };


  // Entrance animation
  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerFadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(searchFadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(categoriesFadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
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

  useEffect(() => {
    Animated.timing(categoryDropdownAnim, {
      toValue: showCategoryDropdown ? 1 : 0,
      duration: showCategoryDropdown ? 160 : 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [showCategoryDropdown]);

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
    createMeal.mutate(meal);
  };

  const onAddCategory = () => {
    console.log("Add Category button pressed");
  };

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = meals;

    if (selectedCategory !== "All") {
      list = list.filter((m) => m.mealType === selectedCategory);
    }

    if (showFavouritesOnly) {
      list = list.filter((m) => m.isFavorite);
    }

    if (q) {
      list = list.filter((m) => String(m.name).toLowerCase().includes(q));
    }

    return list;
  }, [meals, selectedCategory, searchQuery, showFavouritesOnly]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AddMealModal
        visible={showAddMealModal}
        onClose={() => setShowAddMealModal(false)}
        onSubmit={handleMealSubmit}
      />
      {createMeal.isPending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      )}
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          { opacity: headerFadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
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
      </Animated.View>

      {/* Search Bar */}
      <Animated.View 
        style={[
          styles.searchContainer,
          { opacity: searchFadeAnim }
        ]}
      >
        <AppTextInput
          style={styles.searchInput}
          placeholder="Search meals..."
          placeholderTextColor={palette.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </Animated.View>

      {/* Categories */}
      <Animated.View
        style={[
          styles.categoriesWrapper,
          { opacity: categoriesFadeAnim }
        ]}
      >
        <View style={styles.categoryFilterRow}>
          <TouchableOpacity
            style={styles.addCategoryChip}
            onPress={onAddCategory}
            activeOpacity={0.8}
          >
            <Text style={styles.addCategoryPlus}>+</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryDropdownTrigger}
            onPress={() => setShowCategoryDropdown((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.categoryDropdownText}>{selectedCategory}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.favouritesButton,
              showFavouritesOnly && styles.favouritesButtonActive,
            ]}
            onPress={() => setShowFavouritesOnly((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={showFavouritesOnly ? "heart" : "heart-outline"}
              size={22}
              color={showFavouritesOnly ? "#EF4444" : palette.textMuted}
            />
          </TouchableOpacity>
        </View>

        {showCategoryDropdown && (
          <Animated.View
            style={[
              styles.categoryFilterDropdown,
              {
                opacity: categoryDropdownAnim,
                transform: [
                  {
                    scaleY: categoryDropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                  {
                    translateY: categoryDropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ScrollView style={{ maxHeight: 250 }}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.dropdownItem,
                    selectedCategory === category && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    onSelectCategory(category);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedCategory === category && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                  {selectedCategory === category && (
                    <Text style={styles.dropdownCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </Animated.View>

      {/* Loading State */}
      {isLoading ? (
        <Animated.View style={[styles.emptyStateContainer, { opacity: contentFadeAnim }]}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.emptyStateTitle}>Loading your meals...</Text>
          <Text style={styles.emptyStateSubtitle}>Just a moment</Text>
        </Animated.View>
      ) : error ? (
        /* Error State */
        <Animated.View style={[styles.emptyStateContainer, { opacity: contentFadeAnim }]}>
          <Ionicons
            name="alert-circle-outline"
            size={56}
            color={palette.textMuted}
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateTitle}>Couldn't Load Meals</Text>
          <Text style={styles.emptyStateSubtitle}>
            We had trouble loading your meals. Please check your connection and try again.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[palette.primary, palette.primaryDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : filteredMeals.length === 0 ? (
        /* Empty State */
        <Animated.View style={[styles.emptyStateContainer, { opacity: contentFadeAnim }]}>
          <Ionicons
            name="restaurant-outline"
            size={56}
            color={palette.textMuted}
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateTitle}>No Meals Yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start by adding your first meal plan or use Quick Meals to generate one!
          </Text>
        </Animated.View>
      ) : (
        /* Meal cards */
        <Animated.ScrollView
          ref={scrollViewRef}
          style={[styles.mealsContainer, { opacity: contentFadeAnim }]}
          contentContainerStyle={[
            styles.mealsContent,
            { paddingBottom: bottomNavInset + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {filteredMeals.map((meal: any, index: any) => {
            const accentColor = chipColors[index % chipColors.length];
            
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
                      <Ionicons name="flame-outline" size={16} color={palette.onPrimary} />
                      <Text style={styles.metaText}>{meal.calories}kcal</Text>
                    </View>
                    {meal.totalTime !== 0 ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color={palette.onPrimary} />
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
                            colors={[palette.primary, palette.primaryDeep]}
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
                            colors={[palette.accent, palette.accentDeep]}
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
                            colors={[palette.charcoal, palette.charcoalDeep]}
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
        </Animated.ScrollView>
      )}

      {/* Add Meal Floating Button */}
      <TouchableOpacity
        style={[styles.addMealButton, { bottom: bottomNavInset + 16 }]}
        onPress={onAddMeal}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[palette.accent, palette.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Text style={styles.addMealButtonText}>+ Add Meal</Text>
        </LinearGradient>
      </TouchableOpacity>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

const createStyles = (palette: ReturnType<typeof createPalette>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: palette.background,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    zIndex: 1,
  },
  backIcon: { fontSize: 22, color: palette.primary, fontWeight: "600" },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
    textAlign: "center",
  },
  groceryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    shadowColor: palette.shadow,
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
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.shadowSoft,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchInput: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: palette.text,
  },

  /* Categories */
  categoriesWrapper: {
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
    backgroundColor: palette.card,
    borderWidth: 2,
    borderColor: palette.border,
    marginRight: 6,
    shadowColor: palette.shadowSoft,
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
    color: palette.textMuted
  },
  categoryTextActive: { color: palette.onPrimary },

  addCategoryChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.card,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: palette.primary,
    borderStyle: "dashed",
    shadowColor: palette.shadowSoft,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  addCategoryPlus: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.primary,
    lineHeight: 24,
  },
  categoryFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryDropdownTrigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  categoryDropdownText: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.text,
  },
  dropdownIcon: {
    fontSize: 12,
    color: palette.textMuted,
  },
  favouritesButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  favouritesButtonActive: {
    backgroundColor: withAlpha("#EF4444", 0.12),
    borderColor: "#EF4444",
  },
  categoryFilterDropdown: {
    backgroundColor: palette.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 12,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemSelected: {
    backgroundColor: palette.primaryLight,
  },
  dropdownItemText: {
    fontSize: 16,
    color: palette.text,
  },
  dropdownItemTextSelected: {
    color: palette.primary,
    fontWeight: "600",
  },
  dropdownCheck: {
    fontSize: 16,
    color: palette.primary,
    fontWeight: "700",
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
    backgroundColor: palette.charcoalLight,
    position: "relative",
    shadowColor: palette.shadow,
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
    backgroundColor: palette.overlay,
    padding: 20,
    justifyContent: "space-between",
  },

  /* Title */
  mealName: {
    fontSize: 26,
    fontWeight: "800",
    color: palette.onPrimary,
    marginBottom: 12,
    letterSpacing: 0.3,
    textShadowColor: withAlpha(palette.text, 0.3),
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
    backgroundColor: palette.overlay,
    borderWidth: 1,
    borderColor: withAlpha(palette.onPrimary, 0.2),
  },
  metaIcon: { fontSize: 16, color: palette.onPrimary },
  metaText: { fontSize: 14, fontWeight: "700", color: palette.onPrimary },

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
    borderColor: withAlpha(palette.onPrimary, 0.3),
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
    color: palette.onPrimary,
    textShadowColor: withAlpha(palette.text, 0.3),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  macroLabel: {
    fontSize: 12,
    color: withAlpha(palette.onPrimary, 0.9),
    fontWeight: "600",
  },

  /* Add Meal Floating Button */
  addMealButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    borderRadius: 30,
    shadowColor: palette.accent,
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
    color: palette.onPrimary,
    fontWeight: "700",
    fontSize: 16,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.overlaySoft,
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
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: palette.text,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: palette.textMuted,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: palette.primary,
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
    color: palette.onPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  addFirstMealButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: palette.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addFirstMealButtonText: {
    color: palette.onPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
});

export default MealListScreen;
