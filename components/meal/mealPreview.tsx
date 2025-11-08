import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useRouter } from "expo-router";

type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | string;

type Props = {
  name: string;
  ingredients: string[];               // list of ingredient names
  mealType: MealType;
  iconName?: keyof typeof Ionicons.glyphMap; // e.g. "restaurant", "pizza", etc.
  onPress?: () => void;                // when user taps the card
  onSave?: () => Promise<void>;        // when user taps Save Meal - returns promise
  maxIngredientsInline?: number;       // default 3
  disabled?: boolean;
};

const COLORS = {
  bg: "#FFFFFF",
  text: "#101315",
  sub: "#6B7280",
  primary: "#00A86B",
  accent: "#FD8100",
  border: "#E6ECF1",
  chip: "#F6F8FA",
};

// Enable smooth layout changes on Android for title expansion
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const RecipeItem: React.FC<Props> = ({
  name,
  ingredients,
  mealType,
  iconName = "restaurant",
  onPress,
  onSave,
  maxIngredientsInline = 3,
  disabled = false,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  // Pretty label for meal type with safety & fallback
  const mealTypeLabel = useMemo(() => {
    const mt = (mealType ?? "").toString();
    if (!mt) return "Meal";
    return mt.charAt(0).toUpperCase() + mt.slice(1);
  }, [mealType]);

  // Expand / collapse state for ingredients panel
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const expandAnim = useRef(new Animated.Value(0)).current; // 0 collapsed, 1 expanded

  // Save state and animations
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const saveScale = useRef(new Animated.Value(1)).current;
  const saveOpacity = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  const toggleExpand = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    // Animate any layout changes (e.g., title line-wrap) for smoothness
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !expanded;
    setExpanded(next);
    Animated.timing(expandAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height cannot use native driver
    }).start();
  }, [expanded, expandAnim]);

  const handlePressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: 0.98,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handleCardPress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    onPress?.();
  }, [onPress]);

  const handleSave = useCallback(async () => {
    if (saveState !== 'idle' || !onSave) return;

    Haptics.selectionAsync().catch(() => {});
    setSaveState('saving');

    // Pulse animation while saving
    Animated.loop(
      Animated.sequence([
        Animated.timing(saveScale, {
          toValue: 0.95,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(saveScale, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    try {
      await onSave();
      
      // Success animation
      setSaveState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/(home)/meals")
      
      // Stop pulse and show checkmark
      saveScale.stopAnimation(() => {
        Animated.parallel([
          Animated.spring(saveScale, {
            toValue: 1.1,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.spring(checkmarkScale, {
            toValue: 1,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Fade out after showing success
          setTimeout(() => {
            Animated.timing(saveOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              // Reset to idle after fade
              setTimeout(() => {
                setSaveState('idle');
                saveOpacity.setValue(1);
                checkmarkScale.setValue(0);
                saveScale.setValue(1);
              }, 500);
            });
          }, 1200);
        });
      });
    } catch (error) {
      // Error animation
      setSaveState('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      
      // Stop pulse and shake
      saveScale.stopAnimation(() => {
        saveScale.setValue(1);
        Animated.sequence([
          Animated.timing(errorShake, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(errorShake, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(errorShake, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(errorShake, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(errorShake, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start(() => {
          // Reset to idle after error animation
          setTimeout(() => {
            setSaveState('idle');
            errorShake.setValue(0);
          }, 1500);
        });
      });
    }
  }, [onSave, saveState, saveScale, saveOpacity, checkmarkScale, errorShake]);

  const ingredientsLine = useMemo(() => {
    const shown = ingredients.slice(0, maxIngredientsInline);
    const remaining = Math.max(0, ingredients.length - shown.length);
    return remaining > 0
      ? `${shown.join(", ")} +${remaining} more`
      : shown.join(", ");
  }, [ingredients, maxIngredientsInline]);

  const rotateZ = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });
  const panelHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });
  const panelOpacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.cardWrap, { transform: [{ scale }] }]}>
        <View style={[styles.card, disabled && { opacity: 0.6 }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleCardPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={styles.cardBody}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <View style={styles.left}>
              <View style={styles.iconBadge}>
                <Ionicons name={iconName} size={18} color={COLORS.primary} />
              </View>
            </View>

            <View style={styles.center}>
              <View style={styles.titleRow}>
                <Text numberOfLines={expanded ? 0 : 1} ellipsizeMode="tail" style={styles.title}>
                  {name}
                </Text>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>
                    {mealTypeLabel}
                  </Text>
                </View>
              </View>

              <Text numberOfLines={1} style={styles.subText}>
                {ingredients.length > 0 ? "Ingredients" : "No ingredients"}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chevronBtn}
            onPress={toggleExpand}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Animated.View style={{ transform: [{ rotateZ }] }}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Hidden measurer to capture natural content height */}
      <View
        style={styles.measureBox}
        pointerEvents="none"
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.ingredientsWrap}>
          {ingredients.map((it, idx) => (
            <View key={idx} style={styles.ingredientItem}>
              <View style={styles.bullet} />
              <Text style={styles.ingredientText}>{it}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Animated expandable panel */}
      <Animated.View
        style={[
          styles.expandPanel,
          { height: panelHeight, opacity: panelOpacity },
        ]}
      >
        <View style={styles.ingredientsWrap}>
          {ingredients.map((it, idx) => (
            <View key={idx} style={styles.ingredientItem}>
              <View style={styles.bullet} />
              <Text style={styles.ingredientText}>{it}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        style={{
          transform: [
            { scale: saveScale },
            { translateX: errorShake },
          ],
          opacity: saveOpacity,
        }}
      >
        <TouchableOpacity
          style={[
            styles.saveBtn,
            saveState === 'saving' && styles.saveBtnLoading,
            saveState === 'success' && styles.saveBtnSuccess,
            saveState === 'error' && styles.saveBtnError,
          ]}
          onPress={handleSave}
          activeOpacity={0.9}
          disabled={disabled || saveState !== 'idle'}
        >
          {saveState === 'idle' && (
            <>
              <Ionicons name="bookmark" size={16} color="#fff" />
              <Text style={styles.saveText}>Save Meal</Text>
            </>
          )}
          {saveState === 'saving' && (
            <>
              <Ionicons name="hourglass-outline" size={16} color="#fff" />
              <Text style={styles.saveText}>Saving...</Text>
            </>
          )}
          {saveState === 'success' && (
            <Animated.View
              style={[
                styles.saveSuccessContent,
                { transform: [{ scale: checkmarkScale }] },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveText}>Saved!</Text>
            </Animated.View>
          )}
          {saveState === 'error' && (
            <>
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={styles.saveText}>Failed - Try Again</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "column",
    gap: 10,
    alignItems: "stretch",
    width: "100%",
  },
  cardWrap: { flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  left: { width: 34, alignItems: "center" },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: "800", color: COLORS.text, flex: 1, lineHeight: 18 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#EAF7F1",
    borderWidth: 1,
    borderColor: "#D7EEE3",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  subText: { color: COLORS.sub, fontSize: 12 },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  saveBtnLoading: {
    backgroundColor: "#FD8100",
    opacity: 0.8,
  },
  saveBtnSuccess: {
    backgroundColor: COLORS.primary,
  },
  saveBtnError: {
    backgroundColor: "#EF4444",
  },
  saveSuccessContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chevronBtn: {
    padding: 4,
    borderRadius: 8,
  },
  expandPanel: {
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  measureBox: {
    position: "absolute",
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  ingredientsWrap: {
    gap: 6,
    marginBottom: 15
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  ingredientText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});

export default RecipeItem;