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

export interface MealShareMacros {
  protein?: number;
  fats?: number;
  carbs?: number;
  calories?: number;
}

export interface MealShareMealDetail {
  id: number;
  name: string;
  description?: string;
  image?: string;
  calories?: number;
  mealType?: string;
  cuisine?: string;
  macros?: MealShareMacros;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
}

export interface BasicUserSummary {
  id: number;
  name?: string;
  full_name?: string;
  display_name?: string;
  email?: string;
  avatar_path?: string;
}

export interface MealShareRequest {
  id: number;
  mealId: number;
  senderId: number;
  recipientId: number;
  status: ShareRequestStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
  mealDetail?: MealShareMealDetail;
  acceptedMealDetail?: MealShareMealDetail;
  sender?: BasicUserSummary;
  recipient?: BasicUserSummary;
}

export interface SendShareRequestInput {
  mealId: number;
  recipientUserId: number;
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

function normalizeUser(user?: any): BasicUserSummary | undefined {
  if (!user || typeof user !== 'object') {
    return undefined;
  }

  const id = user.id ?? user.user_id ?? user.userId;
  if (!id) {
    return undefined;
  }

  return {
    id,
    name: user.name ?? user.full_name ?? user.display_name ?? user.username,
    full_name: user.full_name,
    display_name: user.display_name,
    email: user.email,
    avatar_path: user.avatar_path ?? user.avatarUrl,
  };
}

function normalizeMeal(detail?: any): MealShareMealDetail | undefined {
  if (!detail || typeof detail !== 'object') {
    return undefined;
  }

  const id = detail.id ?? detail.meal_id ?? detail.mealId;
  if (!id) {
    return undefined;
  }

  return {
    id,
    name: detail.name ?? 'Meal',
    description: detail.description,
    image: detail.image ?? detail.image_url ?? detail.coverImage,
    calories: detail.calories ?? detail.macros?.calories,
    mealType: detail.mealType ?? detail.meal_type,
    cuisine: detail.cuisine,
    macros: detail.macros ?? {
      protein: detail.protein,
      fats: detail.fats,
      carbs: detail.carbs,
      calories: detail.calories,
    },
    prepTime: detail.prepTime ?? detail.prep_time,
    cookTime: detail.cookTime ?? detail.cook_time,
    totalTime: detail.totalTime ?? detail.total_time,
  };
}

function transformRequest(payload: any): MealShareRequest {
  return {
    id: payload.id ?? payload.requestId ?? 0,
    mealId: payload.mealId ?? payload.meal_id ?? payload.mealDetail?.id ?? payload.meal?.id ?? 0,
    senderId: payload.senderId ?? payload.sender_id ?? payload.requester_id ?? 0,
    recipientId: payload.recipientId ?? payload.receiver_id ?? payload.recipient_id ?? 0,
    status: payload.status,
    message: payload.message,
    createdAt: payload.createdAt ?? payload.created_at,
    updatedAt: payload.updatedAt ?? payload.updated_at,
    mealDetail: normalizeMeal(payload.mealDetail ?? payload.meal),
    acceptedMealDetail: normalizeMeal(payload.acceptedMealDetail ?? payload.acceptedMeal ?? payload.accepted_meal),
    sender: normalizeUser(payload.sender ?? payload.senderUser ?? payload.requester),
    recipient: normalizeUser(payload.recipient ?? payload.receiver ?? payload.recipientUser),
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
    const res = await fetch(`${API_URL}/meal-share-requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to send meal share request";

      if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 120);
        }
      } else if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 404) {
        errorMessage = "Meal or user not found.";
      } else if (res.status === 409) {
        errorMessage = "You already have a pending request for this meal and recipient.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }

      console.log(errorMessage);
    }

    const result = await res.json();
    return transformRequest(result);
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      console.log("Network error. Please check your internet connection.");
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
          errorMessage = errorText.substring(0, 120);
        }
      }

      console.log(errorMessage);
    }

    const data = await res.json();
    return Array.isArray(data) ? data.map(transformRequest) : [];
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      console.log("Network error. Please check your internet connection.");
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

      console.log(errorMessage);
    }

    const data = await res.json();
    return Array.isArray(data) ? data.map(transformRequest) : [];
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      console.log("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Get pending requests for the current user (received + awaiting action)
 */
export async function getPendingRequests(): Promise<MealShareRequest[]> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/meal-share-requests/pending`, {
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch pending requests";

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
          errorMessage = errorText.substring(0, 120);
        }
      }

      console.log(errorMessage);
    }

    const data = await res.json();
    return Array.isArray(data) ? data.map(transformRequest) : [];
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      console.log("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Accept a meal share request
 */
async function respondToShareRequest(
  requestId: number,
  action: 'accept' | 'decline'
): Promise<MealShareRequest> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/meal-share-requests/${requestId}/respond`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = `Failed to ${action} share request`;

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "You don't have permission to respond to this request.";
      } else if (res.status === 404) {
        errorMessage = "Share request not found.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 120);
        }
      }

      console.log(errorMessage);
    }

    const data = await res.json();
    return transformRequest(data);
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      console.log("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

export async function acceptShareRequest(requestId: number): Promise<MealShareRequest> {
  return respondToShareRequest(requestId, 'accept');
}

export async function declineShareRequest(requestId: number): Promise<MealShareRequest> {
  return respondToShareRequest(requestId, 'decline');
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

      console.log(errorMessage);
    }
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      console.log("Network error. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Get meals that were cloned from accepted requests
 */
export async function getAcceptedMeals(): Promise<MealShareMealDetail[]> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/meal-share-requests/accepted-meals`, {
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch accepted meals";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 120);
        }
      }

      console.log(errorMessage);
    }

    const data = await res.json();
    const normalized = Array.isArray(data)
      ? data
          .map(normalizeMeal)
          .filter((meal): meal is MealShareMealDetail => Boolean(meal))
      : [];
    return normalized;
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      console.log("Network error. Please check your internet connection.");
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

      console.log(errorMessage);
    }

    const data = await res.json();
    return transformRequest(data);
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("fetch")) {
      console.log("Network error. Please check your internet connection.");
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
  getPendingRequests,
  acceptShareRequest,
  declineShareRequest,
  cancelShareRequest,
  getShareRequest,
  getAcceptedMeals,
};

export default mealShareService;
