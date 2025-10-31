/**
 * ============================================
 * MEALS HOOKS - React Query Integration
 * ============================================
 * 
 * Custom hooks for meal-related data fetching with:
 * - Automatic caching
 * - Background refetching
 * - Optimistic updates
 * - Error handling
 * - Loading states
 */

import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { ApiError } from '../src/client/apiClient';
import { invalidateQueries, optimisticUpdate, prefetchQueries, queryKeys } from '../src/config/queryClient';
import {
    CreateMealInput,
    Meal,
    MealFilters,
    mealsApi,
    UpdateMealInput,
} from '../src/services/meals.service';

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Get all meals with optional filters
 */
export function useMeals(filters?: MealFilters, options?: Omit<UseQueryOptions<Meal[], ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<Meal[], ApiError>({
    queryKey: queryKeys.meals.list(filters),
    queryFn: () => mealsApi.getAllMeals(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Get a single meal by ID
 */
export function useMeal(id: number, options?: Omit<UseQueryOptions<Meal, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<Meal, ApiError>({
    queryKey: queryKeys.meals.detail(id),
    queryFn: () => mealsApi.getMealById(id),
    staleTime: 1000 * 60 * 10, // 10 minutes - meal details change less frequently
    enabled: !!id, // Only fetch if ID is provided
    ...options,
  });
}

/**
 * Get favorite meals
 */
export function useFavoriteMeals(options?: Omit<UseQueryOptions<Meal[], ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<Meal[], ApiError>({
    queryKey: queryKeys.meals.favorites(),
    queryFn: () => mealsApi.getFavoriteMeals(),
    staleTime: 1000 * 60 * 3, // 3 minutes
    ...options,
  });
}

/**
 * Get recent meals
 */
export function useRecentMeals(limit: number = 10, options?: Omit<UseQueryOptions<Meal[], ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<Meal[], ApiError>({
    queryKey: queryKeys.meals.recent(),
    queryFn: () => mealsApi.getRecentMeals(limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
}

/**
 * Search meals
 */
export function useSearchMeals(query: string, options?: Omit<UseQueryOptions<Meal[], ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<Meal[], ApiError>({
    queryKey: [...queryKeys.meals.lists(), 'search', query],
    queryFn: () => mealsApi.searchMeals(query),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: query.length >= 2, // Only search with at least 2 characters
    ...options,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new meal
 */
export function useCreateMeal(options?: UseMutationOptions<Meal, ApiError, CreateMealInput>) {
  const queryClient = useQueryClient();

  return useMutation<Meal, ApiError, CreateMealInput>({
    mutationFn: (input: CreateMealInput) => mealsApi.createMeal(input),
    onMutate: async (newMeal) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.meals.lists() });

      // Snapshot previous value
      const previousMeals = queryClient.getQueryData<Meal[]>(queryKeys.meals.lists());

      // Optimistically add new meal
      if (previousMeals) {
        const optimisticMeal: Meal = {
          id: Date.now(), // Temporary ID
          ...newMeal,
          isFavorite: false,
          ingredients: newMeal.ingredients || [],
          instructions: newMeal.instructions || [],
        };
        queryClient.setQueryData<Meal[]>(queryKeys.meals.lists(), [...previousMeals, optimisticMeal]);
      }

      return { previousMeals };
    },
    onError: (err, newMeal, context: any) => {
      // Rollback on error
      if (context?.previousMeals) {
        queryClient.setQueryData(queryKeys.meals.lists(), context.previousMeals);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      invalidateQueries.meals();
    },
    ...options,
  });
}

/**
 * Update an existing meal
 */
export function useUpdateMeal(options?: UseMutationOptions<Meal, ApiError, UpdateMealInput>) {
  const queryClient = useQueryClient();

  return useMutation<Meal, ApiError, UpdateMealInput>({
    mutationFn: (input: UpdateMealInput) => mealsApi.updateMeal(input),
    onMutate: async (updatedMeal) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.meals.detail(updatedMeal.id) });

      // Snapshot previous value
      const previousMeal = queryClient.getQueryData<Meal>(queryKeys.meals.detail(updatedMeal.id));

      // Optimistically update
      if (previousMeal) {
        queryClient.setQueryData<Meal>(queryKeys.meals.detail(updatedMeal.id), {
          ...previousMeal,
          ...updatedMeal,
        });
      }

      return { previousMeal };
    },
    onError: (err, updatedMeal, context: any) => {
      // Rollback on error
      if (context?.previousMeal) {
        queryClient.setQueryData(queryKeys.meals.detail(updatedMeal.id), context.previousMeal);
      }
    },
    onSuccess: (data) => {
      // Invalidate specific meal and lists
      invalidateQueries.mealDetail(data.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.lists() });
    },
    ...options,
  });
}

/**
 * Delete a meal
 */
export function useDeleteMeal(options?: UseMutationOptions<void, ApiError, number>) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, number>({
    mutationFn: (id: number) => mealsApi.deleteMeal(id),
    onMutate: async (deletedId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.meals.lists() });

      // Snapshot previous value
      const previousMeals = queryClient.getQueryData<Meal[]>(queryKeys.meals.lists());

      // Optimistically remove meal
      optimisticUpdate.removeFromList<Meal>([...queryKeys.meals.lists()], deletedId);

      return { previousMeals };
    },
    onError: (err, deletedId, context: any) => {
      // Rollback on error
      if (context?.previousMeals) {
        queryClient.setQueryData(queryKeys.meals.lists(), context.previousMeals);
      }
    },
    onSuccess: () => {
      // Invalidate meals list
      invalidateQueries.meals();
    },
    ...options,
  });
}

/**
 * Toggle meal favorite status
 */
export function useToggleMealFavorite(options?: UseMutationOptions<Meal, ApiError, { id: number; isFavorite: boolean }>) {
  const queryClient = useQueryClient();

  return useMutation<Meal, ApiError, { id: number; isFavorite: boolean }>({
    mutationFn: ({ id, isFavorite }) => mealsApi.toggleMealFavorite(id, isFavorite),
    onMutate: async ({ id, isFavorite }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.meals.detail(id) });

      // Snapshot previous value
      const previousMeal = queryClient.getQueryData<Meal>(queryKeys.meals.detail(id));

      // Optimistically update
      if (previousMeal) {
        queryClient.setQueryData<Meal>(queryKeys.meals.detail(id), {
          ...previousMeal,
          isFavorite,
        });
      }

      return { previousMeal };
    },
    onError: (err, { id }, context: any) => {
      // Rollback on error
      if (context?.previousMeal) {
        queryClient.setQueryData(queryKeys.meals.detail(id), context.previousMeal);
      }
    },
    onSuccess: (data) => {
      // Invalidate meal detail and favorites list
      invalidateQueries.mealDetail(data.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.favorites() });
    },
    ...options,
  });
}

