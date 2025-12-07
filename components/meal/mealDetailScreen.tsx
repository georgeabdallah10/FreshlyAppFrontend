// ==================== screens/MealDetailScreen.tsx ====================
import ToastBanner from "@/components/generalMessage";
import { useGroceryList } from '@/context/groceryListContext';
import { useUser } from '@/context/usercontext';
import {
    deleteMealForSignleUser,
    toggleMealFavorite,
    updateMealForSignleUser,
} from "@/src/user/meals";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { type Meal } from "./mealsData";
import SendShareRequestModal from "./SendShareRequestModal";

type Props = {
  meal: Meal;
  onBack: () => void;
};

const buildUpdateInputFromMeal = (m: Meal) => ({
  name: m.name,
  image: m.image,
  calories: m.calories,
  prepTime: m.prepTime,
  cookTime: m.cookTime,
  totalTime: m.totalTime,
  mealType: m.mealType,
  cuisine: m.cuisine,
  tags: m.tags,
  macros: m.macros,
  difficulty: m.difficulty,
  servings: m.servings,
  dietCompatibility: m.dietCompatibility,
  goalFit: m.goalFit,
  ingredients: m.ingredients.map((i) => ({
    name: i.name,
    amount: String(i.amount ?? ""),
  })),
  instructions: m.instructions,
  cookingTools: m.cookingTools,
  notes: m.notes,
  isFavorite: m.isFavorite,
});

type ToastType = "success" | "error";
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
  duration?: number;
  topOffset?: number;
}

