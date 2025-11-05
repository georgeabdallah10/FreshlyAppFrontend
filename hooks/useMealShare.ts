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
  const { data: requests } = useReceivedShareRequests({ status: 'pending' });
  
  return {
    data: requests?.length ?? 0,
    isLoading: false,
  };
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to send a meal share request
 * @example
 * const sendRequest = useSendShareRequest();
 * await sendRequest.mutateAsync({
 *   meal_id: 123,
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
      // Invalidate sent requests to refresh the list
      queryClient.invalidateQueries({ queryKey: mealShareKeys.sent() });
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
    onSuccess: () => {
      // Invalidate received requests and pending count
      queryClient.invalidateQueries({ queryKey: mealShareKeys.received() });
      queryClient.invalidateQueries({ queryKey: mealShareKeys.pendingCount() });
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
      // Invalidate received requests and pending count
      queryClient.invalidateQueries({ queryKey: mealShareKeys.received() });
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
      // Invalidate sent requests to refresh the list
      queryClient.invalidateQueries({ queryKey: mealShareKeys.sent() });
    },
  });
}
