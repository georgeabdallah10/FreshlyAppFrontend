/**
 * ============================================
 * MEAL PLANS API HOOKS
 * ============================================
 *
 * React Query hooks for meal plan data fetching
 * - Automatic caching with MMKV persistence
 * - Background refetching
 * - Optimistic updates
 */

import { ApiError } from '@/src/client/apiClient';
import { invalidateQueries, queryKeys } from '@/src/config/queryClient';
import { useMutation, useQuery, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';

// ============================================
// TYPES
// ============================================

export interface MealPlan {
  id: number;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  meals: MealPlanMeal[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanMeal {
  id: number;
  mealPlanId: number;
  mealId: number;
  date: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  meal?: {
    id: number;
    name: string;
    calories: number;
    image?: string;
  };
}

export interface CreateMealPlanInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateMealPlanInput extends Partial<CreateMealPlanInput> {
  id: number;
}

export interface MealPlanFilters {
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

// ============================================
// API FUNCTIONS (Mock - Replace with real API calls)
// ============================================

/**
 * Fetch all meal plans
 * Replace this with your actual API call
 */
async function fetchMealPlans(filters?: MealPlanFilters): Promise<MealPlan[]> {
  // TODO: Replace with actual API call
  // const response = await apiClient.get<MealPlan[]>('/meal-plans', { params: filters });
  // return response;

  // Mock data for demonstration
  return [
    {
      id: 1,
      userId: '1',
      name: 'Weekly Meal Plan',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      meals: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Fetch single meal plan by ID
 */
async function fetchMealPlanById(id: number): Promise<MealPlan> {
  // TODO: Replace with actual API call
  // const response = await apiClient.get<MealPlan>(`/meal-plans/${id}`);
  // return response;

  const plans = await fetchMealPlans();
  const plan = plans.find(p => p.id === id);
  if (!plan) throw new Error('Meal plan not found');
  return plan;
}

/**
 * Create new meal plan
 */
async function createMealPlan(input: CreateMealPlanInput): Promise<MealPlan> {
  // TODO: Replace with actual API call
  // const response = await apiClient.post<MealPlan>('/meal-plans', input);
  // return response;

  return {
    id: Date.now(),
    userId: '1',
    ...input,
    meals: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update meal plan
 */
async function updateMealPlan(input: UpdateMealPlanInput): Promise<MealPlan> {
  // TODO: Replace with actual API call
  const existing = await fetchMealPlanById(input.id);
  return {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Delete meal plan
 */
async function deleteMealPlan(id: number): Promise<void> {
  // TODO: Replace with actual API call
  // await apiClient.delete(`/meal-plans/${id}`);
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Get all meal plans with optional filters
 * - Cached for 5 minutes
 * - Auto-refetches on window focus
 * - Persisted to MMKV
 */
export function useMealPlans(
  filters?: MealPlanFilters,
  options?: Omit<UseQueryOptions<MealPlan[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MealPlan[], ApiError>({
    queryKey: queryKeys.mealPlans.list(filters),
    queryFn: () => fetchMealPlans(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Get active meal plan
 */
export function useActiveMealPlan(
  options?: Omit<UseQueryOptions<MealPlan | null, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MealPlan | null, ApiError>({
    queryKey: queryKeys.mealPlans.active(),
    queryFn: async () => {
      const plans = await fetchMealPlans({ isActive: true });
      return plans[0] || null;
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
    ...options,
  });
}

/**
 * Get single meal plan by ID
 */
export function useMealPlan(
  id: number,
  options?: Omit<UseQueryOptions<MealPlan, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MealPlan, ApiError>({
    queryKey: queryKeys.mealPlans.detail(id),
    queryFn: () => fetchMealPlanById(id),
    enabled: !!id,
    ...options,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create new meal plan
 */
export function useCreateMealPlan(
  options?: UseMutationOptions<MealPlan, ApiError, CreateMealPlanInput>
) {
  const queryClient = useQueryClient();

  return useMutation<MealPlan, ApiError, CreateMealPlanInput>({
    mutationFn: createMealPlan,
    onSuccess: () => {
      invalidateQueries.mealPlans();
    },
    ...options,
  });
}

/**
 * Update meal plan
 */
export function useUpdateMealPlan(
  options?: UseMutationOptions<MealPlan, ApiError, UpdateMealPlanInput>
) {
  const queryClient = useQueryClient();

  return useMutation<MealPlan, ApiError, UpdateMealPlanInput>({
    mutationFn: updateMealPlan,
    onSuccess: (data) => {
      invalidateQueries.mealPlanDetail(data.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans.lists() });
    },
    ...options,
  });
}

/**
 * Delete meal plan
 */
export function useDeleteMealPlan(
  options?: UseMutationOptions<void, ApiError, number>
) {
  return useMutation<void, ApiError, number>({
    mutationFn: deleteMealPlan,
    onSuccess: () => {
      invalidateQueries.mealPlans();
    },
    ...options,
  });
}
