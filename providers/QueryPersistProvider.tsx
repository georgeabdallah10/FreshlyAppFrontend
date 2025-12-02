/**
 * ============================================
 * QUERY PERSISTENCE PROVIDER
 * ============================================
 *
 * Wraps QueryClientProvider with MMKV persistence
 * - Persists query cache to MMKV storage
 * - Automatically restores cache on app start
 * - Handles hydration state
 */

import { queryClient } from '@/src/config/queryClient';
import { mmkvQueryPersister } from '@/src/utils/mmkvStorage';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import React, { type ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

interface QueryPersistProviderProps {
  children: ReactNode;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Query Persistence Provider with MMKV storage
 *
 * Features:
 * - Automatic cache persistence to MMKV
 * - Instant app startup with cached data
 * - Background refetching for fresh data
 * - Offline support
 */
export function QueryPersistProvider({ children }: QueryPersistProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: mmkvQueryPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        buster: '', // Change this to invalidate all cached data
        dehydrateOptions: {
          // Only persist successful queries
          shouldDehydrateQuery: (query) => {
            return query.state.status === 'success';
          },
        },
      }}
      onSuccess={() => {
        // Refetch all queries in the background after hydration
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries();
        });
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/**
 * Simple QueryClientProvider wrapper (without persistence)
 * Use this if you want to disable persistence
 */
export function SimpleQueryProvider({ children }: QueryPersistProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryPersistProvider;
