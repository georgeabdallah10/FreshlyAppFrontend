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
  usePersonalGroceryLists,
  useRemoveItemMutation,
  useSyncPantryMutation,
  useToggleItemMutation,
  useUpdateItemMutation,
} from "@/src/hooks/grocery";
import {
  type AddFromRecipeRequest,
  type AddFromRecipeResponse,
  type AddGroceryListItemRequest,
  type GroceryListOut,
  type SyncWithPantryResponse,
  type UpdateGroceryListItemRequest,
  addFromRecipe as addFromRecipeApi,
  getGroceryListById
} from "@/src/services/grocery.service";
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

  // Family lists query
  const {
    data: familyLists = [],
    isLoading: familyListsLoading,
    error: familyListsError,
    refetch: refetchFamilyLists,
  } = useFamilyGroceryLists(isInFamily ? (activeFamilyId ?? null) : null);

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

    try {
      const response = await syncPantryMutation.mutateAsync({ listId });

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
      // Re-throw with status for proper error handling in UI
      if (err?.status === 403) {
        const error = new Error("You do not have permission to sync this list. Only the owner can sync pantry.");
        (error as any).status = 403;
        throw error;
      }
      throw err;
    }
  }, [allLists, syncPantryMutation]);

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

  // Check if current user can sync the list
  // For both personal and family lists, only the owner can sync
  const canSyncList = useCallback((list: GroceryListOut): boolean => {
    if (!user?.id) return false;
    return list.owner_user_id === user.id;
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
