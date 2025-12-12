/**
 * ============================================
 * GROCERY LIST CONTEXT WITH REACT QUERY
 * ============================================
 *
 * Context provider for grocery list state management.
 * Integrates with React Query for data fetching and mutations.
 * Provides optimistic updates for add, update, remove operations.
 * Shows sync result modal after successful pantry sync.
 */

import type { SyncModalData } from "@/components/grocery/SyncResultModal";
import {
  groceryQueryKeys,
  useAddItemMutation,
  useClearCheckedMutation,
  useDeleteListMutation,
  useFamilyGroceryLists,
  useGroceryList as useGroceryListQuery,
  useMarkItemPurchasedMutation,
  usePersonalGroceryLists,
  useRebuildFromMealPlanMutation,
  useRemoveItemMutation,
  useSyncPantryMutation,
  useToggleItemMutation,
  useUpdateItemMutation,
} from "@/src/hooks/grocery";
import {
  addFromRecipe as addFromRecipeApi,
  getGroceryListById,
  type AddFromRecipeRequest,
  type AddFromRecipeResponse,
  type AddGroceryListItemRequest,
  type GroceryListItemSummary,
  type GroceryListOut,
  type RebuildFromMealPlanResponse,
  type SyncWithPantryResponse,
  type UpdateGroceryListItemRequest
} from "@/src/services/grocery.service";
import { listMyPantryItems, type PantryItem } from "@/src/user/pantry";
import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useUser } from "./usercontext";

// ============================================
// TYPES
// ============================================

