/**
 * ============================================
 * MEAL SHARE REQUEST API SERVICE
 * ============================================
 * New request-based meal sharing system
 */

import { BASE_URL as API_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";

// ============================================
// TYPES
// ============================================

export type ShareRequestStatus = 'pending' | 'accepted' | 'declined';

export interface MealShareRequest {
  id: number;
  meal_id: number;
  sender_id: number;
  receiver_id: number;
  status: ShareRequestStatus;
  message?: string;
  created_at: string;
  updated_at: string;
  // Populated objects
  meal?: {
    id: number;
    name: string;
    description?: string;
    image?: string;
    calories?: number;
    meal_type?: string;
    cuisine?: string;
  };
  sender?: {
    id: number;
    name: string;
    email: string;
    avatar_path?: string;
  };
  receiver?: {
    id: number;
    name: string;
    email: string;
    avatar_path?: string;
  };
}

export interface SendShareRequestInput {
  meal_id: number;
  recipientUserId: number;  // Backend expects recipientUserId
  message?: string;
}

export interface ShareRequestsQuery {
  status?: ShareRequestStatus;
  skip?: number;
  limit?: number;
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
 * Send a meal share request to a family member
 */
export async function sendMealShareRequest(
  input: SendShareRequestInput
): Promise<MealShareRequest> {
  const headers = await getAuthHeader();

  try {
    console.log('[mealShareService] Sending share request:', {
      url: `${API_URL}/meal-share-requests`,
      input,
    });

    const res = await fetch(`${API_URL}/meal-share-requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    console.log('[mealShareService] Response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to send meal share request";

      // Try to parse error from response first
      if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          // Backend returns error in 'error' field
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
            errorMessage = "You can only share meals with family members.";
          } else if (res.status === 404) {
            errorMessage = "Meal or family member not found.";
          } else if (res.status === 409) {
            errorMessage = "You already have a pending request for this meal with this member.";
          } else if (res.status === 429) {
            errorMessage = "Too many requests. Please wait before trying again.";
          } else if (res.status >= 500) {
            errorMessage = "Server error. Please try again later.";
          } else {
            errorMessage = errorText.substring(0, 100);
          }
        }
      } else if (res.status === 400) {
        errorMessage = "Invalid request. Please check your selection.";
      } else if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "You can only share meals with family members.";
      } else if (res.status === 404) {
        errorMessage = "Meal or family member not found.";
      } else if (res.status === 409) {
        errorMessage = "You already have a pending request for this meal with this member.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }

      console.error('[mealShareService] Error response:', { status: res.status, errorMessage, errorText });
      throw new Error(errorMessage);
    }

    const result = await res.json();
    console.log('[mealShareService] Success response:', result);
    return result;
  } catch (error: any) {
    console.error('[mealShareService] Exception:', error);
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Get meal share requests received from others
 */
export async function getReceivedRequests(
  query: ShareRequestsQuery = {}
): Promise<MealShareRequest[]> {
  const headers = await getAuthHeader();

  try {
    const params = new URLSearchParams();
    if (query.status) params.append("status", query.status);
    if (query.skip !== undefined) params.append("skip", query.skip.toString());
    if (query.limit !== undefined) params.append("limit", query.limit.toString());

    const url = `${API_URL}/meal-share-requests/received${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch received requests";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }

      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Get meal share requests sent to others
 */
export async function getSentRequests(
  query: ShareRequestsQuery = {}
): Promise<MealShareRequest[]> {
  const headers = await getAuthHeader();

  try {
    const params = new URLSearchParams();
    if (query.status) params.append("status", query.status);
    if (query.skip !== undefined) params.append("skip", query.skip.toString());
    if (query.limit !== undefined) params.append("limit", query.limit.toString());

    const url = `${API_URL}/meal-share-requests/sent${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch sent requests";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }

      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Accept a meal share request
 */
export async function acceptShareRequest(requestId: number): Promise<MealShareRequest> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/meal-share-requests/${requestId}/accept`, {
      method: "POST",
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to accept share request";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "You can only accept requests sent to you.";
      } else if (res.status === 404) {
        errorMessage = "Share request not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }

      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Decline a meal share request
 */
export async function declineShareRequest(requestId: number): Promise<MealShareRequest> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/meal-share-requests/${requestId}/decline`, {
      method: "POST",
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to decline share request";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "You can only decline requests sent to you.";
      } else if (res.status === 404) {
        errorMessage = "Share request not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }

      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Cancel a sent share request (only if pending)
 */
export async function cancelShareRequest(requestId: number): Promise<void> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/meal-share-requests/${requestId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to cancel share request";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "You can only cancel requests you sent, and only if they're still pending.";
      } else if (res.status === 404) {
        errorMessage = "Share request not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }

      throw new Error(errorMessage);
    }
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Get a specific share request by ID
 */
export async function getShareRequest(requestId: number): Promise<MealShareRequest> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/meal-share-requests/${requestId}`, {
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch share request";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "You don't have permission to view this request.";
      } else if (res.status === 404) {
        errorMessage = "Share request not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }

      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

// ============================================
// EXPORT ALL
// ============================================

export const mealShareService = {
  sendMealShareRequest,
  getReceivedRequests,
  getSentRequests,
  acceptShareRequest,
  declineShareRequest,
  cancelShareRequest,
  getShareRequest,
};

export default mealShareService;
