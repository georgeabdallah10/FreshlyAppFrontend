import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useUser } from "./usercontext";
import {
  type GroceryListOut,
  type AddFromRecipeRequest,
  type AddFromRecipeResponse,
  type SyncWithPantryResponse,
  getMyGroceryLists,
  getFamilyGroceryLists,
  getGroceryListById,
  addFromRecipe as addFromRecipeApi,
  toggleGroceryListItemChecked as toggleItemApi,
  deleteGroceryListItem as deleteItemApi,
  clearCheckedItems as clearCheckedApi,
  syncGroceryListWithPantry as syncWithPantryApi,
} from "@/src/services/grocery.service";

type GroceryListContextType = {
  // State
  myLists: GroceryListOut[];
  familyLists: GroceryListOut[];
  allLists: GroceryListOut[];
  selectedListId: number | null;
  selectedList: GroceryListOut | null;
  loading: boolean;
  error: string | null;

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
};

const GroceryListContext = createContext<GroceryListContextType | undefined>(undefined);

export const GroceryListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeFamilyId, isInFamily } = useUser();

  const [myLists, setMyLists] = useState<GroceryListOut[]>([]);
  const [familyLists, setFamilyLists] = useState<GroceryListOut[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allLists = [...myLists, ...familyLists];
  const selectedList = allLists.find((list) => list.id === selectedListId) ?? null;

  // Load personal lists
  const loadMyLists = useCallback(async () => {
    try {
      setLoading(true);
      const lists = await getMyGroceryLists();
      setMyLists(lists);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load personal lists");
      console.log("[GroceryListContext] loadMyLists error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load family lists
  const loadFamilyLists = useCallback(async () => {
    if (!isInFamily || !activeFamilyId) {
      setFamilyLists([]);
      return;
    }
    try {
      setLoading(true);
      const lists = await getFamilyGroceryLists(activeFamilyId);
      setFamilyLists(lists);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load family lists");
      console.error("[GroceryListContext] loadFamilyLists error:", err);
    } finally {
      setLoading(false);
    }
  }, [isInFamily, activeFamilyId]);

  // Refresh all lists
  const refreshAllLists = useCallback(async () => {
    await Promise.all([loadMyLists(), loadFamilyLists()]);
  }, [loadMyLists, loadFamilyLists]);

  // Refresh selected list
  const refreshSelectedList = useCallback(async () => {
    if (!selectedListId) return;
    try {
      const updatedList = await getGroceryListById(selectedListId);
      // Update in correct array based on scope
      if (updatedList.scope === "personal") {
        setMyLists((prev) => prev.map((l) => (l.id === updatedList.id ? updatedList : l)));
      } else {
        setFamilyLists((prev) => prev.map((l) => (l.id === updatedList.id ? updatedList : l)));
      }
    } catch (err: any) {
      console.error("[GroceryListContext] refreshSelectedList error:", err);
      throw err;
    }
  }, [selectedListId]);

  // Add recipe to list
  const addRecipeToList = useCallback(async (payload: AddFromRecipeRequest): Promise<AddFromRecipeResponse> => {
    const response = await addFromRecipeApi(payload);
    const { grocery_list } = response;

    // Add or update list in correct array
    if (grocery_list.scope === "personal") {
      setMyLists((prev) => {
        const existingIndex = prev.findIndex((l) => l.id === grocery_list.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = grocery_list;
          return updated;
        }
        return [...prev, grocery_list];
      });
    } else {
      setFamilyLists((prev) => {
        const existingIndex = prev.findIndex((l) => l.id === grocery_list.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = grocery_list;
          return updated;
        }
        return [...prev, grocery_list];
      });
    }

    // Select the list
    setSelectedListId(grocery_list.id);
    return response;
  }, []);

  // Toggle item checked (optimistic update)
  const toggleItemChecked = useCallback(async (itemId: number) => {
    if (!selectedList) return;

    // Optimistic update
    const updateList = (list: GroceryListOut) => {
      if (list.id !== selectedList.id) return list;
      return {
        ...list,
        items: list.items.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        ),
      };
    };

    const prevMyLists = myLists;
    const prevFamilyLists = familyLists;

    if (selectedList.scope === "personal") {
      setMyLists((prev) => prev.map(updateList));
    } else {
      setFamilyLists((prev) => prev.map(updateList));
    }

    try {
      await toggleItemApi(itemId);
    } catch (err) {
      // Rollback on error
      setMyLists(prevMyLists);
      setFamilyLists(prevFamilyLists);
      throw err;
    }
  }, [selectedList, myLists, familyLists]);

  // Remove item (optimistic update)
  const removeItem = useCallback(async (itemId: number) => {
    if (!selectedList) return;

    const updateList = (list: GroceryListOut) => {
      if (list.id !== selectedList.id) return list;
      return {
        ...list,
        items: list.items.filter((item) => item.id !== itemId),
      };
    };

    const prevMyLists = myLists;
    const prevFamilyLists = familyLists;

    if (selectedList.scope === "personal") {
      setMyLists((prev) => prev.map(updateList));
    } else {
      setFamilyLists((prev) => prev.map(updateList));
    }

    try {
      await deleteItemApi(itemId);
    } catch (err) {
      // Rollback on error
      setMyLists(prevMyLists);
      setFamilyLists(prevFamilyLists);
      throw err;
    }
  }, [selectedList, myLists, familyLists]);

  // Clear checked items
  const clearChecked = useCallback(async (listId: number) => {
    await clearCheckedApi(listId);
    await refreshSelectedList();
  }, [refreshSelectedList]);

  // Sync with pantry
  const syncWithPantry = useCallback(async (listId: number): Promise<SyncWithPantryResponse> => {
    const response = await syncWithPantryApi(listId);
    await refreshSelectedList();
    return response;
  }, [refreshSelectedList]);

  // Auto-load on mount and when family changes
  useEffect(() => {
    refreshAllLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFamilyId]);

  return (
    <GroceryListContext.Provider
      value={{
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
      }}
    >
      {children}
    </GroceryListContext.Provider>
  );
};

export const useGroceryList = () => {
  const ctx = useContext(GroceryListContext);
  if (!ctx) throw new Error("useGroceryList must be used within GroceryListProvider");
  return ctx;
};
