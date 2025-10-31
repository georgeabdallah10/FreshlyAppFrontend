/**
 * ============================================
 * PANTRY HOOKS - React Query Integration
 * ============================================
 */

import { ApiError } from '@/api/client/apiClient';
import { invalidateQueries, optimisticUpdate, queryKeys } from '@/api/config/queryClient';
import {
    CreatePantryItemInput,
    pantryApi,
    PantryFilters,
    PantryItem,
    UpdatePantryItemInput,
} from '@/api/services/pantry.service';
import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Get all pantry items with optional filters
 */
export function usePantryItems(filters?: PantryFilters, options?: Omit<UseQueryOptions<PantryItem[], ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<PantryItem[], ApiError>({
    queryKey: queryKeys.pantry.list(filters),
    queryFn: () => pantryApi.getAllPantryItems(filters),
    staleTime: 1000 * 60 * 3, // 3 minutes
    ...options,
  });
}

/**
 * Get a single pantry item by ID
 */
export function usePantryItem(id: number, options?: Omit<UseQueryOptions<PantryItem, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<PantryItem, ApiError>({
    queryKey: queryKeys.pantry.detail(id),
    queryFn: () => pantryApi.getPantryItemById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Get pantry categories
 */
export function usePantryCategories(options?: Omit<UseQueryOptions<string[], ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<string[], ApiError>({
    queryKey: queryKeys.pantry.categories(),
    queryFn: () => pantryApi.getPantryCategories(),
    staleTime: 1000 * 60 * 30, // 30 minutes - categories change rarely
    ...options,
  });
}

/**
 * Get items expiring soon
 */
export function useExpiringSoonItems(days: number = 7, options?: Omit<UseQueryOptions<PantryItem[], ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<PantryItem[], ApiError>({
    queryKey: [...queryKeys.pantry.lists(), 'expiring', days],
    queryFn: () => pantryApi.getExpiringSoonItems(days),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new pantry item
 */
export function useCreatePantryItem(options?: UseMutationOptions<PantryItem, ApiError, CreatePantryItemInput>) {
  const queryClient = useQueryClient();

  return useMutation<PantryItem, ApiError, CreatePantryItemInput>({
    mutationFn: (input: CreatePantryItemInput) => pantryApi.createPantryItem(input),
    onSuccess: () => {
      invalidateQueries.pantry();
    },
    ...options,
  });
}

/**
 * Update an existing pantry item
 */
export function useUpdatePantryItem(options?: UseMutationOptions<PantryItem, ApiError, UpdatePantryItemInput>) {
  const queryClient = useQueryClient();

  return useMutation<PantryItem, ApiError, UpdatePantryItemInput>({
    mutationFn: (input: UpdatePantryItemInput) => pantryApi.updatePantryItem(input),
    onMutate: async (updatedItem) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pantry.detail(updatedItem.id) });
      const previousItem = queryClient.getQueryData<PantryItem>(queryKeys.pantry.detail(updatedItem.id));
      
      if (previousItem) {
        queryClient.setQueryData<PantryItem>(queryKeys.pantry.detail(updatedItem.id), {
          ...previousItem,
          ...updatedItem,
        });
      }

      return { previousItem };
    },
    onError: (err, updatedItem, context: any) => {
      if (context?.previousItem) {
        queryClient.setQueryData(queryKeys.pantry.detail(updatedItem.id), context.previousItem);
      }
    },
    onSuccess: () => {
      invalidateQueries.pantry();
    },
    ...options,
  });
}

/**
 * Delete a pantry item
 */
export function useDeletePantryItem(options?: UseMutationOptions<void, ApiError, number>) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, number>({
    mutationFn: (id: number) => pantryApi.deletePantryItem(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pantry.lists() });
      const previousItems = queryClient.getQueryData<PantryItem[]>(queryKeys.pantry.lists());
      
      optimisticUpdate.removeFromList<PantryItem>([...queryKeys.pantry.lists()], deletedId);

      return { previousItems };
    },
    onError: (err, deletedId, context: any) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.pantry.lists(), context.previousItems);
      }
    },
    onSuccess: () => {
      invalidateQueries.pantry();
    },
    ...options,
  });
}

/**
 * Batch create pantry items
 */
export function useBatchCreatePantryItems(options?: UseMutationOptions<PantryItem[], ApiError, CreatePantryItemInput[]>) {
  return useMutation<PantryItem[], ApiError, CreatePantryItemInput[]>({
    mutationFn: (items: CreatePantryItemInput[]) => pantryApi.batchCreatePantryItems(items),
    onSuccess: () => {
      invalidateQueries.pantry();
    },
    ...options,
  });
}
