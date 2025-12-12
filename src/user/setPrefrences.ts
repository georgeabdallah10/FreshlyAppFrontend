import { Storage } from "../utils/storage";
import { BASE_URL } from "../env/baseUrl";

// ============================================
// TYPES - Aligned with Backend UserPreferences
// ============================================

export type Goal = "lose-weight" | "weight-gain" | "muscle-gain" | "balanced" | "leaner";
export type DietType = "halal" | "kosher" | "vegetarian" | "vegan" | "pescatarian" | null;
export type TrainingLevel = "light" | "casual" | "intense" | null;
export type Gender = "male" | "female";

/**
 * Input for creating/updating user preferences during onboarding
 * This is the complete set of fields expected by the backend
 */
export type UserPreferencesInput = {
  // Body Information
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;

  // Athlete Settings
  athleteMode: boolean;
  trainingLevel: TrainingLevel;

  // Goal
  goal: Goal;

  // Diet & Allergies
  dietType: DietType;
  foodAllergies: string[];

  // Nutrition Targets (calculated values)
  targetCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;

  // Safe Range
  calorieMin: number;
  calorieMax: number;
};

/**
 * Partial input for updating specific fields
 */
export type UserPreferencesUpdateInput = Partial<UserPreferencesInput>;

/**
 * Full UserPreferences object returned from backend
 */
export type UserPreferencesOut = {
  id: number;
  user_id: number;

  // Body Information
  age: number | null;
  gender: Gender | null;
  heightCm: number | null;
  weightKg: number | null;

  // Athlete Settings
  athleteMode: boolean;
  trainingLevel: TrainingLevel;

  // Goal
  goal: Goal | null;

  // Diet & Allergies
  dietType: DietType;
  foodAllergies: string[] | null;

  // Nutrition Targets
  targetCalories: number | null;
  proteinGrams: number | null;
  carbGrams: number | null;
  fatGrams: number | null;

  // Optional: Calorie breakdown by macro
  proteinCalories?: number | null;
  carbCalories?: number | null;
  fatCalories?: number | null;

  // Safe Range
  calorieMin: number | null;
  calorieMax: number | null;

  // Timestamps
  created_at: string;
  updated_at: string;
};

/**
 * Structured preferences used in the frontend state tree
 * to keep naming consistent across screens.
 */
export type UserPreferencesState = {
  body: {
    age: number | null;
    gender: Gender | null;
    heightCm: number | null;
    weightKg: number | null;
  };
  athlete: {
    athleteMode: boolean;
    trainingLevel: TrainingLevel;
  };
  goal: Goal | null;
  diet: {
    dietType: DietType;
    foodAllergies: string[];
  };
  nutrition: {
    targetCalories: number | null;
    proteinGrams: number | null;
    carbGrams: number | null;
    fatGrams: number | null;
    proteinCalories?: number | null;
    carbCalories?: number | null;
    fatCalories?: number | null;
    calorieMin: number | null;
    calorieMax: number | null;
  };
};

/**
 * @deprecated Use UserPreferencesInput instead
 * Legacy type for backward compatibility
 */
export type setPrefrencesInput = {
  diet_codes: string[];
  allergen_ingredient_ids: number[];
  disliked_ingredient_ids: number[];
  goal: string;
  calorie_target: number | null;
  is_athlete?: boolean;
  training_level?: TrainingLevel;
};

/**
 * @deprecated Use UserPreferencesOut instead
 * Legacy type for backward compatibility
 */
