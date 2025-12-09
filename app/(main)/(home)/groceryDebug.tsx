// Grocery Debug Screen (Phase F5)
// Hidden developer screen for diagnosing grocery list and meal plan ingredient calculations.
// Accessible via long-press on grocery list title.

import { useMealPlanDebugInfo } from "@/src/hooks/grocery";
import type { MealPlanDebugIngredient } from "@/src/services/grocery.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  primary: "#00A86B",
  primaryLight: "#E8F8F1",
  accent: "#FD8100",
  accentLight: "#FFF3E6",
  white: "#FFFFFF",
  text: "#0A0A0A",
  textMuted: "#666666",
  textLight: "#999999",
  border: "#E0E0E0",
  background: "#FAFAFA",
  success: "#00A86B",
  warning: "#FF9500",
  danger: "#FF3B30",
  debugBg: "#1E1E1E",
  debugText: "#D4D4D4",
  debugAccent: "#569CD6",
  debugSuccess: "#4EC9B0",
  debugWarning: "#DCDCAA",
  debugError: "#F14C4C",
};

interface IngredientRowProps {
  ingredient: MealPlanDebugIngredient;
  index: number;
}

const IngredientRow: React.FC<IngredientRowProps> = ({ ingredient, index }) => {
  const needsToBuy = ingredient.remaining > 0;
  const hasInPantry = ingredient.pantry_available > 0;

  return (
    <View style={[styles.ingredientRow, index % 2 === 0 && styles.ingredientRowAlt]}>
      <View style={styles.ingredientNameContainer}>
        <Text style={styles.ingredientName} numberOfLines={1}>
          {ingredient.ingredient_name}
        </Text>
        <Text style={styles.ingredientUnit}>
          {ingredient.canonical_unit}
        </Text>
      </View>
      
      <View style={styles.ingredientValues}>
        <View style={styles.valueCell}>
          <Text style={styles.valueNumber}>{ingredient.needed.toFixed(2)}</Text>
        </View>
        
        <View style={styles.valueCell}>
          <Text style={[styles.valueNumber, hasInPantry && styles.valueSuccess]}>
            {ingredient.pantry_available.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.valueCell}>
          <Text style={[styles.valueNumber, needsToBuy && styles.valueWarning]}>
            {ingredient.remaining.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, color, icon }) => (
  <View style={[styles.summaryCard, { borderLeftColor: color }]}>
    <Text style={styles.summaryIcon}>{icon}</Text>
    <View style={styles.summaryContent}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  </View>
);

const GroceryDebugScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealPlanId?: string }>();
  const mealPlanId = params.mealPlanId ? parseInt(params.mealPlanId, 10) : null;

  const [refreshing, setRefreshing] = useState(false);

  const {
    data: debugInfo,
    isLoading,
    error,
    refetch,
  } = useMealPlanDebugInfo(mealPlanId, { enabled: !!mealPlanId });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleGoBack = () => {
    router.back();
  };

  if (!mealPlanId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🔧 Debug Mode</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>No meal plan ID provided</Text>
          <Text style={styles.errorSubtext}>
            Navigate here from a grocery list linked to a meal plan
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🔧 Debug Mode</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.debugAccent} />
          <Text style={styles.loadingText}>Loading debug data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🔧 Debug Mode</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>Failed to load debug data</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const summary = debugInfo?.summary;
  const ingredients = debugInfo?.ingredients ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔧 Debug Mode</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.mealPlanBadge}>
        <Text style={styles.mealPlanBadgeText}>
          Meal Plan ID: {mealPlanId}
        </Text>
      </View>

      {summary && (
        <View style={styles.summaryContainer}>
          <SummaryCard
            label="Items Needed"
            value={summary.total_items_needed}
            color={COLORS.debugAccent}
            icon="📋"
          />
          <SummaryCard
            label="In Pantry"
            value={summary.total_in_pantry}
            color={COLORS.debugSuccess}
            icon="🏠"
          />
          <SummaryCard
            label="To Buy"
            value={summary.total_to_buy}
            color={COLORS.debugWarning}
            icon="🛒"
          />
        </View>
      )}

      <View style={styles.columnHeaders}>
        <Text style={[styles.columnHeader, styles.columnHeaderName]}>Ingredient</Text>
        <Text style={styles.columnHeader}>Need</Text>
        <Text style={styles.columnHeader}>Pantry</Text>
        <Text style={styles.columnHeader}>Buy</Text>
      </View>

      <FlatList
        data={ingredients}
        keyExtractor={(item, index) => `${item.ingredient_name}-${index}`}
        renderItem={({ item, index }) => (
          <IngredientRow ingredient={item} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.debugAccent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No ingredients found</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Developer Debug Screen • {ingredients.length} ingredients
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.debugBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backButtonText: {
    color: COLORS.debugAccent,
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    color: COLORS.debugText,
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 60,
  },
  mealPlanBadge: {
    backgroundColor: "#2D2D2D",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  mealPlanBadgeText: {
    color: COLORS.debugAccent,
    fontSize: 13,
    fontWeight: "600",
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#2D2D2D",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  summaryContent: {
    flex: 1,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "700",
  },
  summaryLabel: {
    color: COLORS.textLight,
    fontSize: 11,
    marginTop: 2,
  },
  columnHeaders: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#2D2D2D",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  columnHeader: {
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    width: 60,
    textAlign: "center",
  },
  columnHeaderName: {
    flex: 1,
    textAlign: "left",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  ingredientRowAlt: {
    backgroundColor: "#252525",
  },
  ingredientNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  ingredientName: {
    color: COLORS.debugText,
    fontSize: 14,
    fontWeight: "500",
  },
  ingredientUnit: {
    color: COLORS.textLight,
    fontSize: 11,
    marginTop: 2,
  },
  ingredientValues: {
    flexDirection: "row",
    gap: 4,
  },
  valueCell: {
    width: 60,
    alignItems: "center",
  },
  valueNumber: {
    color: COLORS.debugText,
    fontSize: 13,
    fontWeight: "500",
  },
  valueSuccess: {
    color: COLORS.debugSuccess,
  },
  valueWarning: {
    color: COLORS.debugWarning,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.textLight,
    fontSize: 14,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.debugError,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  errorSubtext: {
    color: COLORS.textLight,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: COLORS.debugAccent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
    alignItems: "center",
  },
  footerText: {
    color: COLORS.textLight,
    fontSize: 11,
  },
});

export default GroceryDebugScreen;
