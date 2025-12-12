/**
 * ============================================
 * NOTIFICATION API SERVICE
 * ============================================
 * Single source of truth for notification API calls.
 * - Attaches JWT auth automatically (secureTokenStore)
 * - Forces no-store/no-cache to prevent stale notification UI
 * - Returns strongly-typed, backend-aligned models (camelCase)
 */

import { BASE_URL as API_URL } from "../env/baseUrl";
import secureTokenStore from "../utils/secureTokenStore"; // adjust path if needed

// ============================================
// TYPES (MATCH BACKEND)
// ============================================

export type NotificationType =
  | "meal_share_request"
  | "meal_share_accepted"
  | "meal_share_declined"
  | "family_member_joined"
  | "family_invite"
  | "system";

export interface NotificationOut {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;

  relatedMealId: number | null;
  relatedUserId: number | null;
  relatedFamilyId: number | null;
  relatedShareRequestId: number | null;

  isRead: boolean;
  createdAt: string;
  readAt: string | null;

  relatedUserName: string | null;
  relatedMealName: string | null;
  relatedFamilyName: string | null;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  unreadByType: Record<string, number>;
}

export interface NotificationsQuery {
  unreadOnly?: boolean;
  type?: NotificationType;
  skip?: number;
  limit?: number;
}

// ============================================
// HELPERS
// ============================================

async function buildHeaders(extra?: Record<string, string>) {
  const token = await secureTokenStore.getAccessToken();
  if (!token) console.log("Missing access token. Please log in again.");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    ...(extra ?? {}),
  };
}

async function parseJsonSafe(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildErrorMessage(status: number, data: any, fallback: string) {
  if (status === 401) return "Session expired. Please log in again.";
  if (status === 429) return "Too many requests. Please wait before trying again.";
  if (status === 404) return "Not found.";
  if (status >= 500) return "Server error. Please try again later.";

  if (data && typeof data === "object") {
    return data.error || data.detail || data.message || fallback;
  }
  if (typeof data === "string" && data.trim()) return data.slice(0, 120);

  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await buildHeaders(init?.headers as Record<string, string> | undefined);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (e: any) {
    console.log("Network error. Please check your internet connection.");
    throw new Error("Network error. Please check your internet connection.");
  }
  console.log(res)

  // 204 No Content (delete endpoints)
  if (res.status === 204) return undefined as T;

  const data = await parseJsonSafe(res);
  console.log(data)

  if (!res.ok) {
    console.log("ERROR< IDK LINE !@&")
    console.log(buildErrorMessage(res.status, data, "Request failed"));
  }

  return data as T;
}

function toQuery(params: Record<string, any>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// ============================================
// API METHODS (MATCH BACKEND ENDPOINTS)
// ============================================

export async function getNotifications(query: NotificationsQuery = {}) {
  return request<NotificationOut[]>(
    `/notifications${toQuery({
      unreadOnly: query.unreadOnly ?? false,
      type: query.type,
      skip: query.skip ?? 0,
      limit: query.limit ?? 50,
    })}`
  );
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const raw = await request<any>(`/notifications/unread-count`);

  // Be resilient if backend returns weird schema sometimes
  if (typeof raw?.count === "number") return { count: raw.count };
  if (typeof raw === "number") return { count: raw };
  return { count: 0 };
}

export async function getNotificationStats(): Promise<NotificationStats> {
  return request<NotificationStats>(`/notifications/stats`);
}

export async function getNotification(notificationId: number): Promise<NotificationOut> {
  return request<NotificationOut>(`/notifications/${notificationId}`);
}

export async function markNotificationAsRead(notificationId: number): Promise<NotificationOut> {
  return request<NotificationOut>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markNotificationAsUnread(notificationId: number): Promise<NotificationOut> {
  return request<NotificationOut>(`/notifications/${notificationId}/unread`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<{ message: string; count: number }> {
  return request<{ message: string; count: number }>(`/notifications/mark-all-read`, {
    method: "POST",
  });
}

export async function deleteNotification(notificationId: number): Promise<void> {
  return request<void>(`/notifications/${notificationId}`, {
    method: "DELETE",
  });
}

export async function deleteAllReadNotifications(): Promise<{ message: string; count: number }> {
  return request<{ message: string; count: number }>(`/notifications/read/all`, {
    method: "DELETE",
  });
}

export async function deleteAllNotifications(): Promise<{ message: string; count: number }> {
  return request<{ message: string; count: number }>(`/notifications/all`, {
    method: "DELETE",
  });
}

// ============================================
// EXPORT
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