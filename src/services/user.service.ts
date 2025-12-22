/**
 * ============================================
 * USER API SERVICE
 * ============================================
 */

import { apiClient } from '../client/apiClient';
import {
  fetchUserPreferences as fetchUserPreferencesApi,
  updateUserPreferences as updateUserPreferencesApi,
  type UserPreferencesInput,
  type UserPreferencesOut,
  type UserPreferencesUpdateInput,
} from '../user/setPrefrences';

// ============================================
// TYPES
// ============================================

export interface User {
  id?: number;
  name?: string;
  email?: string;
  phone_number?: string;
  avatar_path?: string;
  status?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @deprecated Use UserPreferencesOut from setPrefrences.ts instead
 * Legacy type kept for backward compatibility
 */
export interface UserPreferences {
  dietaryRestrictions?: string[];
  allergies?: string[];
  lifestylePreferences?: string[];
  culturalPreferences?: string[];
  healthGoals?: string[];
  cookingMethods?: string[];
  budgetPreference?: string;
  timePreference?: string;
}

// Re-export new types for convenience
export type { UserPreferencesInput, UserPreferencesOut, UserPreferencesUpdateInput };

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone_number?: string;
  location?: string;
  status?: string;
  avatar_path?: string;
}

export interface UserSearchResult extends User {
  full_name?: string;
  display_name?: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  return await apiClient.get<User>('/users/me');
}

/**
 * Update user profile
 */
export async function updateUser(input: UpdateUserInput): Promise<User> {
  return await apiClient.patch<User>('/users/me', input);
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferencesOut | null> {
  const res = await fetchUserPreferencesApi();
  if (!res.ok) {
    throw { message: res.message, status: res.status };
  }
  return res.data;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  preferences: UserPreferencesUpdateInput
): Promise<UserPreferencesOut> {
  const res = await updateUserPreferencesApi(preferences);
  if (!res.ok) {
    throw { message: res.message, status: res.status };
  }
  return res.data;
}

/**
 * Upload profile picture
 */
export async function uploadProfilePicture(file: FormData): Promise<{ avatar_path: string }> {
  return await apiClient.post<{ avatar_path: string }>('/users/me/avatar', file, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * Delete user account
 */
export async function deleteUserAccount(): Promise<void> {
  await apiClient.delete('/users/me');
}

/**
 * Change password
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/users/me/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<{
  totalMeals: number;
  totalPantryItems: number;
  favoriteMeals: number;
}> {
  return await apiClient.get('/users/me/stats');
}

/**
 * Search users globally by name or email
 */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  return await apiClient.get<UserSearchResult[]>('/users/search', {
    params: { query: trimmed },
  });
}

// ============================================
// EXPORT ALL
// ============================================

export const userApi = {
  getCurrentUser,
  updateUser,
  getUserPreferences,
  updateUserPreferences,
  uploadProfilePicture,
  deleteUserAccount,
  changePassword,
  getUserStats,
  searchUsers,
};

export default userApi;
