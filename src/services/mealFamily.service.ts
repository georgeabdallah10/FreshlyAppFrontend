/**
 * ============================================
 * MEAL FAMILY ATTACHMENT SERVICE
 * ============================================
 * Service for attaching meals to families
 */

import { BASE_URL as API_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";

// ============================================
// TYPES
// ============================================

export interface AttachFamilyRequest {
  familyId: number;
}

export interface AttachFamilyResponse {
  message: string;
  meal_id: number;
  family_id: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getAuthHeader() {
  const token = await Storage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Attach an existing personal meal to a family
 * Makes the meal shareable with family members
 */
export async function attachMealToFamily(
  mealId: number,
  familyId: number
): Promise<AttachFamilyResponse> {
  const headers = await getAuthHeader();

  try {
    console.log('[mealFamilyService] Attaching meal to family:', {
      url: `${API_URL}/meals/${mealId}/attach-family`,
      mealId,
      familyId,
    });

    const res = await fetch(`${API_URL}/meals/${mealId}/attach-family`, {
      method: "POST",
      headers,
      body: JSON.stringify({ familyId }),
    });

    console.log('[mealFamilyService] Response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to attach meal to family";

      // Try to parse error from response
      if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // If JSON parsing fails, use status-based messages
          if (res.status === 400) {
            errorMessage = "Invalid request. Please check your selection.";
          } else if (res.status === 401) {
            errorMessage = "Session expired. Please log in again.";
          } else if (res.status === 403) {
            if (errorText.includes("only attach meals you created")) {
              errorMessage = "You can only attach meals you created";
            } else if (errorText.includes("not a member of this family")) {
              errorMessage = "You are not a member of this family";
            } else {
              errorMessage = "You don't have permission to attach this meal";
            }
          } else if (res.status === 404) {
            if (errorText.includes("Meal not found")) {
              errorMessage = "Meal not found";
            } else if (errorText.includes("Family not found")) {
              errorMessage = "Family not found";
            } else {
              errorMessage = "Meal or family not found";
            }
          } else if (res.status >= 500) {
            errorMessage = "Server error. Please try again later.";
          }
        }
      }

      console.error('[mealFamilyService] Error response:', {
        status: res.status,
        errorMessage,
        errorText,
      });
      throw new Error(errorMessage);
    }

    const data = await res.json();
    console.log('[mealFamilyService] Success:', data);
    return data;
  } catch (error) {
    console.error('[mealFamilyService] Exception:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to attach meal to family");
  }
}

/**
 * Check if a meal can be shared (has family_id)
 */
export function canShareMeal(meal: { familyId?: number | null }): boolean {
  return meal.familyId != null && meal.familyId > 0;
}

/**
 * Check if user owns a meal (can attach it to family)
 */
export function canAttachMeal(
  meal: { createdByUserId?: number },
  currentUserId?: number
): boolean {
  if (!currentUserId || !meal.createdByUserId) return false;
  return meal.createdByUserId === currentUserId;
}