/**
 * Batch create meals
 */
export function useBatchCreateMeals(options?: UseMutationOptions<Meal[], ApiError, CreateMealInput[]>) {
  const queryClient = useQueryClient();

  return useMutation<Meal[], ApiError, CreateMealInput[]>({
    mutationFn: (meals: CreateMealInput[]) => mealsApi.batchCreateMeals(meals),
    onSuccess: () => {
      // Invalidate all meal queries
      invalidateQueries.meals();
    },
    ...options,
  });
}

// ============================================
// PREFETCH HELPERS
// ============================================

/**
 * Prefetch meal details for faster navigation
 */
export function usePrefetchMeal() {
  const queryClient = useQueryClient();

  return (id: number) => {
    prefetchQueries.mealDetail(id, () => mealsApi.getMealById(id));
  };
}

/**
 * Prefetch meals list
 */
export function usePrefetchMeals() {
  return (filters?: MealFilters) => {
    prefetchQueries.user(() => mealsApi.getAllMeals(filters));
  };
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Check if a meal is cached
 */
export function useIsMealCached(id: number): boolean {
  const queryClient = useQueryClient();
  const data = queryClient.getQueryData<Meal>(queryKeys.meals.detail(id));
  return !!data;
}

/**
 * Get cached meal without triggering a fetch
 */
export function useCachedMeal(id: number): Meal | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<Meal>(queryKeys.meals.detail(id));
}
