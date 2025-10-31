import { BASE_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";

export type PreferenceInput = {
  diet_codes?: string[];
  allergen_ingredient_ids?: number[];
  disliked_ingredient_ids?: number[];
  goal?: string;
  calorie_target?: number;
};

export type RegisterInput = {
  email: string;
  password: string;
  name?: string | null;
  phone_number: string | null;
  preference?: PreferenceInput; // optional — backend will create defaults if omitted
};

export type UserOut = {
  id: number;
  email: string;
  name: string | null;
  phone_number: string | null;
  is_verified: boolean;
  pfp: string;
  status: string;
  preference: {
    id: number;
    user_id: number;
    diet_codes: string[];
    allergen_ingredient_ids: number[];
    disliked_ingredient_ids: number[];
    goal: string | null;
    calorie_target: number | null;
    created_at: string;
    updated_at: string;
  };
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export async function registerUser(
  input: RegisterInput
): Promise<ApiResult<UserOut>> {
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const json = await res.json().catch(() => ({}));
    console.log("[REGISTER] Payload:", input);
    console.log("[REGISTER] Password length:", input.password.length);
    if (!res.ok) {
      const message =
        (json && (json.detail || json.message)) ||
        `Request failed with status ${res.status}`;
      return { ok: false, status: res.status, message };
    }
    console.log("Registering with:", json as UserOut);
    return { ok: true, data: json as UserOut };
  } catch (err: any) {
    return {
      ok: false,
      status: -1,
      message: err?.message || "Network Error",
    };
  }
}

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string; // usually "bearer"
  user?: {
    id: number;
    email: string;
    name: string | null;
    // if your /auth/login returns the embedded preference, include it here:
    preference?: any;
  };
};

export async function loginUser(
  input: LoginInput
): Promise<ApiResult<LoginResponse>> {
  try {
    console.log('[LOGIN] Attempting login to:', `${BASE_URL}/auth/login`);
    console.log('[LOGIN] Request payload:', { email: input.email, password: '***' });
    
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(input),
    });

    console.log('[LOGIN] Response status:', res.status);
    console.log('[LOGIN] Response headers:', Object.fromEntries(res.headers.entries()));

    const json = await res.json().catch((e) => {
      console.error('[LOGIN] Failed to parse JSON response:', e);
      return {};
    });
    
    console.log('[LOGIN] Response body:', json);

    if (!res.ok) {
      const message =
        (json && (json.detail || json.message)) ||
        `Request failed with status ${res.status}`;
      console.error('[LOGIN] Login failed:', message);
      return { ok: false, status: res.status, message };
    }
    
    console.log('[LOGIN] Login successful');
    return { ok: true, data: json as LoginResponse };
  } catch (err: any) {
    console.error('[LOGIN] Network error:', err);
    return { ok: false, status: -1, message: err?.message || "Network Error" };
  }
}

export async function getCurrentUser() {
  const token = await Storage.getItem("access_token");

  try {
    console.log('[GET_USER] Fetching current user from:', `${BASE_URL}/auth/me`);
    console.log('[GET_USER] Has token:', !!token);
    
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[GET_USER] Response status:', res.status);
    
    const json = await res.json().catch(() => ({}));
    console.log('[GET_USER] Response body:', json);
    
    if (!res.ok) {
      const message =
        (json && (json.detail || json.message)) ||
        `Request failed with status ${res.status}`;
      console.error('[GET_USER] Failed:', message);
      return { ok: false, status: res.status, message };
    }
    
    console.log('[GET_USER] Success');
    return { ok: true, data: json };
  } catch (err: any) {
    console.error('[GET_USER] Network error:', err);
    return { ok: false, status: -1, message: err?.message || "Network Error" };
  }
}

type User = {
  id?: number;
  name?: string;
  email?: string;
  phone_number?: string;
  avatar?: string;
  status?: string;
};

export const updateUserInfo = async (
  patch: Partial<{
    name: string;
    email: string;
    phone_number: string;
    location: string;
    avatar_path: string;
    status: string;
  }>
): Promise<User> => {
  const token = await Storage.getItem("access_token");
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (json && (json.detail || json.message)) ||
      `Failed to update profile (${res.status})`;
    throw new Error(msg);
  }

  // json should be the updated user
  return json as User;
};

export async function deleteAccount() {
  const token = await Storage.getItem("access_token");
  const res = await fetch(`${BASE_URL}/me`, {
    method: "DELETE",
    headers: {
      "Content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json().catch(() => {});
  if (!res.ok) {
    return `ERROR, ${json}`;
  }
  return json;
}

export async function sendVerificationCode(
  email: string
): Promise<ApiResult<{ message: string }>> {
  try {
    const res = await fetch(`${BASE_URL}/auth/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        json?.detail || json?.message || `Failed to send code (${res.status})`;
      return { ok: false, status: res.status, message };
    }

    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, status: -1, message: err?.message || "Network error" };
  }
}

export type VerifyCodeInput = {
  email: string;
  code: string; // keep as string to preserve leading zeros
};

export async function verifyCode(
  input: VerifyCodeInput
): Promise<ApiResult<{ message: string; is_verified?: boolean }>> {
  try {
    const res = await fetch(`${BASE_URL}/auth/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, code: input.code }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        json?.detail || json?.message || `Verification failed (${res.status})`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, status: -1, message: err?.message || "Network error" };
  }
}

export async function resendCode(
  email: string
): Promise<ApiResult<{ message: string }>> {
  try {
    const res = await fetch(
      `${BASE_URL}/auth/send-code?email=${encodeURIComponent(email)}`,
      {
        method: "POST",
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        json?.detail || json?.message || `Failed to resend (${res.status})`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, status: -1, message: err?.message || "Network error" };
  }
}
export async function requestPasswordReset(
  email: string
): Promise<ApiResult<{ message: string }>> {
  try {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json?.detail || json?.message || `Failed (${res.status})`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: json };
  } catch (e: any) {
    return { ok: false, status: -1, message: e?.message || "Network error" };
  }
}

export async function verifyPasswordResetCode(
  email: string,
  code: string
): Promise<ApiResult<{ reset_token: string }>> {
  try {
    const res = await fetch(`${BASE_URL}/auth/forgot-password/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json?.detail || json?.message || `Failed (${res.status})`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: json };
  } catch (e: any) {
    return { ok: false, status: -1, message: e?.message || "Network error" };
  }
}

export async function resetPassword(
  reset_token: string,
  new_password: string
): Promise<ApiResult<{ message: string }>> {
  try {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset_token, new_password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json?.detail || json?.message || `Failed (${res.status})`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: json };
  } catch (e: any) {
    return { ok: false, status: -1, message: e?.message || "Network error" };
  }
}
