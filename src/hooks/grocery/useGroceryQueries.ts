/**
 * ============================================
 * REACT QUERY HOOKS FOR GROCERY LISTS
 * ============================================
 *
 * Type-safe React Query hooks with:
 * - No caching (always fresh data)
 * - Optimistic updates for mutations
 * - Proper cache invalidation
 */

import {
  type AddGroceryListItemRequest,
  type CreateManualGroceryItemRequest,
  type GroceryListItemSummary,
  type GroceryListOut,
  type MealPlanDebugInfo,
  type UpdateGroceryListItemRequest,
  addItemToGroceryList,
  clearCheckedItems,
  createManualGroceryItem,
  deleteGroceryListById,
  getFamilyGroceryLists,
  getGroceryListById,
  getGroceryListDebugInfo,
  getMealPlanDebugInfo,
  getMyGroceryLists,
  markItemPurchased,
  rebuildFromMealPlan,
  removeItemFromGroceryList,
  syncGroceryListWithPantry,
  toggleGroceryListItemChecked,
  updateGroceryListItem
} from "@/src/services/grocery.service";
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { groceryQueryKeys, pantryQueryKeys } from "./queryKeys";

// ============================================
// QUERY OPTIONS (NO CACHING)
// ============================================

const NO_CACHE_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 0, // Previously called cacheTime in v4
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: "always" as const,
  refetchOnReconnect: "always" as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch a single grocery list by ID
 */
export function useGroceryList(
  listId: number | null,
  options?: Omit<UseQueryOptions<GroceryListOut, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: groceryQueryKeys.list(listId ?? 0),
    queryFn: () => getGroceryListById(listId!),
    enabled: listId !== null && listId > 0,
    ...NO_CACHE_QUERY_OPTIONS,
    ...options,
  });
}

/**
 * Fetch personal grocery lists
 */
export function usePersonalGroceryLists(
  options?: Omit<UseQueryOptions<GroceryListOut[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: groceryQueryKeys.personalLists(),
    queryFn: () => getMyGroceryLists(),
    ...NO_CACHE_QUERY_OPTIONS,
    ...options,
  });
}

/**
 * Fetch family grocery lists
 */
export function useFamilyGroceryLists(
  familyId: number | null,
  options?: Omit<UseQueryOptions<GroceryListOut[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: groceryQueryKeys.familyLists(familyId ?? 0),
    queryFn: () => getFamilyGroceryLists(familyId!),
    enabled: familyId !== null && familyId > 0,
    ...NO_CACHE_QUERY_OPTIONS,
    ...options,
  });
}

// ============================================
// MUTATION HOOKS WITH OPTIMISTIC UPDATES
// ============================================

interface AddItemMutationVariables {
  listId: number;
  item: AddGroceryListItemRequest;
}

interface UpdateItemMutationVariables {
  listId: number;
  itemId: number;
  updates: UpdateGroceryListItemRequest;
}

interface RemoveItemMutationVariables {
  listId: number;
  itemId: number;
}

interface ToggleItemMutationVariables {
  itemId: number;
  listId: number;
}

interface SyncPantryMutationVariables {
  listId: number;
}

/**
 * Add item mutation with optimistic update
 */
export function useAddItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, item }: AddItemMutationVariables) => {
      return addItemToGroceryList(listId, item);
    },
    onMutate: async ({ listId, item }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: groceryQueryKeys.list(listId) });

      // Snapshot previous value
      const previousList = queryClient.getQueryData<GroceryListOut>(
        groceryQueryKeys.list(listId)
      );

      // Optimistically update the cache
      if (previousList) {
        const optimisticItem: GroceryListItemSummary = {
          id: Date.now(), // Temporary ID
          ingredient_name: item.ingredient_name,
          quantity: item.quantity ?? null,
          unit_code: item.unit_code ?? null,
          checked: false,
          note: item.note ?? null,
          // Phase F1: New fields (defaults for optimistic update)
          canonical_quantity_needed: item.quantity ?? 0,
          canonical_unit: item.unit_code ?? "",
          is_manual: true, // Manual items are always marked as manual
          is_purchased: false,
          source_meal_plan_id: null,
          original_quantity: item.quantity ?? null,
          original_unit: item.unit_code ?? null,
        };

        queryClient.setQueryData<GroceryListOut>(groceryQueryKeys.list(listId), {
          ...previousList,
          items: [...previousList.items, optimisticItem],
        });
      }

      return { previousList };
    },
    onError: (_err, { listId }, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(groceryQueryKeys.list(listId), context.previousList);
      }
    },
    onSettled: (_data, _error, { listId }) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.personalLists() });
    },
  });
}

