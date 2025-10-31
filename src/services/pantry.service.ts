/**
 * ============================================
 * PANTRY API SERVICE
 * ============================================
 */

import { apiClient } from '../client/apiClient';

// ============================================
// TYPES
// ============================================

export interface PantryItem {
  id: number;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  expirationDate?: string;
  notes?: string;
  barcode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePantryItemInput {
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  expirationDate?: string;
  notes?: string;
  barcode?: string;
}

export interface UpdatePantryItemInput extends Partial<CreatePantryItemInput> {
  id: number;
}

export interface PantryFilters {
  category?: string;
  search?: string;
  expiringSoon?: boolean;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all pantry items for the current user
 */
export async function getAllPantryItems(filters?: PantryFilters): Promise<PantryItem[]> {
  const params = new URLSearchParams();
  
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.expiringSoon) params.append('expiring_soon', 'true');

  const queryString = params.toString();
  const url = `/pantry/me${queryString ? `?${queryString}` : ''}`;
  
  return await apiClient.get<PantryItem[]>(url);
}

/**
 * Get a single pantry item by ID
 */
export async function getPantryItemById(id: number): Promise<PantryItem> {
  return await apiClient.get<PantryItem>(`/pantry/${id}`);
}

/**
 * Create a new pantry item
 */
export async function createPantryItem(input: CreatePantryItemInput): Promise<PantryItem> {
  return await apiClient.post<PantryItem>('/pantry/me', input);
}

/**
 * Update an existing pantry item
 */
export async function updatePantryItem(input: UpdatePantryItemInput): Promise<PantryItem> {
  const { id, ...rest } = input;
  return await apiClient.put<PantryItem>(`/pantry/${id}`, rest);
}

/**
 * Delete a pantry item
 */
export async function deletePantryItem(id: number): Promise<void> {
  await apiClient.delete(`/pantry/${id}`);
}

/**
 * Get pantry categories
 */
export async function getPantryCategories(): Promise<string[]> {
  return await apiClient.get<string[]>('/pantry/categories');
}

/**
 * Batch create pantry items
 */
export async function batchCreatePantryItems(items: CreatePantryItemInput[]): Promise<PantryItem[]> {
  return await apiClient.post<PantryItem[]>('/pantry/batch', { items });
}

/**
 * Get items expiring soon
 */
export async function getExpiringSoonItems(days: number = 7): Promise<PantryItem[]> {
  return await apiClient.get<PantryItem[]>(`/pantry/expiring?days=${days}`);
}

// ============================================
// EXPORT ALL
// ============================================

export const pantryApi = {
  getAllPantryItems,
  getPantryItemById,
  createPantryItem,
  updatePantryItem,
  deletePantryItem,
  getPantryCategories,
  batchCreatePantryItems,
  getExpiringSoonItems,
};

export default pantryApi;
