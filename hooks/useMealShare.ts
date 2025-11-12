/**
 * ============================================
 * MEAL SHARE REQUEST REACT QUERY HOOKS
 * ============================================
 * React Query hooks for meal sharing system
 */

import {
    SendShareRequestInput,
    ShareRequestsQuery,
    mealShareService
} from '@/src/services/mealShare.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/config/queryClient';

// ============================================
// QUERY KEYS
// ============================================

export const mealShareKeys = {
  all: ['mealShares'] as const,
  received: (query?: ShareRequestsQuery) => 
    ['mealShares', 'received', query] as const,
  sent: (query?: ShareRequestsQuery) => 
    ['mealShares', 'sent', query] as const,
  detail: (id: number) => ['mealShares', 'detail', id] as const,
  pendingCount: () => ['mealShares', 'pendingCount'] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch received share requests
 * @example
 * const { data: requests, isLoading } = useReceivedShareRequests({ status: 'pending' });
 */
export function useReceivedShareRequests(query?: ShareRequestsQuery) {
  return useQuery({
    queryKey: mealShareKeys.received(query),
    queryFn: () => mealShareService.getReceivedRequests(query),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch sent share requests
 * @example
 * const { data: requests, isLoading } = useSentShareRequests({ status: 'pending' });
 */
export function useSentShareRequests(query?: ShareRequestsQuery) {
  return useQuery({
    queryKey: mealShareKeys.sent(query),
    queryFn: () => mealShareService.getSentRequests(query),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch a specific share request
 * @example
 * const { data: request } = useShareRequest(123);
 */
export function useShareRequest(requestId: number, enabled = true) {
  return useQuery({
    queryKey: mealShareKeys.detail(requestId),
    queryFn: () => mealShareService.getShareRequest(requestId),
    enabled: enabled && !!requestId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get count of pending received requests (for badge)
 * @example
 * const { data: count } = usePendingRequestCount();
 */
export function usePendingRequestCount() {
  return useQuery({
    queryKey: mealShareKeys.pendingCount(),
    queryFn: async () => {
      const pending = await mealShareService.getPendingRequests();
      return pending.length;
    },
    staleTime: 15 * 1000,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to send a meal share request
 * @example
 * const sendRequest = useSendShareRequest();
 * await sendRequest.mutateAsync({
 *   mealId: 123,
 *   recipientUserId: 456,
 *   message: 'Check out this recipe!'
 * });
 */
export function useSendShareRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendShareRequestInput) =>
      mealShareService.sendMealShareRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealShareKeys.sent() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.received() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.pendingCount() });
    },
  });
}

/**
 * Hook to accept a share request
 * @example
 * const acceptRequest = useAcceptShareRequest();
 * await acceptRequest.mutateAsync(123);
 */
export function useAcceptShareRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) =>
      mealShareService.acceptShareRequest(requestId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealShareKeys.received() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.sent() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.pendingCount() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.all });
      if (data?.acceptedMealDetail?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.meals.detail(data.acceptedMealDetail.id) });
      }
    },
  });
}

/**
 * Hook to decline a share request
 * @example
 * const declineRequest = useDeclineShareRequest();
 * await declineRequest.mutateAsync(123);
 */
export function useDeclineShareRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) =>
      mealShareService.declineShareRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealShareKeys.received() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.sent() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.pendingCount() });
    },
  });
}

/**
 * Hook to cancel a sent request
 * @example
 * const cancelRequest = useCancelShareRequest();
 * await cancelRequest.mutateAsync(123);
 */
export function useCancelShareRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) =>
      mealShareService.cancelShareRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealShareKeys.sent() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.received() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.pendingCount() });
    },
  });
}
