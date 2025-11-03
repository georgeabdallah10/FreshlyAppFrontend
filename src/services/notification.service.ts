/**
 * ============================================
 * NOTIFICATION API SERVICE
 * ============================================
 * Handles all notification-related API calls
 */

import { BASE_URL as API_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";

// ============================================
// TYPES
// ============================================

export type NotificationType = 
  | 'meal_share_request' 
  | 'meal_share_accepted' 
  | 'meal_share_declined'
  | 'system'
  | 'family';

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_id?: number; // Meal share request ID if applicable
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  by_type: Record<NotificationType, number>;
}

export interface NotificationsQuery {
  is_read?: boolean;
  type?: NotificationType;
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
 * Get all notifications for current user
 */
export async function getNotifications(
  query: NotificationsQuery = {}
): Promise<Notification[]> {
  const headers = await getAuthHeader();

  try {
    const params = new URLSearchParams();
    if (query.is_read !== undefined) params.append("is_read", String(query.is_read));
    if (query.type) params.append("type", query.type);
    if (query.skip !== undefined) params.append("skip", query.skip.toString());
    if (query.limit !== undefined) params.append("limit", query.limit.toString());

    const url = `${API_URL}/notifications${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch notifications";

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
 * Get count of unread notifications
 */
export async function getUnreadCount(): Promise<{ count: number }> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/notifications/unread-count`, { headers });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch unread count";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
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
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<NotificationStats> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/notifications/stats`, { headers });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch notification stats";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
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
 * Get a specific notification by ID
 */
export async function getNotification(notificationId: number): Promise<Notification> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/notifications/${notificationId}`, { headers });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to fetch notification";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 404) {
        errorMessage = "Notification not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
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
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<Notification> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
      method: "PATCH",
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to mark notification as read";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 404) {
        errorMessage = "Notification not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
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
 * Mark notification as unread
 */
export async function markNotificationAsUnread(notificationId: number): Promise<Notification> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/notifications/${notificationId}/unread`, {
      method: "PATCH",
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to mark notification as unread";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 404) {
        errorMessage = "Notification not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
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
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<{ count: number }> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/notifications/mark-all-read`, {
      method: "POST",
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to mark all notifications as read";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
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
 * Delete a notification
 */
export async function deleteNotification(notificationId: number): Promise<void> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/notifications/${notificationId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to delete notification";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 404) {
        errorMessage = "Notification not found.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
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
 * Delete all read notifications
 */
export async function deleteAllReadNotifications(): Promise<{ count: number }> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/notifications/read/all`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to delete read notifications";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
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
 * Delete all notifications
 */
export async function deleteAllNotifications(): Promise<{ count: number }> {
  const headers = await getAuthHeader();

  try {
    const res = await fetch(`${API_URL}/notifications/all`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMessage = "Failed to delete all notifications";

      if (res.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (res.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
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

export const notificationService = {
  getNotifications,
  getUnreadCount,
  getNotificationStats,
  getNotification,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllReadNotifications,
  deleteAllNotifications,
};

export default notificationService;
