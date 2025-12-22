import ToastBanner from '@/components/generalMessage';
import AppTextInput from '@/components/ui/AppTextInput';
import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface AddMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (meal: any) => void;
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DEFAULT_MEAL_ICON = "restaurant-outline";

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createPalette = (colors: ColorTokens) => ({
  background: colors.background,
  card: colors.card,
  cardAlt: withAlpha(colors.card, 0.96),
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  primary: colors.primary,
  success: colors.success,
  accent: colors.warning,
  error: colors.error,
  border: colors.border,
  shadow: withAlpha(colors.textPrimary, 0.12),
});

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingTop: 90,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha(palette.text, 0.5),
    },
    modalContainer: {
      backgroundColor: palette.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '92%',
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: palette.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: palette.text,
    },
    placeholder: {
      width: 36,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    section: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: palette.text,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inputText: {
      fontSize: 15,
      color: palette.text,
    },
    multiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    halfWidth: {
      flex: 1,
    },
    macrosGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    macroInput: {
      flex: 1,
    },
    macroLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: palette.textMuted,
      marginBottom: 6,
    },
    emojiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    selectedEmoji: {
      fontSize: 32,
    },
    emojiPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
      padding: 12,
      backgroundColor: palette.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    emojiOption: {
      padding: 8,
    },
    emojiText: {
      fontSize: 32,
    },
    picker: {
      backgroundColor: palette.card,
      borderRadius: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    pickerText: {
      fontSize: 15,
      color: palette.text,
    },
    pickerTextActive: {
      color: palette.success,
      fontWeight: '600',
    },
    listItemContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 12,
    },
    listInput: {
      flex: 1,
    },
    addButton: {
      padding: 4,
    },
    removeButton: {
      padding: 4,
      marginTop: 8,
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      backgroundColor: palette.card,
    },
    submitButton: {
      backgroundColor: palette.success,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: palette.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.card,
    },
    bottomPadding: {
      height: 20,
    },
  });
