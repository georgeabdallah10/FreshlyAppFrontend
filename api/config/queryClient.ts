/**
 * ============================================
 * REACT QUERY CONFIGURATION
 * ============================================
 * 
 * Production-grade React Query setup with:
 * - Optimized default query settings
 * - Retry logic
 * - Cache time configuration
 * - Background refetching
 * - Persistence (optional)
 * - DevTools for debugging
 */

import { DefaultOptions, QueryClient } from '@tanstack/react-query';

// ============================================
// QUERY CLIENT CONFIGURATION
// ============================================

const queryConfig: DefaultOptions = {
  queries: {
    // ========== CACHE CONFIGURATION ==========
    staleTime: 1000 * 60 * 5, // 5 minutes - Data is fresh for 5 min
    gcTime: 1000 * 60 * 30, // 30 minutes - Cache garbage collection (formerly cacheTime)
    
    // ========== REFETCH CONFIGURATION ==========
    refetchOnWindowFocus: false, // Don't refetch on window focus (mobile friendly)
    refetchOnMount: true, // Refetch when component mounts if data is stale
    refetchOnReconnect: true, // Refetch when network reconnects
    
    // ========== RETRY CONFIGURATION ==========
    retry: 2, // Retry failed requests 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    
    // ========== NETWORK MODE ==========
    networkMode: 'online', // Only fetch when online
  },
  
  mutations: {
    // ========== RETRY CONFIGURATION FOR MUTATIONS ==========
    retry: 1, // Retry mutations once on failure
    retryDelay: 1000, // 1 second delay between retries
    
    // ========== NETWORK MODE ==========
    networkMode: 'online', // Only mutate when online
  },
};

// ============================================
// CREATE QUERY CLIENT INSTANCE
// ============================================

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// ============================================
// QUERY KEY FACTORY
// ============================================

/**
 * Centralized query key management for consistency and type safety
 */
export const queryKeys = {
  // ========== USER QUERIES ==========
  user: {
    all: ['user'] as const,
    current: () => [...queryKeys.user.all, 'current'] as const,
    preferences: () => [...queryKeys.user.all, 'preferences'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
  },

  // ========== MEALS QUERIES ==========
  meals: {
    all: ['meals'] as const,
    lists: () => [...queryKeys.meals.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.meals.lists(), { filters }] as const,
    details: () => [...queryKeys.meals.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.meals.details(), id] as const,
    favorites: () => [...queryKeys.meals.all, 'favorites'] as const,
    recent: () => [...queryKeys.meals.all, 'recent'] as const,
  },

  // ========== PANTRY QUERIES ==========
  pantry: {
    all: ['pantry'] as const,
    lists: () => [...queryKeys.pantry.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.pantry.lists(), { filters }] as const,
    details: () => [...queryKeys.pantry.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.pantry.details(), id] as const,
    categories: () => [...queryKeys.pantry.all, 'categories'] as const,
  },

  // ========== CHAT QUERIES ==========
  chat: {
    all: ['chat'] as const,
    conversations: () => [...queryKeys.chat.all, 'conversations'] as const,
    conversation: (id: number) => [...queryKeys.chat.conversations(), id] as const,
    messages: (conversationId: number) => [...queryKeys.chat.all, 'messages', conversationId] as const,
  },

  // ========== FAMILY QUERIES ==========
  family: {
    all: ['family'] as const,
    current: () => [...queryKeys.family.all, 'current'] as const,
    members: () => [...queryKeys.family.all, 'members'] as const,
    invitations: () => [...queryKeys.family.all, 'invitations'] as const,
  },

  // ========== GROCERY QUERIES ==========
  grocery: {
    all: ['grocery'] as const,
    lists: () => [...queryKeys.grocery.all, 'list'] as const,
    list: (id?: number) => [...queryKeys.grocery.lists(), id] as const,
    suggestions: () => [...queryKeys.grocery.all, 'suggestions'] as const,
  },

  // ========== QUICK MEALS QUERIES ==========
  quickMeals: {
    all: ['quickMeals'] as const,
    recommendations: (preferences?: any) => [...queryKeys.quickMeals.all, 'recommendations', { preferences }] as const,
  },

  // ========== BARCODE SCANNER QUERIES ==========
  barcode: {
    all: ['barcode'] as const,
    product: (barcode: string) => [...queryKeys.barcode.all, barcode] as const,
  },
};

// ============================================
// QUERY INVALIDATION HELPERS
// ============================================

/**
 * Helper functions to invalidate specific query groups
 */
export const invalidateQueries = {
  /**
   * Invalidate all user-related queries
   */
  user: () => queryClient.invalidateQueries({ queryKey: queryKeys.user.all }),

  /**
   * Invalidate all meal-related queries
   */
  meals: () => queryClient.invalidateQueries({ queryKey: queryKeys.meals.all }),

  /**
   * Invalidate specific meal detail
   */
  mealDetail: (id: number) => queryClient.invalidateQueries({ queryKey: queryKeys.meals.detail(id) }),

  /**
   * Invalidate all pantry-related queries
   */
  pantry: () => queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all }),

  /**
   * Invalidate all chat-related queries
   */
  chat: () => queryClient.invalidateQueries({ queryKey: queryKeys.chat.all }),

  /**
   * Invalidate specific conversation
   */
  conversation: (id: number) => queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversation(id) }),

  /**
   * Invalidate all family-related queries
   */
  family: () => queryClient.invalidateQueries({ queryKey: queryKeys.family.all }),

  /**
   * Invalidate all grocery-related queries
   */
  grocery: () => queryClient.invalidateQueries({ queryKey: queryKeys.grocery.all }),
};

// ============================================
// PREFETCH HELPERS
// ============================================

/**
 * Helper functions for common prefetch scenarios
 */
export const prefetchQueries = {
  /**
   * Prefetch user data for faster navigation
   */
  user: async (fetchFn: () => Promise<any>) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.user.current(),
      queryFn: fetchFn,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  },

  /**
   * Prefetch meal details when hovering/viewing list
   */
  mealDetail: async (id: number, fetchFn: () => Promise<any>) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.meals.detail(id),
      queryFn: fetchFn,
      staleTime: 1000 * 60 * 10, // 10 minutes
    });
  },

  /**
   * Prefetch pantry items for faster access
   */
  pantry: async (fetchFn: () => Promise<any>) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.pantry.lists(),
      queryFn: fetchFn,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  },
};

// ============================================
// OPTIMISTIC UPDATE HELPERS
// ============================================

/**
 * Helper for creating optimistic updates
 */
export const optimisticUpdate = {
  /**
   * Add item optimistically to a list
   */
  addToList: <T>(queryKey: any[], newItem: T) => {
    queryClient.setQueryData<T[]>(queryKey, (old) => {
      if (!old) return [newItem];
      return [...old, newItem];
    });
  },

  /**
   * Remove item optimistically from a list
   */
  removeFromList: <T extends { id: number }>(queryKey: any[], itemId: number) => {
    queryClient.setQueryData<T[]>(queryKey, (old) => {
      if (!old) return [];
      return old.filter((item) => item.id !== itemId);
    });
  },

  /**
   * Update item optimistically in a list
   */
  updateInList: <T extends { id: number }>(queryKey: any[], itemId: number, updates: Partial<T>) => {
    queryClient.setQueryData<T[]>(queryKey, (old) => {
      if (!old) return [];
      return old.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
    });
  },
};

export default queryClient;
