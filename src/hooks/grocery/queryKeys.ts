/**
 * ============================================
 * GROCERY LIST QUERY KEYS
 * ============================================
 *
 * Centralized query keys for React Query cache management.
 * These keys are used for cache invalidation and refetching.
 * 
 * Query key structure:
 * - ["groceryList", listId] - Single list
 * - ["personalGroceryLists"] - User's personal lists
 * - ["familyGroceryLists", familyId] - Family lists
 * - ["pantry", userId] - User's pantry
 */

export const groceryQueryKeys = {
  // Base keys
  all: ["grocery"] as const,
  lists: () => [...groceryQueryKeys.all, "lists"] as const,

  // Single list - ["groceryList", listId]
  list: (listId: number) => ["groceryList", listId] as const,

  // Personal lists - ["personalGroceryLists"]
  personalLists: () => ["personalGroceryLists"] as const,

  // Family lists - ["familyGroceryLists", familyId]
  familyLists: (familyId: number) => ["familyGroceryLists", familyId] as const,

  // Items within a list
  listItems: (listId: number) => [...groceryQueryKeys.list(listId), "items"] as const,

  // Debug info for a list (Phase F1)
  listDebug: (listId: number) => [...groceryQueryKeys.list(listId), "debug"] as const,

  // Debug info for meal plan calculations (Phase F5)
  mealPlanDebug: (mealPlanId: number) => [...groceryQueryKeys.all, "mealPlanDebug", mealPlanId] as const,
};

export const pantryQueryKeys = {
  // Base keys
  all: ["pantry"] as const,

  // User's pantry - ["pantry", userId]
  userPantry: (userId: number) => ["pantry", userId] as const,

  // Family pantry
  familyPantry: (familyId: number) => [...pantryQueryKeys.all, "family", familyId] as const,
};

// Type exports for consumers
export type GroceryQueryKey =
  | readonly ["grocery"]
  | readonly ["groceryList", number]
  | readonly ["personalGroceryLists"]
  | readonly ["familyGroceryLists", number]
  | readonly ["groceryList", number, "items"]
  | readonly ["groceryList", number, "debug"]
  | readonly ["grocery", "mealPlanDebug", number];

export type PantryQueryKey =
  | readonly ["pantry"]
  | readonly ["pantry", number]
  | readonly ["pantry", "family", number];
