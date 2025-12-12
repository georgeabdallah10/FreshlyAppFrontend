import ToastBanner from "@/components/generalMessage";
import SyncPantryButton from "@/components/grocery/SyncPantryButton";
import SyncResultModal from "@/components/grocery/SyncResultModal";
import { useGroceryList } from "@/context/groceryListContext";
import { useUser } from "@/context/usercontext";
import type { GroceryListItemSummary } from "@/src/services/grocery.service";
import {
  formatQuantityDisplay,
  getItemCategory,
  groupItemsByCategory,
  SORT_OPTIONS,
  sortItems,
  type SortOption
} from "@/src/utils/groceryListUtils";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

// ============================================
// SORT DROPDOWN COMPONENT
// ============================================

interface SortDropdownProps {
  visible: boolean;
  currentSort: SortOption;
  onSelect: (option: SortOption) => void;
  onClose: () => void;
}

const SortDropdown: React.FC<SortDropdownProps> = ({
  visible,
  currentSort,
  onSelect,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dropdownOverlay} onPress={onClose}>
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>Sort By</Text>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.option}
              style={[
                styles.dropdownOption,
                currentSort === option.option && styles.dropdownOptionSelected,
              ]}
              onPress={() => {
                onSelect(option.option);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownOptionIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.dropdownOptionText,
                  currentSort === option.option && styles.dropdownOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {currentSort === option.option && (
                <Text style={styles.dropdownCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

// ============================================
// CATEGORY HEADER COMPONENT
// ============================================

interface CategoryHeaderProps {
  category: string;
  itemCount: number;
  checkedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  category,
  itemCount,
  checkedCount,
  isExpanded,
  onToggle,
}) => {
  return (
    <TouchableOpacity
      style={styles.categoryHeader}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.categoryHeaderLeft}>
        <Text style={styles.categoryExpandIcon}>{isExpanded ? "▼" : "▶"}</Text>
        <Text style={styles.categoryName}>{category}</Text>
      </View>
      <View style={styles.categoryHeaderRight}>
        <Text style={styles.categoryCount}>
          {checkedCount}/{itemCount}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const GroceryListDetailScreen: React.FC = () => {
  const router = useRouter();
  const userContext = useUser();
  const groceryContext = useGroceryList();

  if (!userContext || !groceryContext) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { user } = userContext;
  const {
    selectedList,
    refreshSelectedList,
    toggleItemChecked,
    removeItem,
    clearChecked,
    syncWithPantry,
    deleteList,
    canSyncList,
    getListCreatorName,
    syncModalVisible,
    syncModalData,
    closeSyncModal,
    isSyncing,
    markItemPurchased,
    rebuildFromMealPlan,
    isRebuilding,
  } = groceryContext;

  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sorting and grouping state
  const [sortOption, setSortOption] = useState<SortOption>("category");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isGrouped, setIsGrouped] = useState(true);

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
    refreshSelectedList().catch((err: any) => {
      console.log("[GroceryListDetail] Error loading list:", err);
    });
  }, []);

  // Initialize expanded categories when list loads
  useEffect(() => {
    if (selectedList && expandedCategories.size === 0) {
      const categories = new Set<string>();
      selectedList.items.forEach((item: GroceryListItemSummary) => {
        categories.add(getItemCategory(item));
      });
      setExpandedCategories(categories);
    }
  }, [selectedList]);

  // Process items with sorting and grouping
  const processedData = useMemo(() => {
    if (!selectedList) return { sections: [], flatItems: [] };

    const items = selectedList.items;

    if (isGrouped && sortOption === "category") {
      // Group by category
      const grouped = groupItemsByCategory(items, expandedCategories);
      const sections = grouped.map((group) => ({
        title: group.category,
        data: group.isExpanded ? group.items : [],
        itemCount: group.items.length,
        checkedCount: group.items.filter((i) => i.checked).length,
        isExpanded: group.isExpanded,
      }));
      return { sections, flatItems: [] };
    } else {
      // Flat list with sorting
      const sorted = sortItems(items, sortOption);
      return { sections: [], flatItems: sorted };
    }
  }, [selectedList, sortOption, isGrouped, expandedCategories]);

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

  const handleMarkPurchased = async (itemId: number, itemName: string) => {
    try {
      await markItemPurchased(itemId, true);
      showToast("success", `"${itemName}" added to pantry`);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to mark item as purchased");
    }
  };

  const handleRemoveItem = (itemId: number, itemName: string, isManual: boolean = true) => {
    // Different confirmation for auto-generated items
    const title = isManual ? "Remove Item" : "Remove Auto-Generated Item";
    const message = isManual
      ? `Remove "${itemName}" from the list?`
      : `"${itemName}" was added from a recipe. Are you sure you want to remove it? It may be added back if you rebuild from the meal plan.`;

    Alert.alert(
      title,
      message,
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

    const checkedCount = selectedList.items.filter((i: GroceryListItemSummary) => i.checked).length;
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

  const handleDeleteList = () => {
    if (!selectedList) return;

    Alert.alert(
      "Delete List",
      `Are you sure you want to delete "${selectedList.title || "this grocery list"}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteList(selectedList.id);
              showToast("success", "List deleted");
              router.back();
            } catch (err: any) {
              showToast("error", err?.message || "Failed to delete list");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Phase F4: Rebuild grocery list from meal plan
  const handleRebuildFromMealPlan = async () => {
    if (!selectedList || !selectedList.meal_plan_id) {
      showToast("info", "This list is not linked to a meal plan");
      return;
    }

    Alert.alert(
      "Rebuild Grocery List",
      "This will refresh the list based on your current meal plan and pantry. Manual items will be kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rebuild",
          onPress: async () => {
            try {
              const response = await rebuildFromMealPlan(selectedList.id, selectedList.meal_plan_id!);
              showToast("success", `Rebuilt list with ${response.items_rebuilt} items`);
              await refreshSelectedList();
            } catch (err: any) {
              showToast("error", err?.message || "Failed to rebuild list");
            }
          },
        },
      ]
    );
  };

  // Phase F5: Open debug screen (hidden developer feature)
  const handleOpenDebugMode = () => {
    if (!selectedList?.meal_plan_id) {
      showToast("info", "Debug mode requires a linked meal plan");
      return;
    }
    router.push({
      pathname: "/(main)/(home)/groceryDebug",
      params: { mealPlanId: selectedList.meal_plan_id.toString() },
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const renderItem = ({ item }: { item: GroceryListItemSummary }) => {
    // Use display utilities for quantity (prefers original values)
    const displayQuantity = formatQuantityDisplay(item);

    // Show category badge when not grouped
    const showCategoryBadge = !isGrouped || sortOption !== "category";
    const itemCategory = getItemCategory(item);

    // Check if item is purchased
    const isPurchased = item.is_purchased === true;

    // Check if item is manual (Phase F3)
    const isManual = item.is_manual === true;

    return (
      <View style={[styles.itemCard, isPurchased && styles.itemCardPurchased]}>
        {/* Checkbox - disabled if purchased */}
        <TouchableOpacity
          style={styles.itemCheckbox}
          onPress={() => !isPurchased && handleToggleItem(item.id)}
          activeOpacity={isPurchased ? 1 : 0.7}
          disabled={isPurchased}
        >
          <View
            style={[
              styles.checkbox,
              item.checked && styles.checkboxChecked,
              isPurchased && styles.checkboxPurchased,
            ]}
          >
            {(item.checked || isPurchased) && <Text style={styles.checkIcon}>✓</Text>}
          </View>
        </TouchableOpacity>

        <View style={styles.itemContent}>
          <View style={styles.itemNameRow}>
            <Text
              style={[
                styles.itemName,
                item.checked && styles.itemNameChecked,
                isPurchased && styles.itemNamePurchased,
              ]}
              numberOfLines={2}
            >
              {item.ingredient_name}
            </Text>
            {/* Manual item badge (Phase F3) */}
            {isManual && !isPurchased && (
              <View style={styles.manualBadge}>
                <Text style={styles.manualBadgeText}>Added by you</Text>
              </View>
            )}
          </View>
          <View style={styles.itemMeta}>
            {displayQuantity ? (
              <Text style={[styles.itemQuantity, isPurchased && styles.itemQuantityPurchased]}>
                {displayQuantity}
              </Text>
            ) : null}
            {isPurchased ? (
              <View style={styles.purchasedBadge}>
                <Text style={styles.purchasedBadgeText}>✓ In Pantry</Text>
              </View>
            ) : showCategoryBadge ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{itemCategory}</Text>
              </View>
            ) : null}
          </View>
          {item.note && (
            <Text style={[styles.itemNote, isPurchased && styles.itemNotePurchased]} numberOfLines={1}>
              {item.note}
            </Text>
          )}
        </View>

        {/* Right side: Mark as Purchased button or Remove button */}
        {isPurchased ? (
          <View style={styles.purchasedIndicator}>
            <Text style={styles.purchasedCheckIcon}>✓</Text>
          </View>
        ) : (
          <View style={styles.itemActions}>
            {/* Mark as Purchased button */}
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={() => handleMarkPurchased(item.id, item.ingredient_name)}
              activeOpacity={0.7}
            >
              <Text style={styles.purchaseButtonText}>🛒</Text>
            </TouchableOpacity>
            {/* Remove button - passes isManual for different confirmation (Phase F3) */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveItem(item.id, item.ingredient_name, isManual)}
              activeOpacity={0.7}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: any }) => (
    <CategoryHeader
      category={section.title}
      itemCount={section.itemCount}
      checkedCount={section.checkedCount}
      isExpanded={section.isExpanded}
      onToggle={() => toggleCategory(section.title)}
    />
  );

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
  const checkedItems = selectedList.items.filter((i: GroceryListItemSummary) => i.checked).length;
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

      {/* Sync Result Modal */}
      <SyncResultModal
        visible={syncModalVisible}
        data={syncModalData}
        onClose={closeSyncModal}
        onViewList={() => {
          closeSyncModal();
          handleRefresh();
        }}
      />

      {/* Sort Dropdown */}
      <SortDropdown
        visible={showSortDropdown}
        currentSort={sortOption}
        onSelect={setSortOption}
        onClose={() => setShowSortDropdown(false)}
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
        {/* Long-press on title opens debug mode (Phase F5) */}
        <Pressable
          style={styles.headerCenter}
          onLongPress={handleOpenDebugMode}
          delayLongPress={800}
        >
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
        </Pressable>
        <TouchableOpacity
          style={styles.deleteListButton}
          onPress={handleDeleteList}
          disabled={deleting}
          activeOpacity={0.7}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={COLORS.danger} />
          ) : (
            <Text style={styles.deleteListButtonText}>Delete</Text>
          )}
        </TouchableOpacity>
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

      {/* Sorting Controls */}
      <View style={styles.sortingBar}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortDropdown(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.sortButtonIcon}>⇅</Text>
          <Text style={styles.sortButtonText}>
            {SORT_OPTIONS.find((o) => o.option === sortOption)?.label || "Sort"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.groupToggle,
            isGrouped && sortOption === "category" && styles.groupToggleActive,
          ]}
          onPress={() => {
            if (sortOption !== "category") {
              setSortOption("category");
              setIsGrouped(true);
            } else {
              setIsGrouped(!isGrouped);
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.groupToggleIcon}>📂</Text>
          <Text
            style={[
              styles.groupToggleText,
              isGrouped && sortOption === "category" && styles.groupToggleTextActive,
            ]}
          >
            Group
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <SyncPantryButton
          list={selectedList}
          canSync={canSyncList(selectedList)}
          creatorName={getListCreatorName(selectedList)}
          onSync={syncWithPantry}
          onSyncComplete={refreshSelectedList}
          disabled={totalItems === 0 || isSyncing}
        />

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

      {/* Phase F4: Rebuild Button - Only show if list is linked to a meal plan */}
      {selectedList.meal_plan_id && (
        <View style={styles.rebuildButtonContainer}>
          <TouchableOpacity
            style={[
              styles.rebuildButton,
              (isRebuilding || isSyncing) && styles.rebuildButtonDisabled,
            ]}
            onPress={handleRebuildFromMealPlan}
            disabled={isRebuilding || isSyncing}
            activeOpacity={0.7}
          >
            {isRebuilding ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <Text style={styles.rebuildButtonIcon}>🔄</Text>
                <Text style={styles.rebuildButtonText}>Rebuild from Meal Plan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Items List */}
      {totalItems === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📝</Text>
          <Text style={styles.emptyStateTitle}>No Items</Text>
          <Text style={styles.emptyStateDescription}>
            Add a meal to add ingredients to this list
          </Text>
        </View>
      ) : isGrouped && sortOption === "category" ? (
        <SectionList
          sections={processedData.sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => `item-${item.id}`}
          contentContainerStyle={styles.listContainer}
          stickySectionHeadersEnabled={true}
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
      ) : (
        <SectionList
          sections={[{ title: "", data: processedData.flatItems }]}
          renderItem={renderItem}
          renderSectionHeader={() => null}
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

// ============================================
// STYLES
// ============================================

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
  deleteListButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteListButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.danger,
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
  sortingBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    gap: 6,
  },
  sortButtonIcon: {
    fontSize: 14,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  groupToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    gap: 6,
  },
  groupToggleActive: {
    backgroundColor: COLORS.primaryLight,
  },
  groupToggleIcon: {
    fontSize: 14,
  },
  groupToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  groupToggleTextActive: {
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 16,
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
  actionButtonSecondary: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryExpandIcon: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  categoryHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
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
  // Phase F3: Item name row with manual badge
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flexShrink: 1,
  },
  // Phase F3: Manual item badge
  manualBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#E3F2FD",
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1976D2",
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  itemNote: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 4,
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
  // Phase F2: Purchased item styles
  itemCardPurchased: {
    backgroundColor: "#F5F5F5",
    opacity: 0.85,
  },
  checkboxPurchased: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  itemNamePurchased: {
    textDecorationLine: "line-through",
    color: "#999999",
  },
  itemQuantityPurchased: {
    color: "#AAAAAA",
  },
  itemNotePurchased: {
    color: "#AAAAAA",
  },
  purchasedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#E8F8F1",
  },
  purchasedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.success,
  },
  purchasedIndicator: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#E8F8F1",
  },
  purchasedCheckIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.success,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  purchaseButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#E8F8F1",
  },
  purchaseButtonText: {
    fontSize: 16,
  },
  // Phase F4: Rebuild button styles
  rebuildButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
  },
  rebuildButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
  },
  rebuildButtonDisabled: {
    opacity: 0.5,
  },
  rebuildButtonIcon: {
    fontSize: 14,
  },
  rebuildButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
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
  // Dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  dropdownContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  dropdownOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  dropdownOptionIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  dropdownOptionText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  dropdownOptionTextSelected: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  dropdownCheckmark: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "700",
  },
});

export default GroceryListDetailScreen;
