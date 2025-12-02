/**
 * ============================================
 * MEALS API SERVICE
 * ============================================
 * 
 * Production-grade meals API with:
 * - Type-safe interfaces
 * - Centralized error handling
 * - Request cancellation support
 * - Optimized for React Query
 */

import { apiClient } from '../client/apiClient';

// ============================================
// TYPES
// ============================================

export interface MacroBreakdown {
  protein: number;
  fats: number;
  carbs: number;
}

export interface Ingredient {
  id?: number;
  name: string;
  amount: number | string;
  unit?: string;
  inPantry?: boolean;
}

export interface Meal {
  id: number;
  name: string;
  image?: string;
  calories: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert';
  cuisine?: string;
  tags?: string[];
  macros?: MacroBreakdown;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  servings?: number;
  dietCompatibility?: string[];
  goalFit?: string[];
  ingredients: Ingredient[];
  instructions: string[];
  cookingTools?: string[];
  notes?: string;
  isFavorite: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMealInput {
  name: string;
  image?: string;
  calories: number;
  prepTime?: number;
  cookTime?: number;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert';
  cuisine?: string;
  tags?: string[];
  macros?: MacroBreakdown;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  servings?: number;
  dietCompatibility?: string[];
  goalFit?: string[];
  ingredients: Ingredient[];
  instructions: string[];
  cookingTools?: string[];
  notes?: string;
}

export interface UpdateMealInput extends Partial<CreateMealInput> {
  id: number;
}

export interface MealFilters {
  mealType?: string;
  difficulty?: string;
  cuisine?: string;
  maxCalories?: number;
  maxPrepTime?: number;
  isFavorite?: boolean;
  search?: string;
}

export interface MealListResponse {
  meals: Meal[];
  total: number;
  page?: number;
  pageSize?: number;
}

// ============================================
// API TRANSFORMATION HELPERS
// ============================================

/**
 * Transform frontend meal data to API format
 */
function toApiMeal(meal: CreateMealInput | UpdateMealInput): any {
  return {
    name: meal.name,
    image: meal.image ?? '',
    calories: meal.calories,
    prep_time: meal.prepTime ?? 0,
    cook_time: meal.cookTime ?? 0,
    total_time: (meal.prepTime ?? 0) + (meal.cookTime ?? 0),
    meal_type: meal.mealType,
    cuisine: meal.cuisine ?? '',
    tags: meal.tags ?? [],
    macros: meal.macros ?? { protein: 0, fats: 0, carbs: 0 },
    difficulty: meal.difficulty ?? 'Easy',
    servings: meal.servings ?? 1,
    diet_compatibility: meal.dietCompatibility ?? [],
    goal_fit: meal.goalFit ?? [],
    ingredients: (meal.ingredients || []).map((ing) => ({
      name: ing.name,
      amount: typeof ing.amount === 'string' ? parseFloat(ing.amount) || 1 : ing.amount,
      unit: ing.unit ?? 'unit',
      in_pantry: ing.inPantry ?? false,
    })),
    instructions: meal.instructions,
    cooking_tools: meal.cookingTools ?? [],
    notes: meal.notes ?? '',
  };
}

/**
 * Transform API meal data to frontend format
 */
function fromApiMeal(apiMeal: any): Meal {
  return {
    id: apiMeal.id,
    name: apiMeal.name,
    image: apiMeal.image,
    calories: apiMeal.calories,
    prepTime: apiMeal.prep_time,
    cookTime: apiMeal.cook_time,
    totalTime: apiMeal.total_time,
    mealType: apiMeal.meal_type,
    cuisine: apiMeal.cuisine,
    tags: apiMeal.tags ?? [],
    macros: apiMeal.macros,
    difficulty: apiMeal.difficulty,
    servings: apiMeal.servings,
    dietCompatibility: apiMeal.diet_compatibility ?? [],
    goalFit: apiMeal.goal_fit ?? [],
    ingredients: (apiMeal.ingredients ?? []).map((ing: any) => ({
      id: ing.id,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      inPantry: ing.in_pantry ?? false,
    })),
    instructions: apiMeal.instructions ?? [],
    cookingTools: apiMeal.cooking_tools ?? [],
    notes: apiMeal.notes,
    isFavorite: apiMeal.is_favorite ?? false,
    createdAt: apiMeal.created_at,
    updatedAt: apiMeal.updated_at,
  };
}

// ============================================
// MEALS API FUNCTIONS
// ============================================

/**
 * Get all meals for the current user
 */
export async function getAllMeals(filters?: MealFilters): Promise<Meal[]> {
  const params = new URLSearchParams();
  
  if (filters?.mealType) params.append('meal_type', filters.mealType);
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);
  if (filters?.cuisine) params.append('cuisine', filters.cuisine);
  if (filters?.maxCalories) params.append('max_calories', filters.maxCalories.toString());
  if (filters?.maxPrepTime) params.append('max_prep_time', filters.maxPrepTime.toString());
  if (filters?.isFavorite !== undefined) params.append('is_favorite', filters.isFavorite.toString());
  if (filters?.search) params.append('search', filters.search);