const MealDetailScreen: React.FC<Props> = ({ meal, onBack }) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedMeal, setEditedMeal] = useState<Meal>({ ...meal });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [addingToGrocery, setAddingToGrocery] = useState(false);
  const favoriteAnimValue = useRef(new Animated.Value(1)).current;

  const { addRecipeToList } = useGroceryList();
  const { isInFamily, activeFamilyId } = useUser();

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
    duration: 3000,
    topOffset: 40,
  });

  const showToast = (
    type: ToastType,
    message: string,
    duration: number = 3000,
    topOffset: number = 40
  ) => {
    setToast({ visible: true, type, message, duration, topOffset });
  };

  React.useEffect(() => {
    let isMounted = true;

    const loadFamily = async () => {
      try {
        const { listMyFamilies } = await import("@/src/user/family");
        const data = await listMyFamilies();
        if (!isMounted) {
          return;
        }

        if (Array.isArray(data) && data.length > 0) {
          setFamilyId(data[0].id);
        } else {
          setFamilyId(null);
        }
      } catch (error) {
        console.error("[MealDetailScreen] Failed to load families:", error);
        if (isMounted) {
          setFamilyId(null);
        }
      }
    };

    loadFamily();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = buildUpdateInputFromMeal(editedMeal);
      await updateMealForSignleUser(meal.id, payload as any);
      setIsEditing(false);
      Alert.alert("Success", "Meal updated successfully!");
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedMeal({ ...meal });
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete meal",
      "Are you sure you want to delete this meal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteMealForSignleUser(meal.id);
              Alert.alert("Deleted", "Meal deleted successfully.");
              onBack();
            } catch (e: any) {
              Alert.alert("Delete failed", e?.message ?? "Please try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleFavorite = async () => {
    if (isFavoriting) return; // Prevent double clicks

    const newFavoriteStatus = !editedMeal.isFavorite;

    try {
      setIsFavoriting(true);

      // Smooth pulse animation
      Animated.sequence([
        Animated.timing(favoriteAnimValue, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(favoriteAnimValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Optimistically update UI
      setEditedMeal((m) => ({ ...m, isFavorite: newFavoriteStatus }));

      // Call backend with full meal payload
      const mealPayload = buildUpdateInputFromMeal(editedMeal);
      await toggleMealFavorite(meal.id, mealPayload as any, newFavoriteStatus);

      // Show success toast
      showToast(
        "success",
        newFavoriteStatus
          ? "Meal added to favorites! ❤️"
          : "Meal removed from favorites",
        2500,
        40
      );
    } catch (error: any) {
      // Rollback on error
      setEditedMeal((m) => ({ ...m, isFavorite: !newFavoriteStatus }));
      showToast("error", error?.message || "Failed to update favorite status");
    } finally {
      setIsFavoriting(false);
    }
  };

  const handleAddToGroceryList = async (scope: 'personal' | 'family') => {
    try {
      setAddingToGrocery(true);

      const payload: any = {
        meal_id: meal.id, // Using meal_id for semantic clarity (backend accepts both meal_id and recipe_id)
        scope: scope,
      };

      if (scope === 'family' && activeFamilyId) {
        payload.family_id = activeFamilyId;
      }

      const response = await addRecipeToList(payload);

      const scopeLabel = scope === 'personal' ? 'Personal' : 'Family';

      if (response.items_added === 0) {
        showToast('success', 'All ingredients already in pantry!', 3000, 40);
      } else {
        const message = `Added ${response.items_added} ingredient${response.items_added !== 1 ? 's' : ''} to ${scopeLabel} grocery list`;
        showToast('success', message, 3000, 40);
      }
    } catch (error: any) {
      // Handle specific error cases from the backend
      const status = error?.status ?? error?.response?.status;
      const message = error?.message?.toLowerCase() ?? '';
      
      let errorMessage = 'Failed to add to grocery list';
      
      if (status === 400) {
        if (message.includes('not found')) {
          errorMessage = 'This meal could not be found. Please try again.';
        } else if (message.includes('scope required')) {
          errorMessage = 'Please select a list type (Personal or Family).';
        } else {
          errorMessage = 'Invalid request. Please try again.';
        }
      } else if (status === 403) {
        errorMessage = 'You do not have access to this family list.';
      } else if (status === 404) {
        errorMessage = 'Meal not found. It may have been deleted.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast('error', errorMessage, 3000, 40);
    } finally {
      setAddingToGrocery(false);
    }
  };

  const hasImage =
    typeof editedMeal.image === "string" &&
    (editedMeal.image.startsWith("http") || editedMeal.image.startsWith("data:"));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleFavorite}
            style={[styles.iconButton, isFavoriting && styles.iconButtonDisabled]}
            activeOpacity={0.8}
            disabled={isFavoriting}
          >
            <Animated.View
              style={{
                transform: [{ scale: favoriteAnimValue }],
                opacity: isFavoriting ? 0.6 : 1,
              }}
            >
              <Text style={styles.favoriteIcon}>
                {editedMeal.isFavorite ? "❤️" : "🤍"}
              </Text>
            </Animated.View>
          </TouchableOpacity>
          
          {familyId !== null && (
            <TouchableOpacity
              onPress={() => {
                console.log("[MealDetailScreen] Share button pressed", {
                  mealId: meal.id,
                  mealName: meal.name,
                  familyId,
                });
                setShowShareModal(true);
              }}
              style={[styles.editButton, { backgroundColor: "#00A86B" }]}
              activeOpacity={0.9}
              disabled={isEditing}
            >
              <Text style={styles.editButtonText}>Share</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.editButton, { backgroundColor: "#FF3B30" }]}
            activeOpacity={0.9}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.editButtonText}>Delete</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
            style={styles.editButton}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator />
            ) : isEditing ? (
              <Image
                source={require("../../assets/icons/save.png")}
                style={styles.menuCardIcon}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={require("../../assets/icons/edit.png")}
                style={styles.menuCardIcon}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroImage}>
            {hasImage ? (
              <Image
                source={{ uri: editedMeal.image }}
                style={styles.heroImageAsset}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.heroEmoji}>{editedMeal.image || "🍽"}</Text>
            )}
          </View>

          {isEditing ? (
            <TextInput
              style={styles.heroTitleInput}
              value={editedMeal.name}
              onChangeText={(text) =>
                setEditedMeal({ ...editedMeal, name: text })
              }
              placeholder="Meal name"
            />
          ) : (
            <Text style={styles.heroTitle}>{editedMeal.name}</Text>
          )}

          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statValue}>{editedMeal.calories}</Text>
              <Text style={styles.statLabel}>kcal</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>⏱</Text>
              <Text style={styles.statValue}>{editedMeal.totalTime}</Text>
              <Text style={styles.statLabel}>min</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>👨‍🍳</Text>
              <Text style={styles.statValue}>{editedMeal.difficulty}</Text>
              <Text style={styles.statLabel}>level</Text>
            </View>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition</Text>
          <View style={styles.macrosGrid}>
            <View style={styles.macroCard}>
              <View
                style={[styles.macroCircleLarge, { borderColor: "#00A86B" }]}
              >
                <Text style={styles.macroValueLarge}>
                  {editedMeal.macros.protein}g
                </Text>
              </View>
              <Text style={styles.macroLabelLarge}>Protein</Text>
            </View>
            <View style={styles.macroCard}>
              <View
                style={[styles.macroCircleLarge, { borderColor: "#FD8100" }]}
              >
                <Text style={styles.macroValueLarge}>
                  {editedMeal.macros.fats}g
                </Text>
              </View>
              <Text style={styles.macroLabelLarge}>Fats</Text>
            </View>
            <View style={styles.macroCard}>
              <View
                style={[styles.macroCircleLarge, { borderColor: "#007AFF" }]}
              >
                <Text style={styles.macroValueLarge}>
                  {editedMeal.macros.carbs}g
                </Text>
              </View>
              <Text style={styles.macroLabelLarge}>Carbs</Text>
            </View>
          </View>
        </View>

        {/* Meal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedMeal.mealType}
                  onChangeText={(text) =>
                    setEditedMeal({
                      ...editedMeal,
                      mealType: text as Meal["mealType"],
                    })
                  }
                />
              ) : (
                <Text style={styles.infoValue}>{editedMeal.mealType}</Text>
              )}
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Cuisine</Text>
              <Text style={styles.infoValue}>{editedMeal.cuisine}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Servings</Text>
              <Text style={styles.infoValue}>{editedMeal.servings}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Prep Time</Text>
              <Text style={styles.infoValue}>{editedMeal.prepTime}m</Text>
            </View>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {editedMeal.tags.map((tag, index) => (
              <View key={`${tag}-${index}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
                {isEditing && (
                  <TouchableOpacity
                    onPress={() => {
                      const newTags = editedMeal.tags.filter(
                        (_, i) => i !== index
                      );
                      setEditedMeal({ ...editedMeal, tags: newTags });
                    }}
                  >
                    <Text style={styles.tagRemove}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {isEditing && (
              <TouchableOpacity
                style={styles.tagAdd}
                onPress={() =>
                  setEditedMeal({
                    ...editedMeal,
                    tags: [...editedMeal.tags, "New tag"],
                  })
                }
              >
                <Text style={styles.tagAddText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Diet & Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diet & Goals</Text>
          <View style={styles.pillsContainer}>
            {editedMeal.dietCompatibility.map((diet, index) => (
              <View
                key={`${diet}-${index}`}
                style={[styles.pill, styles.pillGreen]}
              >
                <Text style={styles.pillText}>✓ {diet}</Text>
              </View>
            ))}
          </View>
          <View style={styles.pillsContainer}>
            {editedMeal.goalFit.map((goal, index) => (
              <View
                key={`${goal}-${index}`}
                style={[styles.pill, styles.pillOrange]}
              >
                <Text style={styles.pillText}>🎯 {goal}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Ingredients ({editedMeal.ingredients.length})
          </Text>
          {editedMeal.ingredients.map((ingredient, index) => (
            <View
              key={`${ingredient.name}-${index}`}
              style={styles.ingredientItem}
            >
              <View style={styles.ingredientLeft}>
                <View
                  style={[
                    styles.ingredientCheck,
                    ingredient.inPantry && styles.ingredientCheckActive,
                  ]}
                >
                  {ingredient.inPantry && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                </View>
                {isEditing ? (
                  <View style={styles.ingredientEditContainer}>
                    <TextInput
                      style={styles.ingredientNameInput}
                      value={ingredient.name}
                      onChangeText={(text) => {
                        const newIngredients = [...editedMeal.ingredients];
                        newIngredients[index] = {
                          ...newIngredients[index],
                          name: text,
                        };
                        setEditedMeal({
                          ...editedMeal,
                          ingredients: newIngredients,
                        });
                      }}
                    />
                    <TextInput
                      style={styles.ingredientAmountInput}
                      value={ingredient.amount}
                      onChangeText={(text) => {
                        const newIngredients = [...editedMeal.ingredients];
                        newIngredients[index] = {
                          ...newIngredients[index],
                          amount: text,
                        };
                        setEditedMeal({
                          ...editedMeal,
                          ingredients: newIngredients,
                        });
                      }}
                    />
                  </View>
                ) : (
                  <View>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientAmount}>
                      {ingredient.amount}
                    </Text>
                  </View>
                )}
              </View>
              {!ingredient.inPantry && !isEditing && (
                <TouchableOpacity
                  style={styles.addToListButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addToListText}>+ List</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Grocery List Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add to Grocery List</Text>
          <Text style={styles.sectionSubtitle}>
            Missing ingredients will be added automatically
          </Text>
          <View style={styles.groceryButtonsContainer}>
            <TouchableOpacity
              style={[styles.groceryButton, styles.groceryButtonPersonal]}
              onPress={() => handleAddToGroceryList('personal')}
              disabled={addingToGrocery}
              activeOpacity={0.8}
            >
              {addingToGrocery ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.groceryButtonIcon}>🛒</Text>
                  <Text style={styles.groceryButtonText}>Personal List</Text>
                </>
              )}
            </TouchableOpacity>

            {isInFamily && (
              <TouchableOpacity
                style={[styles.groceryButton, styles.groceryButtonFamily]}
                onPress={() => handleAddToGroceryList('family')}
                disabled={addingToGrocery}
                activeOpacity={0.8}
              >
                {addingToGrocery ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.groceryButtonIcon}>👨‍👩‍👧‍👦</Text>
                    <Text style={styles.groceryButtonText}>Family List</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Cooking Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cooking Tools</Text>
          <View style={styles.toolsContainer}>
            {editedMeal.cookingTools.map((tool, index) => (
              <View key={`${tool}-${index}`} style={styles.toolItem}>
                <Text style={styles.toolIcon}>🔧</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.toolInput}
                    value={tool}
                    onChangeText={(text) => {
                      const newTools = [...editedMeal.cookingTools];
                      newTools[index] = text;
                      setEditedMeal({ ...editedMeal, cookingTools: newTools });
                    }}
                  />
                ) : (
                  <Text style={styles.toolText}>{tool}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {editedMeal.instructions.map((step, index) => (
            <View key={`${index}-${step.slice(0, 8)}`} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.stepInput}
                  value={step}
                  multiline
                  onChangeText={(text) => {
                    const newInstructions = [...editedMeal.instructions];
                    newInstructions[index] = text;
                    setEditedMeal({
                      ...editedMeal,
                      instructions: newInstructions,
                    });
                  }}
                />
              ) : (
                <Text style={styles.stepText}>{step}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Personal Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={editedMeal.notes}
            onChangeText={(text) =>
              setEditedMeal({ ...editedMeal, notes: text })
            }
            placeholder="Add your personal notes here..."
            multiline
            numberOfLines={4}
            editable
          />
        </View>

        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.9}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Share Request Modal */}
      {familyId !== null && (
        <SendShareRequestModal
          visible={showShareModal}
          mealId={meal.id}
          mealName={meal.name}
          familyId={familyId}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => {
            setShowShareModal(false);
            Alert.alert("Success", "Share request sent successfully!");
          }}
        />
      )}

      {/* Toast Banner */}
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        duration={toast.duration ?? 3000}
        topOffset={toast.topOffset ?? 40}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA", paddingTop: 90 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 24, color: "#1A1A1A" },
  headerActions: { flexDirection: "row", gap: 12 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDisabled: {
    opacity: 0.7,
  },
  favoriteIcon: { fontSize: 20 },
  editButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  content: { flex: 1 },

  heroSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  heroImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  heroImageAsset: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  heroEmoji: { fontSize: 60 },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 16,
  },
  heroTitleInput: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    width: "100%",
  },
  quickStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: "center" },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  statLabel: { fontSize: 12, color: "#666" },
  statDivider: { width: 1, height: 40, backgroundColor: "#E5E5E5" },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },

  macrosGrid: { flexDirection: "row", justifyContent: "space-between" },
  macroCard: { alignItems: "center" },
  macroCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  macroValueLarge: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  macroLabelLarge: { fontSize: 13, color: "#666", fontWeight: "500" },

  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  infoItem: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: { fontSize: 12, color: "#666", marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: "600", color: "#1A1A1A" },
  infoInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    padding: 8,
  },

  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  tagText: { fontSize: 13, fontWeight: "500", color: "#1A1A1A" },
  tagRemove: { fontSize: 18, color: "#FF3B30", fontWeight: "600" },
  tagAdd: {
    backgroundColor: "#00A86B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagAddText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  pill: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  pillGreen: { backgroundColor: "#E8F5E9" },
  pillOrange: { backgroundColor: "#FFF3E0" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#1A1A1A" },

  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  ingredientLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  ingredientCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
  },
  ingredientCheckActive: { backgroundColor: "#00A86B", borderColor: "#00A86B" },
  checkIcon: { fontSize: 14, color: "#fff", fontWeight: "700" },
  ingredientEditContainer: { flex: 1, gap: 4 },
  ingredientName: { fontSize: 15, fontWeight: "500", color: "#1A1A1A" },
  ingredientAmount: { fontSize: 13, color: "#666" },
  ingredientNameInput: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    padding: 6,
  },
  ingredientAmountInput: {
    fontSize: 13,
    color: "#666",
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    padding: 6,
  },
  addToListButton: {
    backgroundColor: "#FD8100",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addToListText: { fontSize: 12, fontWeight: "600", color: "#fff" },

  toolsContainer: { gap: 8 },
  toolItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  toolIcon: { fontSize: 20 },
  toolText: { fontSize: 15, fontWeight: "500", color: "#1A1A1A", flex: 1 },
  toolInput: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
    flex: 1,
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    padding: 8,
  },

  stepItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  stepText: { flex: 1, fontSize: 15, lineHeight: 22, color: "#1A1A1A" },
  stepInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: "#1A1A1A",
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    padding: 8,
    minHeight: 60,
  },

  notesInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    color: "#1A1A1A",
    minHeight: 100,
    textAlignVertical: "top",
  },

  actionButtons: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 16, fontWeight: "600", color: "#666" },
  saveButton: {
    flex: 1,
    backgroundColor: "#00A86B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  menuCardIcon: {
    width: 26,
    height: 26,
  },

  // Grocery List Styles
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  groceryButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  groceryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  groceryButtonPersonal: {
    backgroundColor: '#00A86B',
  },
  groceryButtonFamily: {
    backgroundColor: '#FD8100',
  },
  groceryButtonIcon: {
    fontSize: 20,
  },
  groceryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default MealDetailScreen;
