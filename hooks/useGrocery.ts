/**
 * React Query hooks for Grocery List operations
 * 
 * @module hooks/useGrocery
 * @description Provides hooks for managing grocery lists with React Query
 */

import { queryKeys } from '@/src/config/queryClient';
import type {
    AddGroceryItemInput,
    CreateGroceryListInput,
    GroceryItem,
    GroceryList,
} from '@/src/services/grocery.service';
import { groceryService } from '@/src/services/grocery.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to fetch all grocery lists
 */
export function useGroceryLists(enabled = true) {
  return useQuery({
    queryKey: queryKeys.grocery.lists(),
    queryFn: () => groceryService.getGroceryLists(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single grocery list by ID
 */
export function useGroceryList(listId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.grocery.detail(listId),
    queryFn: () => groceryService.getGroceryList(listId),
    enabled: enabled && !!listId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch active grocery list
 */
export function useActiveGroceryList(enabled = true) {
  return useQuery({
    queryKey: queryKeys.grocery.active(),
    queryFn: () => groceryService.getActiveGroceryList(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch grocery suggestions
 */
export function useGrocerySuggestions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.grocery.suggestions(),
    queryFn: () => groceryService.getGrocerySuggestions(),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to create a new grocery list
 * 
 * @example
 * const createList = useCreateGroceryList();
 * 
 * await createList.mutateAsync({
 *   name: 'Weekly Shopping',
 *   items: []
 * });
 */
export function useCreateGroceryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGroceryListInput) =>
      groceryService.createGroceryList(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.active() });
    },
  });
}

/**
 * Hook to update a grocery list name
 * 
 * @example
 * const updateList = useUpdateGroceryList();
 * 
 * await updateList.mutateAsync({
 *   id: 123,
 *   name: 'Updated Shopping List'
 * });
 */
export function useUpdateGroceryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      groceryService.updateGroceryList(id, name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.lists() });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.grocery.detail(variables.id) 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.active() });
    },
  });
}

/**
 * Hook to delete a grocery list
 */
export function useDeleteGroceryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: number) => groceryService.deleteGroceryList(listId),
    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.lists() });
      queryClient.removeQueries({ queryKey: queryKeys.grocery.detail(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.active() });
    },
  });
}

/**
 * Hook to add item to grocery list with optimistic updates
 * 
 * @example
 * const addItem = useAddGroceryItem();
 * 
 * await addItem.mutateAsync({
 *   listId: 123,
 *   name: 'Milk',
 *   quantity: 2,
 *   unit: 'gallon',
 *   category: 'Dairy'
 * });
 */
export function useAddGroceryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddGroceryItemInput) =>
      groceryService.addGroceryItem(input),
    onMutate: async (input) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.grocery.detail(input.listId) 
      });

      // Snapshot previous value
      const previousList = queryClient.getQueryData<GroceryList>(
        queryKeys.grocery.detail(input.listId)
      );

      // Optimistically update
      if (previousList) {
        const optimisticItem: GroceryItem = {
          id: Date.now(), // Temporary ID
          name: input.name,
          quantity: input.quantity,
          unit: input.unit,
          category: input.category,
          notes: input.notes,
          isChecked: false,
          mealId: undefined,
        };

        queryClient.setQueryData<GroceryList>(
          queryKeys.grocery.detail(input.listId),
          {
            ...previousList,
            items: [...previousList.items, optimisticItem],
          }
        );
      }

      return { previousList };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.grocery.detail(variables.listId),
          context.previousList
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.grocery.detail(variables.listId) 
      });
    },
  });
}

/**
 * Hook to update grocery item with optimistic updates
 * 
 * @example
 * const updateItem = useUpdateGroceryItem();
 * 
 * // Toggle checked status
 * await updateItem.mutateAsync({
 *   listId: 123,
 *   itemId: 456,
 *   isChecked: true
 * });
 */
