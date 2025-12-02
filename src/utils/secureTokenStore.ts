/**
 * ============================================
 * SECURE TOKEN STORAGE
 * ============================================
 *
 * Secure token management using Expo SecureStore
 * - Hardware-backed encryption on supported devices
 * - Keychain (iOS) / KeyStore (Android)
 * - Best practice for storing auth tokens
 */

import * as SecureStore from 'expo-secure-store';

// ============================================
// STORAGE KEYS
// ============================================

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  SESSION_ID: 'session_id',
} as const;

// ============================================
// TOKEN STORAGE FUNCTIONS
// ============================================

/**
 * Save access token securely
 */
export async function saveAccessToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, token);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to save access token:', error);
    throw new Error('Failed to save access token');
  }
}

/**
 * Get access token
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to get access token:', error);
    return null;
  }
}

/**
 * Delete access token
 */
export async function deleteAccessToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to delete access token:', error);
  }
}

/**
 * Save refresh token securely
 */
export async function saveRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to save refresh token:', error);
    throw new Error('Failed to save refresh token');
  }
}

/**
 * Get refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Delete refresh token
 */
export async function deleteRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to delete refresh token:', error);
  }
}

/**
 * Save both access and refresh tokens
 */
export async function saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await saveAccessToken(accessToken);
  if (refreshToken) {
    await saveRefreshToken(refreshToken);
  }
}

/**
 * Get both access and refresh tokens
 */
export async function getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);

  return { accessToken, refreshToken };
}

/**
 * Delete all tokens (logout)
 */
export async function deleteAllTokens(): Promise<void> {
  await Promise.all([
    deleteAccessToken(),
    deleteRefreshToken(),
    deleteUserId(),
    deleteSessionId(),
  ]);
}

/**
 * Save user ID
 */
export async function saveUserId(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEYS.USER_ID, userId);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to save user ID:', error);
  }
}

/**
 * Get user ID
 */
export async function getUserId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS.USER_ID);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to get user ID:', error);
    return null;
  }
}

/**
 * Delete user ID
 */
export async function deleteUserId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEYS.USER_ID);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to delete user ID:', error);
  }
}

/**
 * Save session ID
 */
export async function saveSessionId(sessionId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEYS.SESSION_ID, sessionId);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to save session ID:', error);
  }
}

/**
 * Get session ID
 */
export async function getSessionId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS.SESSION_ID);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to get session ID:', error);
    return null;
  }
}

/**
 * Delete session ID
 */
export async function deleteSessionId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEYS.SESSION_ID);
  } catch (error) {
    console.error('[SecureTokenStore] Failed to delete session ID:', error);
  }
}

/**
 * Check if user is authenticated (has valid access token)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null && token.length > 0;
}

/**
 * Export all functions as a namespace for convenience
 */
export const secureTokenStore = {
  saveAccessToken,
  getAccessToken,
  deleteAccessToken,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  saveTokens,
  getTokens,
  deleteAllTokens,
  saveUserId,
  getUserId,
  deleteUserId,
  saveSessionId,
  getSessionId,
  deleteSessionId,
  isAuthenticated,
};

export default secureTokenStore;
