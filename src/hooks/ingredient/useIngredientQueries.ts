/**
 * ============================================
 * INGREDIENT HOOKS (Phase F7)
 * ============================================
 * 
 * React Query hooks for ingredient management
 * including canonical unit debugging.
 */

import {
    getIngredientById,
    getIngredientByName,
    getIngredientsMissingConversions,
    IngredientSearchParams,
    searchIngredients,
    UpdateIngredientConversionRequest,
    updateIngredientConversions
} from '@/src/services/ingredient.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================
// QUERY KEYS
// ============================================

export const ingredientQueryKeys = {
  all: ['ingredients'] as const,
  lists: () => [...ingredientQueryKeys.all, 'list'] as const,
  list: (params?: IngredientSearchParams) => [...ingredientQueryKeys.lists(), params] as const,
  details: () => [...ingredientQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...ingredientQueryKeys.details(), id] as const,
  detailByName: (name: string) => [...ingredientQueryKeys.details(), 'name', name] as const,
  missingConversions: () => [...ingredientQueryKeys.all, 'missing-conversions'] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Search ingredients with filters
 */
export function useIngredientSearch(
  params?: IngredientSearchParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ingredientQueryKeys.list(params),
    queryFn: () => searchIngredients(params),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get single ingredient by ID
 */
export function useIngredientDetail(
  id: number | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ingredientQueryKeys.detail(id ?? 0),
    queryFn: () => getIngredientById(id!),
    enabled: (options?.enabled ?? true) && id !== null && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get single ingredient by name
 */
export function useIngredientByName(
  name: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ingredientQueryKeys.detailByName(name ?? ''),
    queryFn: () => getIngredientByName(name!),
    enabled: (options?.enabled ?? true) && !!name,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get ingredients with missing conversion data
 */
export function useIngredientsMissingConversions(
  limit: number = 50,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ingredientQueryKeys.missingConversions(),
    queryFn: () => getIngredientsMissingConversions(limit),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Update ingredient conversion factors
 */
export function useUpdateIngredientConversions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: UpdateIngredientConversionRequest;
    }) => updateIngredientConversions(id, updates),
    onSuccess: (updatedIngredient) => {
      // Update the cache for this ingredient
      queryClient.setQueryData(
        ingredientQueryKeys.detail(updatedIngredient.id),
        updatedIngredient
      );
      
      // Invalidate lists to refresh
      queryClient.invalidateQueries({
        queryKey: ingredientQueryKeys.lists(),
      });
      
      // Invalidate missing conversions list
      queryClient.invalidateQueries({
        queryKey: ingredientQueryKeys.missingConversions(),
      });
    },
  });
}