  const queryString = params.toString();
  const url = `/meals/me${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiClient.get<any[]>(url);
  return response.map(fromApiMeal);
}

/**
 * Get a single meal by ID
 */
export async function getMealById(id: number): Promise<Meal> {
  const response = await apiClient.get<any>(`/meals/${id}`);
  return fromApiMeal(response);
}

/**
 * Create a new meal
 */
export async function createMeal(input: CreateMealInput): Promise<Meal> {
  const apiData = toApiMeal(input);
  const response = await apiClient.post<any>('/meals/me', apiData);
  return fromApiMeal(response);
}

/**
 * Update an existing meal
 */
export async function updateMeal(input: UpdateMealInput): Promise<Meal> {
  const { id, ...rest } = input;
  const apiData = toApiMeal(rest as CreateMealInput);
  const response = await apiClient.put<any>(`/meals/${id}`, apiData);
  return fromApiMeal(response);
}

/**
 * Delete a meal
 */
export async function deleteMeal(id: number): Promise<void> {
  await apiClient.delete(`/meals/${id}`);
}

/**
 * Toggle favorite status of a meal
 * Sends full meal payload with updated favorite status
 */
export async function toggleMealFavorite(id: number, meal: Meal, isFavorite: boolean): Promise<Meal> {
  // Build full payload with updated favorite status
  const mealInput: CreateMealInput = {
    name: meal.name,
    image: meal.image,
    calories: meal.calories,
    prepTime: meal.prepTime,
    cookTime: meal.cookTime,
    mealType: meal.mealType,
    cuisine: meal.cuisine,
    tags: meal.tags,
    macros: meal.macros,
    difficulty: meal.difficulty,
    servings: meal.servings,
    dietCompatibility: meal.dietCompatibility,
    goalFit: meal.goalFit,
    ingredients: meal.ingredients,
    instructions: meal.instructions,
    cookingTools: meal.cookingTools,
    notes: meal.notes,
  };

  const apiData = { ...toApiMeal(mealInput), is_favorite: isFavorite };
  const response = await apiClient.patch<any>(`/meals/me/${id}`, apiData);
  return fromApiMeal(response);
}

/**
 * Get favorite meals
 */
export async function getFavoriteMeals(): Promise<Meal[]> {
  return getAllMeals({ isFavorite: true });
}

/**
 * Get recent meals
 */
export async function getRecentMeals(limit: number = 10): Promise<Meal[]> {
  const response = await apiClient.get<any[]>(`/meals/me/recent?limit=${limit}`);
  return response.map(fromApiMeal);
}

/**
 * Search meals
 */
export async function searchMeals(query: string): Promise<Meal[]> {
  return getAllMeals({ search: query });
}

/**
 * Batch create meals (useful for importing recipes)
 */
export async function batchCreateMeals(meals: CreateMealInput[]): Promise<Meal[]> {
  const apiData = meals.map(toApiMeal);
  const response = await apiClient.post<any[]>('/meals/batch', { meals: apiData });
  return response.map(fromApiMeal);
}

// ============================================
// EXPORT ALL
// ============================================

export const mealsApi = {
  getAllMeals,
  getMealById,
  createMeal,
  updateMeal,
  deleteMeal,
  toggleMealFavorite,
  getFavoriteMeals,
  getRecentMeals,
  searchMeals,
  batchCreateMeals,
};

export default mealsApi;
