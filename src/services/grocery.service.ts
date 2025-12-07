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
}

export interface GroceryListOut {
  id: number;
  family_id: number | null;
  owner_user_id: number | null;
  scope: GroceryListScope;
  meal_plan_id?: number | null;
  title: string | null;
  status: GroceryListStatus;
  created_at: string;
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

export interface SyncWithPantryResponse {
  items_removed: number;
  items_updated: number;
  message: string;
}

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
 * Get family grocery lists
 */
export async function getFamilyGroceryLists(
  family_id: number,
  status?: GroceryListStatus
): Promise<GroceryListOut[]> {
  const params = status ? `?status=${status}` : '';
  return await apiClient.get<GroceryListOut[]>(`/grocery-lists/family/${family_id}${params}`);
}

/**
 * Get my personal grocery lists
 */
export async function getMyGroceryLists(
  status?: GroceryListStatus
): Promise<GroceryListOut[]> {
  const params = status ? `?status=${status}` : '';
  return await apiClient.get<GroceryListOut[]>(`/grocery-lists/me${params}`);
}

/**
 * Get a specific grocery list by ID
 */
export async function getGroceryListById(list_id: number): Promise<GroceryListOut> {
  return await apiClient.get<GroceryListOut>(`/grocery-lists/${list_id}`);
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
 */
export async function syncGroceryListWithPantry(list_id: number): Promise<SyncWithPantryResponse> {
  return await apiClient.post<SyncWithPantryResponse>(`/grocery-lists/${list_id}/sync-with-pantry`, {});
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
};

// Legacy export
export const groceryApi = groceryService;
export default groceryService;