export type UserPreferenceOut = {
  id: number;
  user_id: number;
  diet_codes: string[] | null;
  allergen_ingredient_ids: number[] | null;
  disliked_ingredient_ids: number[] | null;
  goal: string | null;
  calorie_target: number | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  created_at: string;
  updated_at: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

// ============================================
// NEW API FUNCTIONS - Aligned with Backend
// ============================================

/**
 * Save complete user preferences during onboarding
 * This is the single API call made when onboarding is completed
 */
export async function saveUserPreferences(
  input: UserPreferencesInput
): Promise<ApiResult<UserPreferencesOut>> {
  try {
    const token = await Storage.getItem("access_token");

    const res = await fetch(`${BASE_URL}/preferences/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        age: input.age,
        gender: input.gender,
        height_cm: input.heightCm,
        weight_kg: input.weightKg,
        athlete_mode: input.athleteMode,
        training_level: input.athleteMode ? input.trainingLevel : null,
        goal: input.goal,
        diet_type: input.dietType,
        food_allergies: input.foodAllergies,
        target_calories: input.targetCalories,
        protein_grams: input.proteinGrams,
        carb_grams: input.carbGrams,
        fat_grams: input.fatGrams,
        calorie_min: input.calorieMin,
        calorie_max: input.calorieMax,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.detail || errorData.message || `Request failed with status ${res.status}`;
      return { ok: false, status: res.status, message: msg };
    }

    const data = await res.json();
    return { ok: true, data: mapBackendToFrontend(data) };
  } catch (err: any) {
    return { ok: false, status: 500, message: err.message || "Network error" };
  }
}

/**
 * Update specific fields of user preferences
 * Only sends changed fields to the backend
 */
export async function updateUserPreferences(
  input: UserPreferencesUpdateInput
): Promise<ApiResult<UserPreferencesOut>> {
  try {
    const token = await Storage.getItem("access_token");

    // Build the request body with only the provided fields
    const body: Record<string, any> = {};

    if (input.age !== undefined) body.age = input.age;
    if (input.gender !== undefined) body.gender = input.gender;
    if (input.heightCm !== undefined) body.height_cm = input.heightCm;
    if (input.weightKg !== undefined) body.weight_kg = input.weightKg;
    if (input.athleteMode !== undefined) {
      body.athlete_mode = input.athleteMode;
      // Clear training level when athlete mode is turned off
      if (input.athleteMode === false) {
        body.training_level = null;
      }
    }
    if (input.trainingLevel !== undefined) body.training_level = input.trainingLevel;
    if (input.goal !== undefined) body.goal = input.goal;
    if (input.dietType !== undefined) body.diet_type = input.dietType;
    if (input.foodAllergies !== undefined) body.food_allergies = input.foodAllergies;
    if (input.targetCalories !== undefined) body.target_calories = input.targetCalories;
    if (input.proteinGrams !== undefined) body.protein_grams = input.proteinGrams;
    if (input.carbGrams !== undefined) body.carb_grams = input.carbGrams;
    if (input.fatGrams !== undefined) body.fat_grams = input.fatGrams;
    if (input.calorieMin !== undefined) body.calorie_min = input.calorieMin;
    if (input.calorieMax !== undefined) body.calorie_max = input.calorieMax;

    const res = await fetch(`${BASE_URL}/preferences/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.detail || errorData.message || `Request failed with status ${res.status}`;
      return { ok: false, status: res.status, message: msg };
    }

    const data = await res.json();
    return { ok: true, data: mapBackendToFrontend(data) };
  } catch (err: any) {
    return { ok: false, status: 500, message: err.message || "Network error" };
  }
}

/**
 * Fetch current user preferences
 * Returns null-safe preferences object
 */
export async function fetchUserPreferences(): Promise<ApiResult<UserPreferencesOut | null>> {
  try {
    const token = await Storage.getItem("access_token");

    const res = await fetch(`${BASE_URL}/preferences/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // Handle first-time user (no preferences yet)
    if (res.status === 404) {
      return { ok: true, data: null };
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.detail || errorData.message || `Request failed with status ${res.status}`;
      return { ok: false, status: res.status, message: msg };
    }

    const data = await res.json();
    return { ok: true, data: mapBackendToFrontend(data) };
  } catch (err: any) {
    return { ok: false, status: 500, message: err.message || "Network error" };
  }
}

/**
 * Map backend snake_case fields to frontend camelCase
 */
function mapBackendToFrontend(data: any): UserPreferencesOut {
  const athleteMode = data.athlete_mode ?? data.athleteMode ?? false;
  const resolvedTraining =
    athleteMode === false
      ? null
      : data.training_level ?? data.trainingLevel ?? null;

  return {
    id: data.id,
    user_id: data.user_id,
    age: data.age ?? null,
    gender: data.gender ?? null,
    heightCm: data.height_cm ?? data.heightCm ?? null,
    weightKg: data.weight_kg ?? data.weightKg ?? null,
    athleteMode,
    trainingLevel: resolvedTraining,
    goal: data.goal ?? null,
    dietType: data.diet_type ?? data.dietType ?? null,
    foodAllergies: data.food_allergies ?? data.foodAllergies ?? [],
    targetCalories: data.target_calories ?? data.targetCalories ?? data.calorie_target ?? null,
    proteinGrams: data.protein_grams ?? data.proteinGrams ?? null,
    carbGrams: data.carb_grams ?? data.carbGrams ?? null,
    fatGrams: data.fat_grams ?? data.fatGrams ?? null,
    proteinCalories: data.protein_calories ?? data.proteinCalories ?? null,
    carbCalories: data.carb_calories ?? data.carbCalories ?? null,
    fatCalories: data.fat_calories ?? data.fatCalories ?? null,
    calorieMin: data.calorie_min ?? data.calorieMin ?? null,
    calorieMax: data.calorie_max ?? data.calorieMax ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Normalize backend preferences into the structured frontend shape.
 */
export function mapPreferencesToState(
  preferences: UserPreferencesOut | null
): UserPreferencesState | null {
  if (!preferences) return null;

  return {
    body: {
      age: preferences.age,
      gender: preferences.gender,
      heightCm: preferences.heightCm,
      weightKg: preferences.weightKg,
    },
    athlete: {
      athleteMode: preferences.athleteMode,
      trainingLevel: preferences.trainingLevel,
    },
    goal: preferences.goal,
    diet: {
      dietType: preferences.dietType,
      foodAllergies: preferences.foodAllergies ?? [],
    },
    nutrition: {
      targetCalories: preferences.targetCalories,
      proteinGrams: preferences.proteinGrams,
      carbGrams: preferences.carbGrams,
      fatGrams: preferences.fatGrams,
      proteinCalories: preferences.proteinCalories,
      carbCalories: preferences.carbCalories,
      fatCalories: preferences.fatCalories,
      calorieMin: preferences.calorieMin,
      calorieMax: preferences.calorieMax,
    },
  };
}

// ============================================
// LEGACY API FUNCTIONS - Kept for backward compatibility
// ============================================

/**
 * @deprecated Use saveUserPreferences instead
 */
export async function setPrefrences(
  input: setPrefrencesInput
): Promise<ApiResult<UserPreferenceOut>> {
  try {
    const token = await Storage.getItem("access_token");

  const res = await fetch(`${BASE_URL}/preferences/me`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      diet_codes: input.diet_codes,
      allergen_ingredient_ids: input.allergen_ingredient_ids,
      disliked_ingredient_ids: input.disliked_ingredient_ids,
      goal: input.goal,
      calorie_target: input.calorie_target,
      is_athlete: input.is_athlete ?? false,
      training_level:
        input.is_athlete === false ? null : input.training_level ?? null,
    }),
  });

    if (!res.ok) {
      const msg = await res.text();
      return { ok: false, status: res.status, message: msg };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, status: 500, message: err.message };
  }
}

export async function getMyprefrences() {
  try {
    const token = await Storage.getItem("access_token");
    const res = await fetch(`${BASE_URL}/preferences/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
      if (!res.ok) {
      const msg = await res.text();
      return { ok: false, status: res.status, message: msg };
    }

    const data = await res.json();
    return { ok: true, data }
  } catch (err: any) {
    console.log(`${err}, ERROR`);
  }
}
