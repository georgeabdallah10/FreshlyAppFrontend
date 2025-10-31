/**
 * ============================================
 * USER API SERVICE
 * ============================================
 */

import { apiClient } from '../client/apiClient';

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

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone_number?: string;
  location?: string;
  status?: string;
  avatar_path?: string;
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
export async function getUserPreferences(): Promise<UserPreferences> {
  return await apiClient.get<UserPreferences>('/users/me/preferences');
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
  return await apiClient.put<UserPreferences>('/users/me/preferences', preferences);
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
};

export default userApi;
