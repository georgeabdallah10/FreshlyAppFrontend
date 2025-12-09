/**
 * ============================================
 * INGREDIENT API SERVICE (Phase F7)
 * ============================================
 * 
 * Service for managing ingredient metadata including
 * canonical units and conversion factors for debugging
 * grocery list calculations.
 */

import { apiClient } from '../client/apiClient';

// ============================================
// TYPES
// ============================================

/**
 * Canonical unit types for normalization
 */
export type CanonicalUnitType = 'g' | 'ml' | 'count';

/**
 * Ingredient with canonical unit metadata
 * Used for debugging unit conversion issues
 */
export interface IngredientDetail {
  id: number;
  name: string;
  aliases?: string[];
  category?: string;
  
  // Canonical unit configuration
  canonical_unit: CanonicalUnitType;
  
  // Conversion factors for unit normalization
  avg_weight_per_unit_g: number | null;  // For count-based items (e.g., 1 egg = 50g)
  density_g_per_ml: number | null;       // For volume-based items (e.g., milk = 1.03 g/ml)
  
  // Audit fields
  created_at?: string;
  updated_at?: string;
}

/**
 * Ingredient summary for lists
 */
export interface IngredientSummary {
  id: number;
  name: string;
  canonical_unit: CanonicalUnitType;
  has_weight_conversion: boolean;
  has_density_conversion: boolean;
}

/**
 * Request to update ingredient conversion factors
 */
export interface UpdateIngredientConversionRequest {
  canonical_unit?: CanonicalUnitType;
  avg_weight_per_unit_g?: number | null;
  density_g_per_ml?: number | null;
}

/**
 * Search/filter parameters for ingredients
 */
export interface IngredientSearchParams {
  search?: string;
  category?: string;
  missing_conversions?: boolean;  // Filter to ingredients missing conversion data
  limit?: number;
  offset?: number;
}

/**
 * Response for ingredient list with pagination
 */
export interface IngredientListResponse {
  ingredients: IngredientSummary[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Search ingredients with optional filters
 * GET /ingredients
 */
export async function searchIngredients(
  params?: IngredientSearchParams
): Promise<IngredientListResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.search) queryParams.append('search', params.search);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.missing_conversions) queryParams.append('missing_conversions', 'true');
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  
  const queryString = queryParams.toString();
  const url = `/ingredients${queryString ? `?${queryString}` : ''}`;
  
  return await apiClient.get<IngredientListResponse>(url);
}

/**
 * Get ingredient detail by ID
 * GET /ingredients/{id}
 */
export async function getIngredientById(
  id: number
): Promise<IngredientDetail> {
  return await apiClient.get<IngredientDetail>(`/ingredients/${id}`);
}

/**
 * Get ingredient detail by name
 * GET /ingredients/by-name/{name}
 */
export async function getIngredientByName(
  name: string
): Promise<IngredientDetail> {
  return await apiClient.get<IngredientDetail>(
    `/ingredients/by-name/${encodeURIComponent(name)}`
  );
}

/**
 * Update ingredient conversion factors (admin only)
 * PATCH /ingredients/{id}/conversions
 */
export async function updateIngredientConversions(
  id: number,
  updates: UpdateIngredientConversionRequest
): Promise<IngredientDetail> {
  return await apiClient.patch<IngredientDetail>(
    `/ingredients/${id}/conversions`,
    updates
  );
}

/**
 * Get ingredients with missing conversion data
 * GET /ingredients/missing-conversions
 */
export async function getIngredientsMissingConversions(
  limit: number = 50
): Promise<IngredientSummary[]> {
  return await apiClient.get<IngredientSummary[]>(
    `/ingredients/missing-conversions?limit=${limit}`
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get display label for canonical unit type
 */
export function getCanonicalUnitLabel(unit: CanonicalUnitType): string {
  switch (unit) {
    case 'g':
      return 'Grams (weight)';
    case 'ml':
      return 'Milliliters (volume)';
    case 'count':
      return 'Count (pieces)';
    default:
      return unit;
  }
}

/**
 * Get description for conversion field
 */
export function getConversionFieldDescription(
  field: 'avg_weight_per_unit_g' | 'density_g_per_ml'
): string {
  switch (field) {
    case 'avg_weight_per_unit_g':
      return 'Average weight in grams per single unit (e.g., 1 egg ≈ 50g, 1 apple ≈ 180g)';
    case 'density_g_per_ml':
      return 'Density in grams per milliliter (e.g., water = 1.0, milk ≈ 1.03, olive oil ≈ 0.92)';
    default:
      return '';
  }
}

/**
 * Check if ingredient has complete conversion data
 */
export function hasCompleteConversionData(ingredient: IngredientDetail): boolean {
  // For gram-based items, no additional conversions needed
  if (ingredient.canonical_unit === 'g') {
    return true;
  }
  
  // For ml-based items, need density
  if (ingredient.canonical_unit === 'ml') {
    return ingredient.density_g_per_ml !== null;
  }
  
  // For count-based items, need weight per unit
  if (ingredient.canonical_unit === 'count') {
    return ingredient.avg_weight_per_unit_g !== null;
  }
  
  return false;
}

/**
 * Calculate estimated grams from different units
 */
export function estimateGrams(
  quantity: number,
  unit: string,
  ingredient: IngredientDetail
): number | null {
  // If already in grams
  if (unit === 'g' || unit === 'gram' || unit === 'grams') {
    return quantity;
  }
  
  // If in kg
  if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
    return quantity * 1000;
  }
  
  // If count-based and we have weight per unit
  if ((unit === 'count' || unit === 'ea' || unit === 'piece' || unit === 'pieces' || unit === '') 
      && ingredient.avg_weight_per_unit_g !== null) {
    return quantity * ingredient.avg_weight_per_unit_g;
  }
  
  // If volume-based and we have density
  if ((unit === 'ml' || unit === 'milliliter' || unit === 'milliliters') 
      && ingredient.density_g_per_ml !== null) {
    return quantity * ingredient.density_g_per_ml;
  }
  
  if ((unit === 'l' || unit === 'liter' || unit === 'liters') 
      && ingredient.density_g_per_ml !== null) {
    return quantity * 1000 * ingredient.density_g_per_ml;
  }
  
  // Cannot estimate
  return null;
}

// ============================================
// EXPORT ALL
// ============================================

export const ingredientService = {
  searchIngredients,
  getIngredientById,
  getIngredientByName,
  updateIngredientConversions,
  getIngredientsMissingConversions,
};

export const ingredientApi = ingredientService;
export default ingredientService;