type GroceryListContextType = {
  // State from React Query
  myLists: GroceryListOut[];
  familyLists: GroceryListOut[];
  allLists: GroceryListOut[];
  selectedListId: number | null;
  selectedList: GroceryListOut | null;
  loading: boolean;
  error: string | null;

  // Sync Modal State
  syncModalVisible: boolean;
  syncModalData: SyncModalData | null;

  // Optimistic state indicator
  isSyncing: boolean;

  // Actions
  setSelectedListId: (id: number | null) => void;
  loadMyLists: () => Promise<void>;
  loadFamilyLists: () => Promise<void>;
  refreshAllLists: () => Promise<void>;
  refreshSelectedList: () => Promise<void>;
  addRecipeToList: (payload: AddFromRecipeRequest) => Promise<AddFromRecipeResponse>;
  toggleItemChecked: (itemId: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearChecked: (listId: number) => Promise<void>;
  syncWithPantry: (listId: number) => Promise<SyncWithPantryResponse>;
  deleteList: (listId: number) => Promise<void>;

  // Item management with optimistic updates
  addItem: (listId: number, item: AddGroceryListItemRequest) => Promise<void>;
  updateItem: (listId: number, itemId: number, updates: UpdateGroceryListItemRequest) => Promise<void>;
  markItemPurchased: (itemId: number, isPurchased?: boolean) => Promise<void>;

  // Phase F4: Rebuild from meal plan
  rebuildFromMealPlan: (listId: number, mealPlanId: number) => Promise<RebuildFromMealPlanResponse>;
  isRebuilding: boolean;

  // Sync modal controls
  closeSyncModal: () => void;

  // Sync permission helper
  canSyncList: (list: GroceryListOut) => boolean;
  getListCreatorName: (list: GroceryListOut) => string;
};

const GroceryListContext = createContext<GroceryListContextType | undefined>(undefined);

// ============================================
// PROVIDER COMPONENT
// ============================================

export const GroceryListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const userContext = useUser();
  const activeFamilyId = userContext?.activeFamilyId;
  const isInFamily = userContext?.isInFamily;
  const user = userContext?.user;
  const queryClient = useQueryClient();

  // Selected list state
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  // Sync modal state
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncModalData, setSyncModalData] = useState<SyncModalData | null>(null);

  // ============================================
  // REACT QUERY HOOKS
  // ============================================

  // Personal lists query
  const {
    data: myLists = [],
    isLoading: myListsLoading,
    error: myListsError,
    refetch: refetchMyLists,
  } = usePersonalGroceryLists();

  // DEBUG: Log personal lists when they change
  React.useEffect(() => {
    if (myLists.length > 0) {
      console.log("\n========== PERSONAL GROCERY LISTS DEBUG ==========");
      console.log(`[GroceryListContext] Loaded ${myLists.length} personal lists`);
      myLists.forEach((list, index) => {
        console.log(`[${index + 1}] List "${list.title}":`, {
          id: list.id,
          scope: list.scope,
          status: list.status,
          owner_user_id: list.owner_user_id,
          created_by_user_id: list.created_by_user_id,
          family_id: list.family_id,
          meal_plan_id: list.meal_plan_id,
        });
      });
      console.log("==================================================\n");
    }
  }, [myLists]);

  // Family lists query
  const {
    data: familyLists = [],
    isLoading: familyListsLoading,
    error: familyListsError,
    refetch: refetchFamilyLists,
  } = useFamilyGroceryLists(isInFamily ? (activeFamilyId ?? null) : null);

  // DEBUG: Log family lists when they change
  React.useEffect(() => {
    if (familyLists.length > 0) {
      console.log("\n========== FAMILY GROCERY LISTS DEBUG ==========");
      console.log(`[GroceryListContext] Loaded ${familyLists.length} family lists`);
      familyLists.forEach((list, index) => {
        console.log(`[${index + 1}] List "${list.title}":`, {
          id: list.id,
          scope: list.scope,
          status: list.status,
          owner_user_id: list.owner_user_id,
          created_by_user_id: list.created_by_user_id,
          family_id: list.family_id,
          meal_plan_id: list.meal_plan_id,
        });
      });
      console.log("==================================================\n");
    }
  }, [familyLists]);

  // Selected list query
  const {
    data: selectedListData,
    refetch: refetchSelectedList,
  } = useGroceryListQuery(selectedListId);

  // Mutations
  const addItemMutation = useAddItemMutation();
  const updateItemMutation = useUpdateItemMutation();
  const removeItemMutation = useRemoveItemMutation();
  const toggleItemMutation = useToggleItemMutation();
  const syncPantryMutation = useSyncPantryMutation(user?.id, activeFamilyId ?? undefined);
  const clearCheckedMutation = useClearCheckedMutation();
  const deleteListMutation = useDeleteListMutation();
  const markItemPurchasedMutation = useMarkItemPurchasedMutation();
  const rebuildMutation = useRebuildFromMealPlanMutation();

  // ============================================
  // DERIVED STATE
  // ============================================

  const allLists = useMemo(() => [...myLists, ...familyLists], [myLists, familyLists]);

  const selectedList = useMemo(() => {
    // Prefer the React Query data for the selected list
    if (selectedListData) return selectedListData;
    // Fallback to finding in combined lists
    return allLists.find((list) => list.id === selectedListId) ?? null;
  }, [selectedListData, allLists, selectedListId]);

  const loading = myListsLoading || familyListsLoading;
  const error = myListsError?.message || familyListsError?.message || null;
  const isSyncing = syncPantryMutation.isPending;
  const isRebuilding = rebuildMutation.isPending;

  // ============================================
  // ACTIONS
  // ============================================

  // Close sync modal
  const closeSyncModal = useCallback(() => {
    setSyncModalVisible(false);
    setSyncModalData(null);
  }, []);

  // Load personal lists (triggers React Query refetch)
  const loadMyLists = useCallback(async () => {
    await refetchMyLists();
  }, [refetchMyLists]);

  // Load family lists
  const loadFamilyLists = useCallback(async () => {
    if (!isInFamily || !activeFamilyId) return;
    await refetchFamilyLists();
  }, [isInFamily, activeFamilyId, refetchFamilyLists]);

  // Refresh all lists
  const refreshAllLists = useCallback(async () => {
    await Promise.all([refetchMyLists(), refetchFamilyLists()]);
  }, [refetchMyLists, refetchFamilyLists]);

  // Refresh selected list
  const refreshSelectedList = useCallback(async () => {
    if (!selectedListId) return;
    await refetchSelectedList();
  }, [selectedListId, refetchSelectedList]);

  // Add recipe to list
  const addRecipeToList = useCallback(async (payload: AddFromRecipeRequest): Promise<AddFromRecipeResponse> => {
    const response = await addFromRecipeApi(payload);
    const { grocery_list } = response;

    // Invalidate appropriate queries
    queryClient.invalidateQueries({ queryKey: groceryQueryKeys.personalLists() });
    if (grocery_list.scope === "family" && grocery_list.family_id) {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.familyLists(grocery_list.family_id) });
    }

    // Select the list
    setSelectedListId(grocery_list.id);
    return response;
  }, [queryClient]);

  // Toggle item checked (optimistic)
  const toggleItemChecked = useCallback(async (itemId: number) => {
    if (!selectedListId) return;

    await toggleItemMutation.mutateAsync({
      itemId,
      listId: selectedListId,
    });
  }, [selectedListId, toggleItemMutation]);

  // Remove item (optimistic)
  const removeItem = useCallback(async (itemId: number) => {
    if (!selectedListId) return;

    await removeItemMutation.mutateAsync({
      itemId,
      listId: selectedListId,
    });
  }, [selectedListId, removeItemMutation]);

  // Clear checked items
  const clearChecked = useCallback(async (listId: number) => {
    await clearCheckedMutation.mutateAsync(listId);
  }, [clearCheckedMutation]);

  // Sync with pantry - shows modal on success
  const syncWithPantry = useCallback(async (listId: number): Promise<SyncWithPantryResponse> => {
    // Get the list before sync to track removed items
    const listBeforeSync = allLists.find((l) => l.id === listId);
    const itemsBefore = listBeforeSync?.items || [];

    // ========== DEBUG: Log grocery list items BEFORE sync ==========
    console.log("\n[GroceryListContext] ========== PRE-SYNC DEBUG ==========");
    console.log("[GroceryListContext] User context:", {
      userId: user?.id,
      activeFamilyId,
      isInFamily,
    });
    console.log("[GroceryListContext] List to sync:", {
      listId,
      scope: listBeforeSync?.scope,
      family_id: listBeforeSync?.family_id,
      owner_user_id: listBeforeSync?.owner_user_id,
    });

    console.log("\n[GroceryListContext] Grocery List Items:");
    itemsBefore.forEach((item: GroceryListItemSummary, index: number) => {
      console.log(`  [${index + 1}] ${item.ingredient_name}:`, {
        id: item.id,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        unit_code: item.unit_code,
        canonical_quantity_needed: item.canonical_quantity_needed,
        canonical_unit: item.canonical_unit,
        is_manual: item.is_manual,
        original_quantity: item.original_quantity,
        original_unit: item.original_unit,
      });
    });

    // Check for NULL canonical values
    const itemsWithNullCanonical = itemsBefore.filter(
      (item: GroceryListItemSummary) =>
        item.canonical_quantity_needed === null ||
        item.canonical_quantity_needed === undefined ||
        item.canonical_unit === null ||
        item.canonical_unit === undefined
    );
    if (itemsWithNullCanonical.length > 0) {
      console.warn("\n[GroceryListContext] ⚠️ WARNING: Items with NULL canonical values:");
      itemsWithNullCanonical.forEach((item: GroceryListItemSummary) => {
        console.warn(`  - ${item.ingredient_name}: canonical_quantity_needed=${item.canonical_quantity_needed}, canonical_unit=${item.canonical_unit}`);
      });
    }

    // ========== DEBUG: Fetch and log pantry items ==========
    try {
      // Determine which pantry to fetch based on list scope and family context
      const shouldUseFamilyPantry = listBeforeSync?.scope === "family" && listBeforeSync?.family_id;
      const pantryFamilyId = shouldUseFamilyPantry ? listBeforeSync.family_id : (isInFamily ? activeFamilyId : null);

      console.log("\n[GroceryListContext] Fetching pantry with:", {
        shouldUseFamilyPantry,
        pantryFamilyId,
        listScope: listBeforeSync?.scope,
        listFamilyId: listBeforeSync?.family_id,
      });

      const pantryItems = await listMyPantryItems({ familyId: pantryFamilyId });

      console.log(`\n[GroceryListContext] Pantry Items (${pantryItems.length} total):`);
      pantryItems.forEach((item: PantryItem, index: number) => {
        console.log(`  [${index + 1}] ${item.ingredient_name}:`, {
          id: item.id,
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          unit: item.unit,
          canonical_quantity: item.canonical_quantity,
          canonical_unit: item.canonical_unit,
          family_id: item.family_id,
          owner_user_id: item.owner_user_id,
          scope: item.scope,
        });
      });

      // Check for NULL canonical values in pantry
      const pantryItemsWithNullCanonical = pantryItems.filter(
        (item: PantryItem) =>
          item.canonical_quantity === null ||
          item.canonical_quantity === undefined ||
          item.canonical_unit === null ||
          item.canonical_unit === undefined
      );
      if (pantryItemsWithNullCanonical.length > 0) {
        console.warn("\n[GroceryListContext] ⚠️ WARNING: Pantry items with NULL canonical values:");
        pantryItemsWithNullCanonical.forEach((item: PantryItem) => {
          console.warn(`  - ${item.ingredient_name}: canonical_quantity=${item.canonical_quantity}, canonical_unit=${item.canonical_unit}`);
        });
      }

      // ========== DEBUG: Compare ingredient_ids ==========
      console.log("\n[GroceryListContext] ========== INGREDIENT ID COMPARISON ==========");
      const pantryIngredientIds = new Set(
        pantryItems
          .filter((p: PantryItem) => p.ingredient_id !== null && p.ingredient_id !== undefined)
          .map((p: PantryItem) => p.ingredient_id)
      );

      console.log("[GroceryListContext] Pantry ingredient_ids:", Array.from(pantryIngredientIds));

      itemsBefore.forEach((groceryItem: GroceryListItemSummary) => {
        const inPantry = groceryItem.ingredient_id !== null &&
                         groceryItem.ingredient_id !== undefined &&
                         pantryIngredientIds.has(groceryItem.ingredient_id);
        const matchingPantryItem = pantryItems.find((p: PantryItem) => p.ingredient_id === groceryItem.ingredient_id);

        console.log(`  ${groceryItem.ingredient_name}:`, {
          grocery_ingredient_id: groceryItem.ingredient_id,
          foundInPantry: inPantry,
          pantryMatch: matchingPantryItem ? {
            pantry_ingredient_id: matchingPantryItem.ingredient_id,
            pantry_quantity: matchingPantryItem.quantity,
            pantry_unit: matchingPantryItem.unit,
          } : null,
        });
      });

      // Check for items with NULL ingredient_id
      const groceryItemsWithNullIngredientId = itemsBefore.filter(
        (item: GroceryListItemSummary) => item.ingredient_id === null || item.ingredient_id === undefined
      );
      if (groceryItemsWithNullIngredientId.length > 0) {
        console.warn("\n[GroceryListContext] ⚠️ WARNING: Grocery items with NULL ingredient_id (won't match pantry):");
        groceryItemsWithNullIngredientId.forEach((item: GroceryListItemSummary) => {
          console.warn(`  - ${item.ingredient_name}`);
        });
      }

      const pantryItemsWithNullIngredientId = pantryItems.filter(
        (item: PantryItem) => item.ingredient_id === null || item.ingredient_id === undefined
      );
      if (pantryItemsWithNullIngredientId.length > 0) {
        console.warn("\n[GroceryListContext] ⚠️ WARNING: Pantry items with NULL ingredient_id:");
        pantryItemsWithNullIngredientId.forEach((item: PantryItem) => {
          console.warn(`  - ${item.ingredient_name}`);
        });
      }

    } catch (debugErr) {
      console.log("[GroceryListContext] Error fetching pantry for debug:", debugErr);
    }

    console.log("\n[GroceryListContext] ========== CALLING SYNC API ==========");

    try {
      const response = await syncPantryMutation.mutateAsync({ listId });

      // ========== DEBUG: Log sync response ==========
      console.log("\n[GroceryListContext] ========== SYNC RESPONSE ==========");
      console.log("[GroceryListContext] Response:", {
        items_removed: response.items_removed,
        items_updated: response.items_updated,
        remaining_items_count: response.remaining_items?.length ?? 0,
        message: response.message,
      });

      if (response.remaining_items && response.remaining_items.length > 0) {
        console.log("\n[GroceryListContext] Remaining items after sync:");
        response.remaining_items.forEach((item, index) => {
          console.log(`  [${index + 1}] ${item.ingredient_name}:`, {
            ingredient_id: item.ingredient_id,
            quantity: item.quantity,
            unit_code: item.unit_code,
            canonical_quantity: item.canonical_quantity,
            canonical_unit: item.canonical_unit,
            note: item.note,
          });
        });
      }
      console.log("========== END SYNC DEBUG ==========\n");

      // Refetch to get updated list
      const updatedList = await getGroceryListById(listId);
      const itemsAfter = updatedList?.items || [];

      // Calculate removed items
      const afterIds = new Set(itemsAfter.map((i) => i.id));
      const removedItems = itemsBefore.filter((i) => !afterIds.has(i.id));
      const removedItemNames = removedItems.map((i) => i.ingredient_name);

      // Show the sync result modal
      setSyncModalData({
        response,
        updatedList,
        removedItemNames,
        updatedItemNames: [],
      });
      setSyncModalVisible(true);

      return response;
    } catch (err: any) {
      console.log("[GroceryListContext] Sync error:", err);
      console.log("HELLLO")
      console.log(err)
      // Re-throw with status for proper error handling in UI
      if (err?.status === 403) {
        const error = new Error("You do not have permission to sync this list. Only the owner can sync pantry.");
        (error as any).status = 403;
        throw error;
      }
      throw err;
    }
  }, [allLists, syncPantryMutation, user?.id, activeFamilyId, isInFamily]);

  // Delete grocery list
  const deleteList = useCallback(async (listId: number): Promise<void> => {
    await deleteListMutation.mutateAsync(listId);

    // Clear selection if this was the selected list
    if (selectedListId === listId) {
      setSelectedListId(null);
    }
  }, [selectedListId, deleteListMutation]);

  // Add item with optimistic update
  const addItem = useCallback(async (listId: number, item: AddGroceryListItemRequest): Promise<void> => {
    await addItemMutation.mutateAsync({ listId, item });
  }, [addItemMutation]);

  // Update item with optimistic update
  const updateItem = useCallback(async (
    listId: number,
    itemId: number,
    updates: UpdateGroceryListItemRequest
  ): Promise<void> => {
    await updateItemMutation.mutateAsync({ listId, itemId, updates });
  }, [updateItemMutation]);

  // Mark item as purchased (updates pantry automatically)
  const markItemPurchased = useCallback(async (itemId: number, isPurchased: boolean = true): Promise<void> => {
    if (!selectedListId) return;
    await markItemPurchasedMutation.mutateAsync({
      itemId,
      listId: selectedListId,
      isPurchased,
    });
  }, [selectedListId, markItemPurchasedMutation]);

  // Phase F4: Rebuild grocery list from meal plan
  const rebuildFromMealPlan = useCallback(async (
    listId: number,
    mealPlanId: number
  ): Promise<RebuildFromMealPlanResponse> => {
    const response = await rebuildMutation.mutateAsync({ listId, mealPlanId });
    return response;
  }, [rebuildMutation]);

  // Check if current user can sync the list
  // Use owner_user_id for permission checks
  const canSyncList = useCallback((list: GroceryListOut): boolean => {
    if (!user?.id) {
      console.log("[canSyncList] No user ID available");
      return false;
    }
    
    console.log("\n========== CAN SYNC CHECK ==========");
    console.log(`[canSyncList] Checking list "${list.title}" (ID: ${list.id})`);
    console.log(`[canSyncList] List scope: ${list.scope}`);
    console.log(`[canSyncList] List owner_user_id: ${list.owner_user_id} (type: ${typeof list.owner_user_id})`);
    console.log(`[canSyncList] Current user ID: ${user.id} (type: ${typeof user.id})`);
    console.log(`[canSyncList] List created_by_user_id: ${list.created_by_user_id}`);
    
    const canSync = list.owner_user_id === user.id;
    
    console.log(`[canSyncList] Result: ${canSync}`);
    console.log("====================================\n");
    
    return canSync;
  }, [user?.id]);

  // Get the creator name for display
  const getListCreatorName = useCallback((list: GroceryListOut): string => {
    if (!user?.id) return "Unknown";

    if (list.created_by_user_id === user.id) {
      return "You";
    }

    if (list.scope === "family") {
      return "Family member";
    }

    return "Another user";
  }, [user?.id]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo<GroceryListContextType>(() => ({
    myLists,
    familyLists,
    allLists,
    selectedListId,
    selectedList,
    loading,
    error,
    setSelectedListId,
    loadMyLists,
    loadFamilyLists,
    refreshAllLists,
    refreshSelectedList,
    addRecipeToList,
    toggleItemChecked,
    removeItem,
    clearChecked,
    syncWithPantry,
    deleteList,
    addItem,
    updateItem,
    markItemPurchased,
    rebuildFromMealPlan,
    isRebuilding,
    canSyncList,
    getListCreatorName,
    syncModalVisible,
    syncModalData,
    closeSyncModal,
    isSyncing,
  }), [
    myLists,
    familyLists,
    allLists,
    selectedListId,
    selectedList,
    loading,
    error,
    loadMyLists,
    loadFamilyLists,
    refreshAllLists,
    refreshSelectedList,
    addRecipeToList,
    toggleItemChecked,
    removeItem,
    clearChecked,
    syncWithPantry,
    deleteList,
    addItem,
    updateItem,
    markItemPurchased,
    rebuildFromMealPlan,
    isRebuilding,
    canSyncList,
    getListCreatorName,
    syncModalVisible,
    syncModalData,
    closeSyncModal,
    isSyncing,
  ]);

  return (
    <GroceryListContext.Provider value={value}>
      {children}
    </GroceryListContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useGroceryList = () => {
  const ctx = useContext(GroceryListContext);
  if (!ctx) console.log("useGroceryList must be used within GroceryListProvider");
  return ctx;
};