/**
 * Update item mutation with optimistic update
 */
export function useUpdateItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, itemId, updates }: UpdateItemMutationVariables) => {
      return updateGroceryListItem(listId, itemId, updates);
    },
    onMutate: async ({ listId, itemId, updates }) => {
      await queryClient.cancelQueries({ queryKey: groceryQueryKeys.list(listId) });

      const previousList = queryClient.getQueryData<GroceryListOut>(
        groceryQueryKeys.list(listId)
      );

      if (previousList) {
        queryClient.setQueryData<GroceryListOut>(groceryQueryKeys.list(listId), {
          ...previousList,
          items: previousList.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        });
      }

      return { previousList };
    },
    onError: (_err, { listId }, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(groceryQueryKeys.list(listId), context.previousList);
      }
    },
    onSettled: (_data, _error, { listId }) => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
    },
  });
}

/**
 * Remove item mutation with optimistic update
 */
export function useRemoveItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, itemId }: RemoveItemMutationVariables) => {
      return removeItemFromGroceryList(listId, itemId);
    },
    onMutate: async ({ listId, itemId }) => {
      await queryClient.cancelQueries({ queryKey: groceryQueryKeys.list(listId) });

      const previousList = queryClient.getQueryData<GroceryListOut>(
        groceryQueryKeys.list(listId)
      );

      if (previousList) {
        queryClient.setQueryData<GroceryListOut>(groceryQueryKeys.list(listId), {
          ...previousList,
          items: previousList.items.filter((item) => item.id !== itemId),
        });
      }

      return { previousList };
    },
    onError: (_err, { listId }, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(groceryQueryKeys.list(listId), context.previousList);
      }
    },
    onSettled: (_data, _error, { listId }) => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.personalLists() });
    },
  });
}

/**
 * Toggle item checked mutation with optimistic update
 */
export function useToggleItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: ToggleItemMutationVariables) => {
      return toggleGroceryListItemChecked(itemId);
    },
    onMutate: async ({ listId, itemId }) => {
      await queryClient.cancelQueries({ queryKey: groceryQueryKeys.list(listId) });

      const previousList = queryClient.getQueryData<GroceryListOut>(
        groceryQueryKeys.list(listId)
      );

      if (previousList) {
        queryClient.setQueryData<GroceryListOut>(groceryQueryKeys.list(listId), {
          ...previousList,
          items: previousList.items.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        });
      }

      return { previousList };
    },
    onError: (_err, { listId }, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(groceryQueryKeys.list(listId), context.previousList);
      }
    },
    onSettled: (_data, _error, { listId }) => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
    },
  });
}

/**
 * Sync with pantry mutation (NO optimistic update - relies on backend truth)
 * Always invalidates both grocery list and pantry queries after sync
 */
export function useSyncPantryMutation(userId?: number, familyId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId }: SyncPantryMutationVariables) => {
      return syncGroceryListWithPantry(listId);
    },
    onSettled: (_data, _error, { listId }) => {
      // Invalidate grocery list
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.personalLists() });

      // Also invalidate family lists if familyId provided
      if (familyId) {
        queryClient.invalidateQueries({ queryKey: groceryQueryKeys.familyLists(familyId) });
      }

      // Invalidate pantry queries to reflect sync
      if (userId) {
        queryClient.invalidateQueries({ queryKey: pantryQueryKeys.userPantry(userId) });
      }
      if (familyId) {
        queryClient.invalidateQueries({ queryKey: pantryQueryKeys.familyPantry(familyId) });
      }
    },
  });
}

/**
 * Clear checked items mutation
 */
export function useClearCheckedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: number) => {
      return clearCheckedItems(listId);
    },
    onSettled: (_data, _error, listId) => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.personalLists() });
    },
  });
}

/**
 * Delete list mutation
 */
export function useDeleteListMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: number) => {
      return deleteGroceryListById(listId);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.lists() });
    },
  });
}

// ============================================
// PHASE F1: NEW MUTATION HOOKS
// ============================================

interface RebuildFromMealPlanVariables {
  listId: number;
  mealPlanId: number;
}

interface MarkItemPurchasedVariables {
  itemId: number;
  listId: number;
  isPurchased: boolean;
}

interface CreateManualItemVariables {
  listId: number;
  item: CreateManualGroceryItemRequest;
}

