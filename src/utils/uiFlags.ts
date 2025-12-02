/**
 * ============================================
 * UI FLAGS STORAGE
 * ============================================
 *
 * Simple AsyncStorage wrapper for UI state flags
 * - Onboarding status
 * - Tutorial completion
 * - Feature flags
 * - User preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// STORAGE KEYS
// ============================================

const UI_FLAG_KEYS = {
  HAS_SEEN_TUTORIAL: '@ui/hasSeenTutorial',
  HAS_COMPLETED_ONBOARDING: '@ui/hasCompletedOnboarding',
  HAS_SEEN_PANTRY_GUIDE: '@ui/hasSeenPantryGuide',
  HAS_SEEN_MEAL_PLAN_GUIDE: '@ui/hasSeenMealPlanGuide',
  HAS_SEEN_NOTIFICATION_PROMPT: '@ui/hasSeenNotificationPrompt',
  HAS_ENABLED_PUSH_NOTIFICATIONS: '@ui/hasEnabledPushNotifications',
  PREFERRED_THEME: '@ui/preferredTheme',
  LAST_APP_VERSION: '@ui/lastAppVersion',
} as const;

// ============================================
// TUTORIAL & ONBOARDING
// ============================================

/**
 * Mark tutorial as seen
 */
export async function setHasSeenTutorial(value: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_FLAG_KEYS.HAS_SEEN_TUTORIAL, JSON.stringify(value));
  } catch (error) {
    console.error('[UIFlags] Failed to set hasSeenTutorial:', error);
  }
}

/**
 * Check if user has seen tutorial
 */
export async function getHasSeenTutorial(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(UI_FLAG_KEYS.HAS_SEEN_TUTORIAL);
    return value === 'true';
  } catch (error) {
    console.error('[UIFlags] Failed to get hasSeenTutorial:', error);
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export async function setHasCompletedOnboarding(value: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_FLAG_KEYS.HAS_COMPLETED_ONBOARDING, JSON.stringify(value));
  } catch (error) {
    console.error('[UIFlags] Failed to set hasCompletedOnboarding:', error);
  }
}

/**
 * Check if user has completed onboarding
 */
export async function getHasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(UI_FLAG_KEYS.HAS_COMPLETED_ONBOARDING);
    return value === 'true';
  } catch (error) {
    console.error('[UIFlags] Failed to get hasCompletedOnboarding:', error);
    return false;
  }
}

// ============================================
// FEATURE GUIDES
// ============================================

/**
 * Mark pantry guide as seen
 */
export async function setHasSeenPantryGuide(value: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_FLAG_KEYS.HAS_SEEN_PANTRY_GUIDE, JSON.stringify(value));
  } catch (error) {
    console.error('[UIFlags] Failed to set hasSeenPantryGuide:', error);
  }
}

/**
 * Check if user has seen pantry guide
 */
export async function getHasSeenPantryGuide(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(UI_FLAG_KEYS.HAS_SEEN_PANTRY_GUIDE);
    return value === 'true';
  } catch (error) {
    console.error('[UIFlags] Failed to get hasSeenPantryGuide:', error);
    return false;
  }
}

/**
 * Mark meal plan guide as seen
 */
export async function setHasSeenMealPlanGuide(value: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_FLAG_KEYS.HAS_SEEN_MEAL_PLAN_GUIDE, JSON.stringify(value));
  } catch (error) {
    console.error('[UIFlags] Failed to set hasSeenMealPlanGuide:', error);
  }
}

/**
 * Check if user has seen meal plan guide
 */
export async function getHasSeenMealPlanGuide(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(UI_FLAG_KEYS.HAS_SEEN_MEAL_PLAN_GUIDE);
    return value === 'true';
  } catch (error) {
    console.error('[UIFlags] Failed to get hasSeenMealPlanGuide:', error);
    return false;
  }
}

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Mark notification permission prompt as seen
 */
export async function setHasSeenNotificationPrompt(value: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_FLAG_KEYS.HAS_SEEN_NOTIFICATION_PROMPT, JSON.stringify(value));
  } catch (error) {
    console.error('[UIFlags] Failed to set hasSeenNotificationPrompt:', error);
  }
}

/**
 * Check if user has seen notification permission prompt
 */
export async function getHasSeenNotificationPrompt(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(UI_FLAG_KEYS.HAS_SEEN_NOTIFICATION_PROMPT);
    return value === 'true';
  } catch (error) {
    console.error('[UIFlags] Failed to get hasSeenNotificationPrompt:', error);
    return false;
  }
}

/**
 * Set push notifications enabled status
 */
export async function setHasEnabledPushNotifications(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_FLAG_KEYS.HAS_ENABLED_PUSH_NOTIFICATIONS, JSON.stringify(value));
  } catch (error) {
    console.error('[UIFlags] Failed to set hasEnabledPushNotifications:', error);
  }
}

/**
 * Check if push notifications are enabled
 */
export async function getHasEnabledPushNotifications(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(UI_FLAG_KEYS.HAS_ENABLED_PUSH_NOTIFICATIONS);
    return value === 'true';
  } catch (error) {
    console.error('[UIFlags] Failed to get hasEnabledPushNotifications:', error);
    return false;
  }
}

// ============================================
// THEME PREFERENCE
// ============================================

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Set preferred theme
 */
export async function setPreferredTheme(theme: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_FLAG_KEYS.PREFERRED_THEME, theme);
  } catch (error) {
    console.error('[UIFlags] Failed to set preferredTheme:', error);
  }
}

/**
 * Get preferred theme
 */
export async function getPreferredTheme(): Promise<ThemePreference> {
  try {
    const value = await AsyncStorage.getItem(UI_FLAG_KEYS.PREFERRED_THEME) as ThemePreference;
    return value || 'system';
  } catch (error) {
    console.error('[UIFlags] Failed to get preferredTheme:', error);
    return 'system';
  }
}

// ============================================
// APP VERSION
// ============================================

/**
 * Set last app version
 */
export async function setLastAppVersion(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_FLAG_KEYS.LAST_APP_VERSION, version);
  } catch (error) {
    console.error('[UIFlags] Failed to set lastAppVersion:', error);
  }
}

/**
 * Get last app version
 */
export async function getLastAppVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(UI_FLAG_KEYS.LAST_APP_VERSION);
  } catch (error) {
    console.error('[UIFlags] Failed to get lastAppVersion:', error);
    return null;
  }
}

// ============================================
// RESET ALL FLAGS
// ============================================

/**
 * Reset all UI flags (useful for testing or reset functionality)
 */
export async function resetAllUIFlags(): Promise<void> {
  try {
    const keys = Object.values(UI_FLAG_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('[UIFlags] Failed to reset all UI flags:', error);
  }
}

// ============================================
// EXPORT AS NAMESPACE
// ============================================

export const uiFlags = {
  setHasSeenTutorial,
  getHasSeenTutorial,
  setHasCompletedOnboarding,
  getHasCompletedOnboarding,
  setHasSeenPantryGuide,
  getHasSeenPantryGuide,
  setHasSeenMealPlanGuide,
  getHasSeenMealPlanGuide,
  setHasSeenNotificationPrompt,
  getHasSeenNotificationPrompt,
  setHasEnabledPushNotifications,
  getHasEnabledPushNotifications,
  setPreferredTheme,
  getPreferredTheme,
  setLastAppVersion,
  getLastAppVersion,
  resetAllUIFlags,
};

export default uiFlags;
