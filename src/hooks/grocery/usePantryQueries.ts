/**
 * ============================================
 * REACT QUERY HOOKS FOR PANTRY
 * ============================================
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { pantryQueryKeys } from "./queryKeys";
import { listMyPantryItems, type PantryItem, type PantryQueryOptions } from "@/src/user/pantry";

// ============================================
// QUERY OPTIONS (NO CACHING)
// ============================================

const NO_CACHE_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: "always" as const,
  refetchOnReconnect: "always" as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch user's pantry items
 */
export function usePantry(
  userId: number | null | undefined,
  options?: {
    familyId?: number | null;
    queryOptions?: Omit<UseQueryOptions<PantryItem[], Error>, "queryKey" | "queryFn">;
  }
) {
  const familyId = options?.familyId;

  return useQuery({
    queryKey: familyId
      ? pantryQueryKeys.familyPantry(familyId)
      : pantryQueryKeys.userPantry(userId ?? 0),
    queryFn: async () => {
      const pantryOptions: PantryQueryOptions = {};
      if (familyId) {
        pantryOptions.familyId = familyId;
      }
      return listMyPantryItems(pantryOptions);
    },
    enabled: userId !== null && userId !== undefined && userId > 0,
    ...NO_CACHE_QUERY_OPTIONS,
    ...options?.queryOptions,
  });
}

/**
 * Fetch family pantry items
 */
export function useFamilyPantry(
  familyId: number | null,
  options?: Omit<UseQueryOptions<PantryItem[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: pantryQueryKeys.familyPantry(familyId ?? 0),
    queryFn: () => listMyPantryItems({ familyId }),
    enabled: familyId !== null && familyId > 0,
    ...NO_CACHE_QUERY_OPTIONS,
    ...options,
  });
}
