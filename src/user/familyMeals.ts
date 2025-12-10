// API service for fetching family member meals (owner-only access)
import { BASE_URL as API_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";

type HttpError = Error & { status?: number };

const buildError = (message: string, status?: number): HttpError => {
  const err = new Error(message) as HttpError;
  err.status = status;
  return err;
};

async function getAuthHeader() {
  const token = await Storage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Fetch all meals for a specific family member (owner-only endpoint)
 * @param familyId - The ID of the family
 * @param userId - The ID of the family member whose meals to fetch
 * @returns Array of meal objects
 */
export async function getMemberMeals(
  familyId: number,
  userId: number
): Promise<any[]> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(
      `${API_URL}/families/${familyId}/members/${userId}/meals`,
      {
        method: "GET",
        headers,
      }
    );

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch member meals";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 403) {
        errorMessage = "Only family owners can view member meals.";
      } else if (res.status === 404) {
        errorMessage = "Member not found in this family.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (errorText) {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText.substring(0, 100);
        }
      }

      throw buildError(errorMessage, res.status);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    if (error?.status) {
      throw error;
    }
    if (error.message?.toLowerCase().includes("fetch")) {
      throw buildError("Network error. Please check your internet connection.");
    }
    throw error;
  }
}
