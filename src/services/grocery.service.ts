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
};

// Legacy export
export const groceryApi = groceryService;
export default groceryService;