/**
 * Rebuild grocery list from meal plan mutation
 */
export function useRebuildFromMealPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, mealPlanId }: RebuildFromMealPlanVariables) => {
      return rebuildFromMealPlan(listId, mealPlanId);
    },
    onSettled: (_data, _error, { listId }) => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.personalLists() });
    },
  });
}

/**
 * Mark item as purchased mutation with optimistic update
 * Also invalidates pantry queries since purchased items update the pantry
 */
export function useMarkItemPurchasedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isPurchased }: MarkItemPurchasedVariables) => {
      return markItemPurchased(itemId, isPurchased);
    },
    onMutate: async ({ itemId, listId, isPurchased }) => {
      await queryClient.cancelQueries({ queryKey: groceryQueryKeys.list(listId) });

      const previousList = queryClient.getQueryData<GroceryListOut>(
        groceryQueryKeys.list(listId)
      );

      if (previousList) {
        queryClient.setQueryData<GroceryListOut>(groceryQueryKeys.list(listId), {
          ...previousList,
          items: previousList.items.map((item) =>
            item.id === itemId ? { ...item, is_purchased: isPurchased } : item
          ),
        });
      }

      return { previousList };
    },
    onError: (_err, { listId }, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(groceryQueryKeys.list(listId), context.previousList);
      }
    },
    onSettled: (_data, _error, { listId }) => {
      // Invalidate grocery list
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
      // Also invalidate pantry queries since purchased items update the pantry
      queryClient.invalidateQueries({ queryKey: pantryQueryKeys.all });
    },
  });
}

/**
 * Create manual grocery item mutation with optimistic update
 */
export function useCreateManualItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, item }: CreateManualItemVariables) => {
      return createManualGroceryItem(listId, item);
    },
    onMutate: async ({ listId, item }) => {
      await queryClient.cancelQueries({ queryKey: groceryQueryKeys.list(listId) });

      const previousList = queryClient.getQueryData<GroceryListOut>(
        groceryQueryKeys.list(listId)
      );

      if (previousList) {
        const optimisticItem: GroceryListItemSummary = {
          id: Date.now(),
          ingredient_name: item.ingredient_name,
          quantity: item.quantity ?? null,
          unit_code: item.unit_code ?? null,
          checked: false,
          note: item.note ?? null,
          canonical_quantity_needed: item.quantity ?? 0,
          canonical_unit: item.unit_code ?? "",
          is_manual: true,
          is_purchased: false,
          source_meal_plan_id: null,
          original_quantity: item.quantity ?? null,
          original_unit: item.unit_code ?? null,
        };

        queryClient.setQueryData<GroceryListOut>(groceryQueryKeys.list(listId), {
          ...previousList,
          items: [...previousList.items, optimisticItem],
        });
      }

      return { previousList };
    },
    onError: (_err, { listId }, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(groceryQueryKeys.list(listId), context.previousList);
      }
    },
    onSettled: (_data, _error, { listId }) => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.personalLists() });
    },
  });
}

/**
 * Hook to fetch debug info for a grocery list (canonical values)
 */
export function useGroceryListDebugInfo(
  listId: number | null,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: [...groceryQueryKeys.list(listId ?? 0), "debug"] as const,
    queryFn: () => getGroceryListDebugInfo(listId!),
    enabled: enabled && listId !== null && listId > 0,
    ...NO_CACHE_QUERY_OPTIONS,
  });
}

/**
 * Hook to fetch debug info for meal plan grocery calculations (Phase F5)
 * Shows ingredient breakdown with needed, pantry_available, and remaining amounts
 */
export function useMealPlanDebugInfo(
  mealPlanId: number | null,
  options?: { enabled?: boolean }
) {
  return useQuery<MealPlanDebugInfo, Error>({
    queryKey: groceryQueryKeys.mealPlanDebug(mealPlanId ?? 0),
    queryFn: () => getMealPlanDebugInfo(mealPlanId!),
    enabled: (options?.enabled ?? true) && mealPlanId !== null && mealPlanId > 0,
    ...NO_CACHE_QUERY_OPTIONS,
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook to invalidate all grocery queries
 */
export function useInvalidateGroceryQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.all });
    },
    invalidateList: (listId: number) => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.list(listId) });
    },
    invalidatePersonalLists: () => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.personalLists() });
    },
    invalidateFamilyLists: (familyId: number) => {
      queryClient.invalidateQueries({ queryKey: groceryQueryKeys.familyLists(familyId) });
    },
  };
}