export const AddMealModal: React.FC<AddMealModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  // Basic fields
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [mealType, setMealType] = useState('Breakfast');
  const [difficulty, setDifficulty] = useState('Easy');
  const [servings, setServings] = useState('');
  
  // Time fields
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  
  // Macros
  const [protein, setProtein] = useState('');
  const [fats, setFats] = useState('');
  const [carbs, setCarbs] = useState('');
  
  // Ingredients & Instructions
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState<string[]>(['']);
  
  // Optional fields
  const [cuisine, setCuisine] = useState('');
  const [notes, setNotes] = useState('');
  
  // UI State
  const [showMealTypePicker, setShowMealTypePicker] = useState(false);
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error" | "confirm" | "info";
    message: string;
    title?: string;
    buttons?: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "destructive" | "cancel";
    }>;
  }>({
    visible: false,
    type: "info",
    message: "",
  });

  const showToast = (
    type: "success" | "error" | "confirm" | "info",
    message: string,
    title?: string,
    buttons?: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "destructive" | "cancel";
    }>
  ) => {
    setToast({ visible: true, type, message, title, buttons });
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 120,
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
    }
  }, [visible]);

  const resetForm = () => {
    setName('');
    setCalories('');
    setMealType('Breakfast');
    setDifficulty('Easy');
    setServings('');
    setPrepTime('');
    setCookTime('');
    setProtein('');
    setFats('');
    setCarbs('');
    setIngredients(['']);
    setInstructions(['']);
    setCuisine('');
    setNotes('');
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients.length ? newIngredients : ['']);
  };

  const handleIngredientChange = (text: string, index: number) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = text;
    setIngredients(newIngredients);
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const handleRemoveInstruction = (index: number) => {
    const newInstructions = instructions.filter((_, i) => i !== index);
    setInstructions(newInstructions.length ? newInstructions : ['']);
  };

  const handleInstructionChange = (text: string, index: number) => {
    const newInstructions = [...instructions];
    newInstructions[index] = text;
    setInstructions(newInstructions);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      showToast('error', 'Please enter a meal name', 'Missing Information');
      return;
    }

    if (!calories) {
      showToast('error', 'Please enter calories', 'Missing Information');
      return;
    }

    const totalTime = (parseInt(prepTime) || 0) + (parseInt(cookTime) || 0);

    const meal = {
      id: Date.now(),
      name: name.trim(),
      image: DEFAULT_MEAL_ICON,
      calories: parseInt(calories),
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      totalTime: totalTime || undefined,
      mealType,
      cuisine: cuisine.trim() || undefined,
      macros: {
        protein: protein ? parseInt(protein) : 0,
        fats: fats ? parseInt(fats) : 0,
        carbs: carbs ? parseInt(carbs) : 0,
      },
      difficulty,
      servings: servings ? parseInt(servings) : undefined,
      ingredients: ingredients
        .filter((i) => i.trim())
        .map((item, index) => ({
          id: index + 1,
          name: item.trim(),
          amount: 1,
          unit: 'unit',
        })),
      instructions: instructions.filter((i) => i.trim()),
      notes: notes.trim() || undefined,
      isFavorite: false,
    };

    onSubmit(meal);
    resetForm();
    showToast('success', 'Meal added successfully!', 'Success', [
      { text: 'OK', onPress: onClose, style: 'default' },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [800, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={palette.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Meal</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Meal Name *</Text>
              <AppTextInput
                style={styles.input}
                placeholder="e.g., Grilled Chicken Salad"
                placeholderTextColor={palette.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Meal Type */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Meal Type *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowMealTypePicker(!showMealTypePicker)}
              >
                <Text style={styles.inputText}>{mealType}</Text>
                <Ionicons name="chevron-down" size={20} color={palette.textMuted} />
              </TouchableOpacity>

              {showMealTypePicker && (
                <View style={styles.picker}>
                  {MEAL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={styles.pickerOption}
                      onPress={() => {
                        setMealType(type);
                        setShowMealTypePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerText,
                          mealType === type && styles.pickerTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                      {mealType === type && (
                        <Ionicons name="checkmark" size={20} color={palette.success} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Calories & Servings Row */}
            <View style={styles.row}>
              <View style={[styles.section, styles.halfWidth]}>
                <Text style={styles.sectionLabel}>Calories *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="450"
                  placeholderTextColor={palette.textMuted}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.section, styles.halfWidth]}>
                <Text style={styles.sectionLabel}>Servings</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  placeholderTextColor={palette.textMuted}
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="numeric"
                />
              </View>
            </View>
            {/* Ingredients */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Ingredients</Text>
                <TouchableOpacity
                  onPress={handleAddIngredient}
                  style={styles.addButton}
                >
                  <Ionicons name="add" size={20} color="#10B981" />
                </TouchableOpacity>
              </View>
              {ingredients.map((ingredient, index) => (
                <View key={index} style={styles.listItemContainer}>
                  <AppTextInput
                    style={[styles.input, styles.listInput]}
                    placeholder={`Ingredient ${index + 1}`}
                    placeholderTextColor={palette.textMuted}
                    value={ingredient}
                    onChangeText={(text) => handleIngredientChange(text, index)}
                  />
                  {ingredients.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveIngredient(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color={palette.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Instructions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Instructions</Text>
                <TouchableOpacity
                  onPress={handleAddInstruction}
                  style={styles.addButton}
                >
                  <Ionicons name="add" size={20} color="#10B981" />
                </TouchableOpacity>
              </View>
              {instructions.map((instruction, index) => (
                <View key={index} style={styles.listItemContainer}>
                  <AppTextInput
                    style={[styles.input, styles.listInput, styles.multiline]}
                    placeholder={`Step ${index + 1}`}
                    placeholderTextColor={palette.textMuted}
                    value={instruction}
                    onChangeText={(text) => handleInstructionChange(text, index)}
                    multiline
                  />
                  {instructions.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveInstruction(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color={palette.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes (Optional)</Text>
              <AppTextInput
                style={[styles.input, styles.multiline]}
                placeholder="Any additional notes..."
                placeholderTextColor={palette.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Add Meal</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        buttons={toast.buttons}
        onHide={() => setToast({ ...toast, visible: false })}
        topOffset={100}
      />
    </Modal>
  );
};