export function useUpdateGroceryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      listId, 
      itemId, 
      ...updates 
    }: { listId: number; itemId: number } & Partial<GroceryItem>) =>
      groceryService.updateGroceryItem(listId, itemId, updates),
    onMutate: async ({ listId, itemId, ...updates }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.grocery.detail(listId) 
      });

      const previousList = queryClient.getQueryData<GroceryList>(
        queryKeys.grocery.detail(listId)
      );

      if (previousList) {
        queryClient.setQueryData<GroceryList>(
          queryKeys.grocery.detail(listId),
          {
            ...previousList,
            items: previousList.items.map(item =>
              item.id === itemId
                ? { ...item, ...updates }
                : item
            ),
          }
        );
      }

      return { previousList };
    },
    onError: (err, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.grocery.detail(variables.listId),
          context.previousList
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.grocery.detail(variables.listId) 
      });
    },
  });
}

/**
 * Hook to delete grocery item with optimistic updates
 */
export function useDeleteGroceryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: number; itemId: number }) =>
      groceryService.deleteGroceryItem(listId, itemId),
    onMutate: async ({ listId, itemId }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.grocery.detail(listId) 
      });

      const previousList = queryClient.getQueryData<GroceryList>(
        queryKeys.grocery.detail(listId)
      );

      if (previousList) {
        queryClient.setQueryData<GroceryList>(
          queryKeys.grocery.detail(listId),
          {
            ...previousList,
            items: previousList.items.filter(item => item.id !== itemId),
          }
        );
      }

      return { previousList };
    },
    onError: (err, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.grocery.detail(variables.listId),
          context.previousList
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.grocery.detail(variables.listId) 
      });
    },
  });
}

/**
 * Hook to toggle item checked status
 * 
 * @example
 * const toggleItem = useToggleGroceryItem();
 * await toggleItem.mutateAsync({ listId: 123, itemId: 456, isChecked: true });
 */
export function useToggleGroceryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, itemId, isChecked }: { listId: number; itemId: number; isChecked: boolean }) =>
      groceryService.toggleGroceryItem(listId, itemId, isChecked),
    onMutate: async ({ listId, itemId, isChecked }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.grocery.detail(listId) 
      });

      const previousList = queryClient.getQueryData<GroceryList>(
        queryKeys.grocery.detail(listId)
      );

      if (previousList) {
        queryClient.setQueryData<GroceryList>(
          queryKeys.grocery.detail(listId),
          {
            ...previousList,
            items: previousList.items.map(item =>
              item.id === itemId
                ? { ...item, isChecked }
                : item
            ),
          }
        );
      }

      return { previousList };
    },
    onError: (err, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.grocery.detail(variables.listId),
          context.previousList
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.grocery.detail(variables.listId) 
      });
    },
  });
}

/**
 * Hook to generate grocery list from meals
 * 
 * @example
 * const generateList = useGenerateGroceryListFromMeals();
 * await generateList.mutateAsync([123, 456, 789]);
 */
export function useGenerateGroceryListFromMeals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mealIds: number[]) =>
      groceryService.generateGroceryListFromMeals(mealIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.active() });
    },
  });
}

/**
 * Composite hook for grocery list management screen
 * Returns all grocery-related data in one hook
 * 
 * @example
 * const {
 *   lists,
 *   activeList,
 *   suggestions,
 *   isLoading
 * } = useGroceryManagement();
 */
export function useGroceryManagement() {
  const listsQuery = useGroceryLists();
  const activeListQuery = useActiveGroceryList();
  const suggestionsQuery = useGrocerySuggestions();

  return {
    lists: listsQuery.data,
    activeList: activeListQuery.data,
    suggestions: suggestionsQuery.data,
    isLoading:
      listsQuery.isLoading ||
      activeListQuery.isLoading ||
      suggestionsQuery.isLoading,
    isError:
      listsQuery.isError ||
      activeListQuery.isError ||
      suggestionsQuery.isError,
    error:
      listsQuery.error ||
      activeListQuery.error ||
      suggestionsQuery.error,
    refetch: () => {
      listsQuery.refetch();
      activeListQuery.refetch();
      suggestionsQuery.refetch();
    },
  };
}
