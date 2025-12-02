/**
 * ============================================
 * USER STORE - Zustand + MMKV Persistence
 * ============================================
 *
 * Global user state management with:
 * - Zustand for state management
 * - MMKV for fast persistence
 * - TypeScript for type safety
 * - Automatic hydration on app start
 */

import { userStorage } from '@/src/utils/mmkvStorage';
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  age?: number;
  weight?: number; // in kg
  height?: number; // in cm
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  dailyCalories?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  dietaryPreferences?: string[];
  allergies?: string[];
  fitnessGoal?: 'lose-weight' | 'maintain' | 'gain-muscle' | 'improve-health';
  targetWeight?: number; // in kg
  profilePicture?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MacroGoals {
  protein: number; // grams
  fats: number; // grams
  carbs: number; // grams
}

interface UserState {
  // User profile data
  profile: UserProfile;

  // Macro goals
  macroGoals: MacroGoals | null;

  // Loading states
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  updateProfile: (updates: Partial<UserProfile>) => void;
  setMacroGoals: (goals: MacroGoals) => void;
  updateAge: (age: number) => void;
  updateWeight: (weight: number) => void;
  updateHeight: (height: number) => void;
  updateGender: (gender: UserProfile['gender']) => void;
  updateDailyCalories: (calories: number) => void;
  updateActivityLevel: (level: UserProfile['activityLevel']) => void;
  updateDietaryPreferences: (preferences: string[]) => void;
  updateAllergies: (allergies: string[]) => void;
  updateFitnessGoal: (goal: UserProfile['fitnessGoal']) => void;
  resetProfile: () => void;
  setIsLoading: (loading: boolean) => void;
}

// ============================================
// MMKV STORAGE ADAPTER FOR ZUSTAND
// ============================================

/**
 * Create a Zustand-compatible storage adapter using MMKV
 */
const mmkvZustandStorage: StateStorage = {
  setItem: (name, value) => {
    return userStorage.set(name, value);
  },
  getItem: (name) => {
    const value = userStorage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return userStorage.remove(name);
  },
};

// ============================================
// INITIAL STATE
// ============================================

const initialProfile: UserProfile = {
  age: undefined,
  weight: undefined,
  height: undefined,
  gender: undefined,
  dailyCalories: undefined,
  activityLevel: undefined,
  dietaryPreferences: [],
  allergies: [],
  fitnessGoal: undefined,
};

// ============================================
// CREATE STORE
// ============================================

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: initialProfile,
      macroGoals: null,
      isLoading: false,
      isHydrated: false,

      // Actions
      updateProfile: (updates) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        })),

      setMacroGoals: (goals) =>
        set({ macroGoals: goals }),

      updateAge: (age) =>
        set((state) => ({
          profile: { ...state.profile, age },
        })),

      updateWeight: (weight) =>
        set((state) => ({
          profile: { ...state.profile, weight },
        })),

      updateHeight: (height) =>
        set((state) => ({
          profile: { ...state.profile, height },
        })),

      updateGender: (gender) =>
        set((state) => ({
          profile: { ...state.profile, gender },
        })),

      updateDailyCalories: (dailyCalories) =>
        set((state) => ({
          profile: { ...state.profile, dailyCalories },
        })),

      updateActivityLevel: (activityLevel) =>
        set((state) => ({
          profile: { ...state.profile, activityLevel },
        })),

      updateDietaryPreferences: (dietaryPreferences) =>
        set((state) => ({
          profile: { ...state.profile, dietaryPreferences },
        })),

      updateAllergies: (allergies) =>
        set((state) => ({
          profile: { ...state.profile, allergies },
        })),

      updateFitnessGoal: (fitnessGoal) =>
        set((state) => ({
          profile: { ...state.profile, fitnessGoal },
        })),

      resetProfile: () =>
        set({
          profile: initialProfile,
          macroGoals: null,
        }),

      setIsLoading: (isLoading) =>
        set({ isLoading }),
    }),
    {
      name: 'user-store', // Storage key
      storage: createJSONStorage(() => mmkvZustandStorage),
      partialize: (state) => ({
        profile: state.profile,
        macroGoals: state.macroGoals,
        // Don't persist loading states
      }),
      onRehydrateStorage: () => (state) => {
        // Called when storage is hydrated
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

// ============================================
// SELECTORS (for optimized re-renders)
// ============================================

export const selectProfile = (state: UserState) => state.profile;
export const selectAge = (state: UserState) => state.profile.age;
export const selectWeight = (state: UserState) => state.profile.weight;
export const selectHeight = (state: UserState) => state.profile.height;
export const selectGender = (state: UserState) => state.profile.gender;
export const selectDailyCalories = (state: UserState) => state.profile.dailyCalories;
export const selectMacroGoals = (state: UserState) => state.macroGoals;
export const selectActivityLevel = (state: UserState) => state.profile.activityLevel;
export const selectDietaryPreferences = (state: UserState) => state.profile.dietaryPreferences;
export const selectAllergies = (state: UserState) => state.profile.allergies;
export const selectFitnessGoal = (state: UserState) => state.profile.fitnessGoal;
export const selectIsHydrated = (state: UserState) => state.isHydrated;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate BMI from height and weight
 */
export function calculateBMI(weight?: number, height?: number): number | null {
  if (!weight || !height || height === 0) return null;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 */
export function calculateBMR(
  weight?: number,
  height?: number,
  age?: number,
  gender?: UserProfile['gender']
): number | null {
  if (!weight || !height || !age || !gender) return null;

  // Mifflin-St Jeor Equation
  // Men: BMR = 10W + 6.25H - 5A + 5
  // Women: BMR = 10W + 6.25H - 5A - 161
  const baseBMR = 10 * weight + 6.25 * height - 5 * age;

  if (gender === 'male') {
    return baseBMR + 5;
  } else if (gender === 'female') {
    return baseBMR - 161;
  }

  // Average for other genders
  return baseBMR - 78;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure) based on activity level
 */
export function calculateTDEE(
  bmr: number,
  activityLevel?: UserProfile['activityLevel']
): number | null {
  if (!bmr || !activityLevel) return null;

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    'very-active': 1.9,
  };

  return Math.round(bmr * activityMultipliers[activityLevel]);
}

/**
 * Get recommended macro distribution based on fitness goal
 */
export function getRecommendedMacros(
  dailyCalories: number,
  fitnessGoal?: UserProfile['fitnessGoal']
): MacroGoals | null {
  if (!dailyCalories || !fitnessGoal) return null;

  // Macro ratios (Protein:Carbs:Fats)
  const macroRatios = {
    'lose-weight': { protein: 0.35, carbs: 0.30, fats: 0.35 },
    maintain: { protein: 0.30, carbs: 0.40, fats: 0.30 },
    'gain-muscle': { protein: 0.35, carbs: 0.45, fats: 0.20 },
    'improve-health': { protein: 0.30, carbs: 0.40, fats: 0.30 },
  };

  const ratios = macroRatios[fitnessGoal];

  // Calories per gram: Protein = 4, Carbs = 4, Fat = 9
  return {
    protein: Math.round((dailyCalories * ratios.protein) / 4),
    carbs: Math.round((dailyCalories * ratios.carbs) / 4),
    fats: Math.round((dailyCalories * ratios.fats) / 9),
  };
}

export default useUserStore;
