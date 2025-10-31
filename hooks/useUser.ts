/**
 * ============================================
 * USER HOOKS - React Query Integration
 * ============================================
 */

import { ApiError } from '@/src/client/apiClient';
import { invalidateQueries, queryKeys } from '@/src/config/queryClient';
import {
    UpdateUserInput,
    User,
    userApi,
    UserPreferences,
} from '@/src/services/user.service';
import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Get current user
 */
export function useUser(options?: Omit<UseQueryOptions<User, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<User, ApiError>({
    queryKey: queryKeys.user.current(),
    queryFn: () => userApi.getCurrentUser(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}

/**
 * Get user preferences
 */
export function useUserPreferences(options?: Omit<UseQueryOptions<UserPreferences, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<UserPreferences, ApiError>({
    queryKey: queryKeys.user.preferences(),
    queryFn: () => userApi.getUserPreferences(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}

/**
 * Get user statistics
 */
export function useUserStats(options?: Omit<UseQueryOptions<any, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, ApiError>({
    queryKey: [...queryKeys.user.all, 'stats'],
    queryFn: () => userApi.getUserStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Update user profile
 */
export function useUpdateUser(options?: UseMutationOptions<User, ApiError, UpdateUserInput>) {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, UpdateUserInput>({
    mutationFn: (input: UpdateUserInput) => userApi.updateUser(input),
    onMutate: async (updatedUser) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.user.current() });
      
      const previousUser = queryClient.getQueryData<User>(queryKeys.user.current());

      if (previousUser) {
        queryClient.setQueryData<User>(queryKeys.user.current(), {
          ...previousUser,
          ...updatedUser,
        });
      }

      return { previousUser };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.user.current(), context.previousUser);
      }
    },
    onSuccess: () => {
      invalidateQueries.user();
    },
    ...options,
  });
}

/**
 * Update user preferences
 */
export function useUpdateUserPreferences(options?: UseMutationOptions<UserPreferences, ApiError, UserPreferences>) {
  const queryClient = useQueryClient();

  return useMutation<UserPreferences, ApiError, UserPreferences>({
    mutationFn: (preferences: UserPreferences) => userApi.updateUserPreferences(preferences),
    onMutate: async (updatedPrefs) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.user.preferences() });
      
      const previousPrefs = queryClient.getQueryData<UserPreferences>(queryKeys.user.preferences());

      queryClient.setQueryData<UserPreferences>(queryKeys.user.preferences(), {
        ...previousPrefs,
        ...updatedPrefs,
      });

      return { previousPrefs };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousPrefs) {
        queryClient.setQueryData(queryKeys.user.preferences(), context.previousPrefs);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.preferences() });
    },
    ...options,
  });
}

/**
 * Upload profile picture
 */
export function useUploadProfilePicture(options?: UseMutationOptions<{ avatar_path: string }, ApiError, FormData>) {
  const queryClient = useQueryClient();

  return useMutation<{ avatar_path: string }, ApiError, FormData>({
    mutationFn: (file: FormData) => userApi.uploadProfilePicture(file),
    onSuccess: (data) => {
      // Update user with new avatar path
      queryClient.setQueryData<User>(queryKeys.user.current(), (old) => {
        if (!old) return old;
        return { ...old, avatar_path: data.avatar_path };
      });
      invalidateQueries.user();
    },
    ...options,
  });
}

/**
 * Change password
 */
export function useChangePassword(options?: UseMutationOptions<void, ApiError, { oldPassword: string; newPassword: string }>) {
  return useMutation<void, ApiError, { oldPassword: string; newPassword: string }>({
    mutationFn: ({ oldPassword, newPassword }) => userApi.changePassword(oldPassword, newPassword),
    ...options,
  });
}

/**
 * Delete user account
 */
export function useDeleteUserAccount(options?: UseMutationOptions<void, ApiError, void>) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () => userApi.deleteUserAccount(),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
    },
    ...options,
  });
}
