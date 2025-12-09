/**
 * ============================================
 * GROCERY API SERVICE
 * ============================================
 */

import { apiClient } from '../client/apiClient';

// ============================================
// TYPES
// ============================================

export interface GroceryItem {
  id: number;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  isChecked: boolean;
  notes?: string;
  mealId?: number;
}

export interface GroceryList {
  id: number;
  name: string;
  items: GroceryItem[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateGroceryListInput {
  name: string;
  items?: Omit<GroceryItem, 'id' | 'isChecked'>[];
}

export interface AddGroceryItemInput {
  listId: number;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  notes?: string;
}

// ============================================
// NEW BACKEND-ALIGNED TYPES
// ============================================

export type GroceryListScope = "personal" | "family";
export type GroceryListStatus = "draft" | "finalized" | "purchased";

export interface GroceryListItemSummary {
  id: number;
  ingredient_id?: number;
  ingredient_name: string;
  quantity: number | null;
  unit_code: string | null;
  checked: boolean;
  note?: string | null;
  // New fields from backend (Phase F1)
  canonical_quantity_needed: number;
  canonical_unit: string;
  is_manual: boolean;
  is_purchased: boolean;
  source_meal_plan_id: number | null;
  // Original display values (preferred for UI display)
  original_quantity?: number | null;
  original_unit?: string | null;
}

export interface GroceryListOut {
  id: number;
  family_id: number | null;
  owner_user_id: number | null;
  created_by_user_id: number; // User who created the list (required for sync permission check)
  scope: GroceryListScope;
  meal_plan_id?: number | null;
  title: string | null;
  status: GroceryListStatus;
  created_at: string;
  updated_at: string; // Last update timestamp
  items: GroceryListItemSummary[];
}

export interface MissingIngredient {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit_code: string | null;
  note?: string | null;
  source: "not_in_pantry" | "personal_pantry" | "family_pantry";
}

export interface AddFromRecipeRequest {
  meal_id: number; // The meal ID to add ingredients from (backend also accepts recipe_id)
  list_id?: number; // Optional: add to existing list
  scope?: GroceryListScope; // Required when creating new list
  family_id?: number; // Required when scope is "family"
  title?: string;
  servings_multiplier?: number;
}

export interface AddFromRecipeResponse {
  grocery_list: GroceryListOut;
  items_added: number;
  missing_ingredients: MissingIngredient[];
  message: string;
}

/**
 * Item remaining after sync with pantry
 * Represents what the user still needs to purchase
 * 
 * NOTE: Items can have EITHER parsed quantities OR notes:
 * - If quantity and unit_code are populated, use those for display
 * - If quantity is null, use the note field for display (e.g., "2 cups")
 */
export interface SyncRemainingItem {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number | null;
  unit_code: string | null;
  canonical_quantity: number | null;
  canonical_unit: string | null; // 'g' | 'ml' | 'count' | null
  note: string | null;
}

/**
 * Helper to get display-friendly quantity string for a remaining item
 */
export function getDisplayQuantity(item: SyncRemainingItem): string {
  if (item.quantity !== null && item.unit_code !== null) {
    return `${item.quantity} ${item.unit_code}`;
  }
  if (item.quantity !== null) {
    return `${item.quantity}`;
  }
  if (item.note) {
    return item.note;
  }
  return ''; // No quantity info available
}

export interface SyncWithPantryResponse {
  items_removed: number;
  items_updated: number;
  remaining_items: SyncRemainingItem[];
  message: string;
  grocery_list?: GroceryListOut; // Updated list after sync (optional, may be removed)
}

// ============================================
// NEW ITEM MANAGEMENT TYPES
// ============================================

export interface AddGroceryListItemRequest {
  ingredient_name: string;
  quantity?: number | null;
  unit_code?: string | null;
  note?: string | null;
}

export interface UpdateGroceryListItemRequest {
  ingredient_name?: string;
  quantity?: number | null;
  unit_code?: string | null;
  note?: string | null;
  checked?: boolean;
}

// ============================================
// NO-CACHE HEADERS CONFIG
// ============================================

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all grocery lists
 */
export async function getGroceryLists(): Promise<GroceryList[]> {
  return await apiClient.get<GroceryList[]>('/grocery/lists');
}

/**
 * Get active grocery list
 */
export async function getActiveGroceryList(): Promise<GroceryList | null> {
  return await apiClient.get<GroceryList | null>('/grocery/lists/active');
}

/**
 * Get a specific grocery list
 */
export async function getGroceryList(id: number): Promise<GroceryList> {
  return await apiClient.get<GroceryList>(`/grocery/lists/${id}`);
}

/**
 * Create a new grocery list
 */
export async function createGroceryList(input: CreateGroceryListInput): Promise<GroceryList> {
  return await apiClient.post<GroceryList>('/grocery/lists', input);
}

/**
 * Update grocery list name
 */
export async function updateGroceryList(id: number, name: string): Promise<GroceryList> {
  return await apiClient.put<GroceryList>(`/grocery/lists/${id}`, { name });
}

/**
 * Delete a grocery list
 */
export async function deleteGroceryList(id: number): Promise<void> {
  await apiClient.delete(`/grocery/lists/${id}`);
}

/**
 * Add item to grocery list
 */
export async function addGroceryItem(input: AddGroceryItemInput): Promise<GroceryItem> {
  const { listId, ...itemData } = input;
  return await apiClient.post<GroceryItem>(`/grocery/lists/${listId}/items`, itemData);
}

/**
 * Update grocery item
 */
export async function updateGroceryItem(listId: number, itemId: number, updates: Partial<GroceryItem>): Promise<GroceryItem> {
  return await apiClient.put<GroceryItem>(`/grocery/lists/${listId}/items/${itemId}`, updates);
}

/**
 * Delete grocery item
 */
export async function deleteGroceryItem(listId: number, itemId: number): Promise<void> {
  await apiClient.delete(`/grocery/lists/${listId}/items/${itemId}`);
}

/**
 * Toggle item checked status
 */
export async function toggleGroceryItem(listId: number, itemId: number, isChecked: boolean): Promise<GroceryItem> {
  return await apiClient.patch<GroceryItem>(`/grocery/lists/${listId}/items/${itemId}/toggle`, { isChecked });
}

/**
 * Generate grocery list from meals
 */
export async function generateGroceryListFromMeals(mealIds: number[]): Promise<GroceryList> {
  return await apiClient.post<GroceryList>('/grocery/generate', { meal_ids: mealIds });
}

/**
 * Get grocery suggestions based on pantry
 */
export async function getGrocerySuggestions(): Promise<GroceryItem[]> {
  return await apiClient.get<GroceryItem[]>('/grocery/suggestions');
}

// ============================================
// NEW ENDPOINTS MATCHING BACKEND SPEC
// ============================================

/**
 * Get family grocery lists (with no-cache headers)
 */
export async function getFamilyGroceryLists(
  family_id: number,
  status?: GroceryListStatus
): Promise<GroceryListOut[]> {
  const params = status ? `?status=${status}` : '';
  return await apiClient.get<GroceryListOut[]>(`/grocery-lists/family/${family_id}${params}`, {
    headers: NO_CACHE_HEADERS,
  });
}

/**
 * Get my personal grocery lists (with no-cache headers)
 */
export async function getMyGroceryLists(
  status?: GroceryListStatus
): Promise<GroceryListOut[]> {
  const params = status ? `?status=${status}` : '';
  return await apiClient.get<GroceryListOut[]>(`/grocery-lists/me${params}`, {
    headers: NO_CACHE_HEADERS,
  });
}

/**
 * Get a specific grocery list by ID (with no-cache headers)
 */
export async function getGroceryListById(list_id: number): Promise<GroceryListOut> {
  return await apiClient.get<GroceryListOut>(`/grocery-lists/${list_id}`, {
    headers: NO_CACHE_HEADERS,
  });
}

/**
 * Add recipe ingredients to grocery list
 * Backend handles pantry comparison based on scope
 */
export async function addFromRecipe(
  payload: AddFromRecipeRequest
): Promise<AddFromRecipeResponse> {
  return await apiClient.post<AddFromRecipeResponse>('/grocery-lists/add-from-recipe', payload);
}

/**
 * Toggle checked status of a grocery list item
 */
export async function toggleGroceryListItemChecked(item_id: number): Promise<GroceryListItemSummary> {
  return await apiClient.post<GroceryListItemSummary>(`/grocery-lists/items/${item_id}/check`, {});
}

/**
 * Delete a grocery list item
 */
export async function deleteGroceryListItem(item_id: number): Promise<{ message: string }> {
  return await apiClient.delete<{ message: string }>(`/grocery-lists/items/${item_id}`);
}

/**
 * Clear all checked items from a grocery list
 */
export async function clearCheckedItems(list_id: number): Promise<{ message: string; items_removed: number }> {
  return await apiClient.delete<{ message: string; items_removed: number }>(`/grocery-lists/${list_id}/items/checked`);
}

/**
 * Sync grocery list with pantry
 * Only the owner (owner_user_id) can sync the list
 * Uses the correct endpoint: POST /grocery-lists/{list_id}/sync-pantry
 */
export async function syncGroceryListWithPantry(list_id: number): Promise<SyncWithPantryResponse> {
  console.log(`[grocery.service] POST /grocery-lists/${list_id}/sync-pantry`);
  const response = await apiClient.post<SyncWithPantryResponse>(`/grocery-lists/${list_id}/sync-pantry`);
  console.log("[grocery.service] Sync response:", JSON.stringify(response, null, 2));
  return response;
}

/**
 * Delete a grocery list (new endpoint)
 */
export async function deleteGroceryListById(list_id: number): Promise<{ message: string }> {
  return await apiClient.delete<{ message: string }>(`/grocery-lists/${list_id}`);
}

// ============================================
// ITEM MANAGEMENT ENDPOINTS (NO FULL LIST REPLACEMENT)
// ============================================

/**
 * Add a single item to a grocery list
 * POST /grocery-lists/{id}/add-item
 */
export async function addItemToGroceryList(
  list_id: number,
  item: AddGroceryListItemRequest
): Promise<GroceryListItemSummary> {
  return await apiClient.post<GroceryListItemSummary>(
    `/grocery-lists/${list_id}/add-item`,
    item
  );
}

/**
 * Update a single item in a grocery list
 * PATCH /grocery-lists/{list_id}/update-item/{item_id}
 */
export async function updateGroceryListItem(
  list_id: number,
  item_id: number,
  updates: UpdateGroceryListItemRequest
): Promise<GroceryListItemSummary> {
  return await apiClient.patch<GroceryListItemSummary>(
    `/grocery-lists/${list_id}/update-item/${item_id}`,
    updates
  );
}

/**
 * Remove a single item from a grocery list
 * DELETE /grocery-lists/{list_id}/remove-item/{item_id}
 */
export async function removeItemFromGroceryList(
  list_id: number,
  item_id: number
): Promise<{ message: string }> {
  return await apiClient.delete<{ message: string }>(
    `/grocery-lists/${list_id}/remove-item/${item_id}`
  );
}

// ============================================
// PHASE F1: NEW ENDPOINTS
// ============================================

/**
 * Request payload for creating a manual grocery item
 */
export interface CreateManualGroceryItemRequest {
  ingredient_name: string;
  quantity?: number | null;
  unit_code?: string | null;
  note?: string | null;
}

/**
 * Response from rebuild from meal plan
 */
export interface RebuildFromMealPlanResponse {
  grocery_list: GroceryListOut;
  items_rebuilt: number;
  message: string;
}

/**
 * Response from debug endpoint with canonical values
 */
export interface GroceryListDebugInfo {
  list_id: number;
  items: Array<{
    id: number;
    ingredient_name: string;
    original_quantity: number | null;
    original_unit: string | null;
    canonical_quantity_needed: number;
    canonical_unit: string;
    is_manual: boolean;
    is_purchased: boolean;
    source_meal_plan_id: number | null;
  }>;
}

/**
 * Rebuild grocery list from meal plan
 * POST /grocery-lists/{list_id}/rebuild-from-meal-plan
 */
export async function rebuildFromMealPlan(
  list_id: number,
  meal_plan_id: number
): Promise<RebuildFromMealPlanResponse> {
  return await apiClient.post<RebuildFromMealPlanResponse>(
    `/grocery-lists/${list_id}/rebuild-from-meal-plan`,
    { meal_plan_id }
  );
}

/**
 * Mark a grocery list item as purchased
 * POST /grocery-lists/items/{item_id}/purchased
 */
export async function markItemPurchased(
  item_id: number,
  is_purchased: boolean = true
): Promise<GroceryListItemSummary> {
  return await apiClient.post<GroceryListItemSummary>(
    `/grocery-lists/items/${item_id}/purchased`,
    { is_purchased }
  );
}

/**
 * Create a manual grocery item (not from recipe/meal plan)
 * POST /grocery-lists/{list_id}/add-manual-item
 */
export async function createManualGroceryItem(
  list_id: number,
  item: CreateManualGroceryItemRequest
): Promise<GroceryListItemSummary> {
  return await apiClient.post<GroceryListItemSummary>(
    `/grocery-lists/${list_id}/add-manual-item`,
    item
  );
}

/**
 * Get debug info for a grocery list (shows canonical values)
 * GET /grocery-lists/{list_id}/debug
 */
export async function getGroceryListDebugInfo(
  list_id: number
): Promise<GroceryListDebugInfo> {
  return await apiClient.get<GroceryListDebugInfo>(
    `/grocery-lists/${list_id}/debug`
  );
}

// ============================================
// PHASE F5: MEAL PLAN DEBUG ENDPOINT
// ============================================

/**
 * Debug info for a single ingredient in meal plan context
 */
export interface MealPlanDebugIngredient {
  ingredient_name: string;
  canonical_unit: string;
  needed: number;
  pantry_available: number;
  remaining: number;
}

/**
 * Response from meal plan debug endpoint
 */
export interface MealPlanDebugInfo {
  meal_plan_id: number;
  ingredients: MealPlanDebugIngredient[];
  summary: {
    total_items_needed: number;
    total_in_pantry: number;
    total_to_buy: number;
  };
}

/**
 * Get debug info for meal plan grocery calculations
 * GET /grocery-lists/debug/meal-plan/{meal_plan_id}
 * 
 * Shows ingredient breakdown with:
 * - needed: total required from recipes
 * - pantry_available: what's in pantry
 * - remaining: what needs to be purchased
 */
export async function getMealPlanDebugInfo(
  meal_plan_id: number
): Promise<MealPlanDebugInfo> {
  return await apiClient.get<MealPlanDebugInfo>(
    `/grocery-lists/debug/meal-plan/${meal_plan_id}`
  );
}

// ============================================
// EXPORT ALL
// ============================================

export const groceryService = {
  getGroceryLists,
  getActiveGroceryList,
  getGroceryList,
  createGroceryList,
  updateGroceryList,
  deleteGroceryList,
  addGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  toggleGroceryItem,
  generateGroceryListFromMeals,
  getGrocerySuggestions,
  // New endpoints
  getFamilyGroceryLists,
  getMyGroceryLists,
  getGroceryListById,
  addFromRecipe,
  toggleGroceryListItemChecked,
  deleteGroceryListItem,
  clearCheckedItems,
  syncGroceryListWithPantry,
  deleteGroceryListById,
  // Item management (no full list replacement)
  addItemToGroceryList,
  updateGroceryListItem,
  removeItemFromGroceryList,
  // Phase F1: New endpoints
  rebuildFromMealPlan,
  markItemPurchased,
  createManualGroceryItem,
  getGroceryListDebugInfo,
  // Phase F5: Debug endpoints
  getMealPlanDebugInfo,
};

// Legacy export
export const groceryApi = groceryService;
export default groceryService;
