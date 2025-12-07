import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGroceryList } from "@/context/groceryListContext";
import ToastBanner from "@/components/generalMessage";
import type { GroceryListItemSummary } from "@/src/services/grocery.service";

type ToastType = "success" | "error" | "info";
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
  duration?: number;
  topOffset?: number;
}

const COLORS = {
  primary: "#00A86B",
  primaryLight: "#E8F8F1",
  accent: "#FD8100",
  accentLight: "#FFF3E6",
  white: "#FFFFFF",
  text: "#0A0A0A",
  textMuted: "#666666",
  border: "#E0E0E0",
  background: "#FAFAFA",
  success: "#00A86B",
  danger: "#FF3B30",
};

const GroceryListDetailScreen: React.FC = () => {
  const router = useRouter();
  const {
    selectedList,
    refreshSelectedList,
    toggleItemChecked,
    removeItem,
    clearChecked,
    syncWithPantry,
  } = useGroceryList();

  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);

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

  useEffect(() => {
    if (!selectedList) {
      showToast("error", "No list selected");
      router.back();
      return;
    }
    refreshSelectedList().catch((err) => {
      console.error("[GroceryListDetail] Error loading list:", err);
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSelectedList();
    } catch (err: any) {
      showToast("error", err?.message || "Failed to refresh list");
    } finally {
      setRefreshing(false);
    }
  }, [refreshSelectedList]);

  const handleToggleItem = async (itemId: number) => {
    try {
      await toggleItemChecked(itemId);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to toggle item");
    }
  };

  const handleRemoveItem = (itemId: number, itemName: string) => {
    Alert.alert(
      "Remove Item",
      `Remove "${itemName}" from the list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeItem(itemId);
              showToast("success", "Item removed");
            } catch (err: any) {
              showToast("error", err?.message || "Failed to remove item");
            }
          },
        },
      ]
    );
  };

  const handleClearChecked = () => {
    if (!selectedList) return;

    const checkedCount = selectedList.items.filter((i) => i.checked).length;
    if (checkedCount === 0) {
      showToast("info", "No checked items to clear");
      return;
    }

    Alert.alert(
      "Clear Checked Items",
      `Remove ${checkedCount} checked item${checkedCount !== 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              setClearing(true);
              await clearChecked(selectedList.id);
              showToast("success", `Cleared ${checkedCount} item${checkedCount !== 1 ? "s" : ""}`);
            } catch (err: any) {
              showToast("error", err?.message || "Failed to clear items");
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleSyncWithPantry = async () => {
    if (!selectedList) return;

    Alert.alert(
      "Sync with Pantry",
      "This will remove items you already have in your pantry. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync",
          onPress: async () => {
            try {
              setSyncing(true);
              const response = await syncWithPantry(selectedList.id);
              const message = response.message || `Removed ${response.items_removed} item${response.items_removed !== 1 ? "s" : ""}`;
              showToast("success", message);
            } catch (err: any) {
              showToast("error", err?.message || "Failed to sync with pantry");
            } finally {
              setSyncing(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: GroceryListItemSummary }) => {
    const displayQuantity =
      item.quantity !== null && item.unit_code
        ? `${item.quantity} ${item.unit_code}`
        : item.quantity !== null
        ? `${item.quantity}`
        : "";

    return (
      <View style={styles.itemCard}>
        <TouchableOpacity
          style={styles.itemCheckbox}
          onPress={() => handleToggleItem(item.id)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              item.checked && styles.checkboxChecked,
            ]}
          >
            {item.checked && <Text style={styles.checkIcon}>✓</Text>}
          </View>
        </TouchableOpacity>

        <View style={styles.itemContent}>
          <Text
            style={[
              styles.itemName,
              item.checked && styles.itemNameChecked,
            ]}
            numberOfLines={2}
          >
            {item.ingredient_name}
          </Text>
          {displayQuantity && (
            <Text style={styles.itemQuantity}>{displayQuantity}</Text>
          )}
          {item.note && (
            <Text style={styles.itemNote} numberOfLines={1}>
              {item.note}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.id, item.ingredient_name)}
          activeOpacity={0.7}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!selectedList) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFamily = selectedList.scope === "family";
  const totalItems = selectedList.items.length;
  const checkedItems = selectedList.items.filter((i) => i.checked).length;
  const remainingItems = totalItems - checkedItems;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        duration={toast.duration}
        topOffset={toast.topOffset}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedList.title || "Grocery List"}
          </Text>
          <View
            style={[
              styles.scopeBadge,
              isFamily ? styles.scopeBadgeFamily : styles.scopeBadgePersonal,
            ]}
          >
            <Text
              style={[
                styles.scopeBadgeText,
                isFamily ? styles.scopeBadgeTextFamily : styles.scopeBadgeTextPersonal,
              ]}
            >
              {isFamily ? "Family" : "Personal"}
            </Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalItems}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {checkedItems}
          </Text>
          <Text style={styles.statLabel}>Checked</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.accent }]}>
            {remainingItems}
          </Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={handleSyncWithPantry}
          disabled={syncing || totalItems === 0}
          activeOpacity={0.7}
        >
          {syncing ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <Text style={styles.actionButtonIcon}>🔄</Text>
              <Text style={styles.actionButtonText}>Sync with Pantry</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={handleClearChecked}
          disabled={clearing || checkedItems === 0}
          activeOpacity={0.7}
        >
          {clearing ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <>
              <Text style={styles.actionButtonIcon}>🗑️</Text>
              <Text style={styles.actionButtonTextSecondary}>Clear Checked</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Items List */}
      {totalItems === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📝</Text>
          <Text style={styles.emptyStateTitle}>No Items</Text>
          <Text style={styles.emptyStateDescription}>
            Add a meal to add ingredients to this list
          </Text>
        </View>
      ) : (
        <FlatList
          data={selectedList.items}
          renderItem={renderItem}
          keyExtractor={(item) => `item-${item.id}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  backButtonText: {
    fontSize: 32,
    fontWeight: "300",
    color: COLORS.text,
    marginTop: -4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  scopeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scopeBadgePersonal: {
    backgroundColor: COLORS.primaryLight,
  },
  scopeBadgeFamily: {
    backgroundColor: COLORS.accentLight,
  },
  scopeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  scopeBadgeTextPersonal: {
    color: COLORS.primary,
  },
  scopeBadgeTextFamily: {
    color: COLORS.accent,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: COLORS.white,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  listContainer: {
    padding: 20,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemCheckbox: {
    padding: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.white,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  itemNote: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.background,
  },
  removeButtonText: {
    fontSize: 24,
    fontWeight: "300",
    color: COLORS.danger,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateDescription: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default GroceryListDetailScreen;
