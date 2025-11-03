# Authentication Token Refresh Fix

## Problem Identified

**Error:**
```
LOG  [GET_USER] Response status: 401
LOG  [GET_USER] Response body: {"error": "Invalid token", "status_code": 401}
ERROR [GET_USER] Failed: Request failed with status 401
```

**Root Cause:**
- `getCurrentUser()` in `src/auth/auth.ts` was using raw `fetch()` instead of `apiClient`
- This bypassed the automatic token refresh logic in `apiClient.ts`
- When the access token expired, it returned 401 without attempting to refresh

## Solution Applied

### 1. Fixed `getCurrentUser()` function
**Before:**
```typescript
export async function getCurrentUser() {
  const token = await Storage.getItem("access_token");
  
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  // ... manual error handling
}
```

**After:**
```typescript
export async function getCurrentUser() {
  try {
    console.log('[GET_USER] Fetching current user with automatic token refresh');
    
    // Use apiClient which handles automatic token refresh on 401 errors
    const data = await apiClient.get<UserOut>('/auth/me');
    
    console.log('[GET_USER] Success');
    return { ok: true, data };
  } catch (err: any) {
    console.error('[GET_USER] Failed:', err);
    return { 
      ok: false, 
      status: err?.status || -1, 
      message: err?.message || "Network Error" 
    };
  }
}
```

### 2. Fixed `updateUserInfo()` function
**Before:**
```typescript
export const updateUserInfo = async (patch: Partial<{...}>): Promise<User> => {
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
  // ... manual error handling
};
```

**After:**
```typescript
export const updateUserInfo = async (patch: Partial<{...}>): Promise<User> => {
  try {
    // Use apiClient which handles automatic token refresh
    const user = await apiClient.patch<User>('/users/me', patch);
    return user;
  } catch (error: any) {
    const msg = error?.message || `Failed to update profile`;
    throw new Error(msg);
  }
};
```

## How Automatic Token Refresh Works

The `apiClient` in `src/client/apiClient.ts` has built-in logic:

1. **Intercepts 401 errors** from the backend
2. **Attempts refresh** using Supabase's `refreshSession()`
3. **Updates tokens** in AsyncStorage
4. **Retries the original request** with the new token
5. **Falls back to error** if refresh fails

```typescript
// From apiClient.ts
if (res.status === 401) {
  console.log("[API_CLIENT] Token expired, attempting refresh...");
  const refreshed = await refreshAccessToken();
  if (refreshed) {
    console.log("[API_CLIENT] Token refreshed, retrying request...");
    // Retry the request with new token
    const newToken = await AsyncStorage.getItem("access_token");
    headers["Authorization"] = `Bearer ${newToken}`;
    res = await fetch(url, { method, headers, body });
  }
}
```

## Benefits

✅ **Automatic token refresh** - No more manual token management  
✅ **Seamless UX** - Users don't get logged out unexpectedly  
✅ **Consistent error handling** - All API calls use same retry logic  
✅ **TypeScript safety** - Generic types for type-safe responses  
✅ **Centralized logging** - Better debugging capabilities

## Other Files Still Using Raw fetch()

The following files still use raw `fetch()` with bearer tokens and should be migrated:

1. `src/user/pantry.ts`
2. `src/user/setPrefrences.ts`
3. `src/user/meals.ts`

These will be updated in a follow-up to ensure consistency across the codebase.

## Testing Recommendations

1. **Test token expiration**: Wait for token to expire naturally (typically 60 minutes)
2. **Test manual expiration**: Delete token from AsyncStorage and trigger API call
3. **Test network errors**: Disable network and verify error handling
4. **Test invalid refresh token**: Clear refresh token to verify logout flow

## Status

✅ **FIXED** - `getCurrentUser()` now uses `apiClient.get()`  
✅ **FIXED** - `updateUserInfo()` now uses `apiClient.patch()`  
✅ **VERIFIED** - 0 TypeScript errors in `auth.ts`  
🔄 **PENDING** - Migration of other files for consistency
