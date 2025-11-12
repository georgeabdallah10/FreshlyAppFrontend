import { apiClient } from "../client/apiClient";
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

export type OAuthSignupResponse = {
  access_token: string;
  token_type: string;
  user: UserOut;
};

export type OAuthProvider = 'google' | 'apple';

export async function signupWithOAuth(accessToken: string, provider: OAuthProvider): Promise<ApiResult<OAuthSignupResponse>> {
  try {
    const res = await fetch(`${BASE_URL}/auth/signup/oauth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = json?.detail || json?.message || `Request failed with status ${res.status}`;
      return { ok: false, status: res.status, message };
    }

    return { ok: true, data: json as OAuthSignupResponse };
  } catch (error: any) {
    return { ok: false, status: -1, message: error?.message || 'Network Error' };
  }
}

export async function loginWithOAuth(accessToken: string, provider: OAuthProvider): Promise<ApiResult<OAuthSignupResponse>> {
  try {
    const res = await fetch(`${BASE_URL}/auth/login/oauth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = json?.detail || json?.message || `Request failed with status ${res.status}`;
      return { ok: false, status: res.status, message };
    }

    return { ok: true, data: json as OAuthSignupResponse };
  } catch (error: any) {
    return { ok: false, status: -1, message: error?.message || 'Network Error' };
  }
}

export async function registerUser(
  input: RegisterInput
): Promise<ApiResult<UserOut>> {
  try {
    console.log("[REGISTER] Starting registration request...");
    console.log("[REGISTER] Payload:", { ...input, password: "***" });
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("[REGISTER] Response status:", res.status);

    const json = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      const message =
        (json && (json.detail || json.message)) ||
        `Request failed with status ${res.status}`;
      console.log("[REGISTER] Registration failed:", message);
      return { ok: false, status: res.status, message };
    }
    
    console.log("[REGISTER] Registration successful");
    return { ok: true, data: json as UserOut };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log("ERROR [REGISTER] Request timed out after 30 seconds");
      return {
        ok: false,
        status: -1,
        message: "Request timed out. Please check your internet connection and try again.",
      };
    }
    console.log("ERROR [REGISTER] Network error:", err?.message || err);
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
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('[LOGIN] Response status:', res.status);

    const json = await res.json().catch((e) => {
      console.log('ERROR [LOGIN] Failed to parse JSON response:', e);
      return {};
    });
    
    console.log('[LOGIN] Response body:', json);

    if (!res.ok) {
      const message =
        (json && (json.detail || json.message)) ||
        `Request failed with status ${res.status}`;
      console.log('[LOGIN] Login failed:', message);
      return { ok: false, status: res.status, message };
    }
    
    console.log('[LOGIN] Login successful');
    return { ok: true, data: json as LoginResponse };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('ERROR [LOGIN] Request timed out after 30 seconds');
      return {
        ok: false,
        status: -1,
        message: "Request timed out. Please check your internet connection and try again.",
      };
    }
    console.log('ERROR [LOGIN] Network error:', err);
    return { ok: false, status: -1, message: err?.message || "Network Error" };
  }
}

export async function getCurrentUser() {
  try {
    // Use apiClient which handles automatic token refresh on 401 errors
    const data = await apiClient.get<UserOut>('/auth/me');
    return { ok: true, data };
  } catch (err: any) {
    // Silently fail for 401 - user just needs to log in (expected behavior)
    if (err?.status === 401) {
      return { 
        ok: false, 
        status: 401, 
        message: "Not authenticated" 
      };
    }
    
    // Silently fail for expected auth errors - these are normal when user is not logged in
    const errorMessage = err?.message || '';
    if (
      errorMessage.includes('Session refresh failed') || 
      errorMessage.includes('Authentication expired') ||
      errorMessage.includes('Auth session missing')
    ) {
      return { 
        ok: false, 
        status: 401, 
        message: "Not authenticated" 
      };
    }
    
    // Only log truly unexpected errors (not auth-related)
    if (err?.status !== 401) {
      console.log('ERROR [GET_USER] Unexpected error:', err?.message || err);
    }
    
    return { 
      ok: false, 
      status: err?.status || -1, 
      message: err?.message || "Network Error" 
    };
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
  try {
    // Use apiClient which handles automatic token refresh
    const user = await apiClient.patch<User>('/users/me', patch);
    return user;
  } catch (error: any) {
    const msg = error?.message || `Failed to update profile`;
    throw new Error(msg);
  }
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
