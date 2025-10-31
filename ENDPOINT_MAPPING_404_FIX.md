# Backend Endpoint Mapping - 404 Errors Fix

## 🔴 Current Issue

Getting 404 errors for these endpoints:
```
❌ /auth/me - 404 Not Found
❌ /auth/register - 404 Not Found  
❌ /preferences/me - 404 Not Found
```

## 📋 Frontend Endpoint Expectations

Your frontend is calling these endpoints (from `src/auth/auth.ts` and other files):

### Authentication Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user info
- `POST /auth/send-code` - Send verification code
- `POST /auth/verify-code` - Verify email code
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/forgot-password/verify` - Verify reset code
- `POST /auth/reset-password` - Reset password with token

### User Endpoints
- `GET /auth/me` - Get current user (duplicate?)
- `PATCH /users/me` - Update user info
- `DELETE /me` - Delete account

### Preferences Endpoints
- `GET /preferences/me` - Get user preferences
- `PATCH /preferences/me` - Update user preferences

### Pantry Endpoints
- `GET /pantry-items/me` - Get user's pantry items
- `POST /pantry-items/me` - Add pantry item

### Meals Endpoints
- `GET /meals/me` - Get user's meals
- `POST /meals/me` - Create meal
- `PATCH /meals/me/{mealId}` - Update meal
- `DELETE /meals/me/{mealId}` - Delete meal

## 🔍 Common Backend Path Patterns

Your backend might use different patterns. Check which one applies:

### Option 1: `/users/me` instead of `/auth/me`
If your backend uses `/users/me` for the current user endpoint:

```python
# Backend has:
@app.get("/users/me")
async def get_current_user():
    # ...

# But frontend expects:
GET /auth/me
```

### Option 2: Different auth structure
```python
# Backend might have:
@app.post("/register")  # No /auth prefix
@app.post("/login")
@app.get("/me")
```

### Option 3: `/api` prefix
```python
# Backend might have:
@app.post("/api/auth/register")
@app.post("/api/auth/login")
@app.get("/api/auth/me")
```

## ✅ Solutions

### Solution 1: Update Frontend Endpoints (Recommended)

If your backend uses `/users/me` instead of `/auth/me`, update the frontend:

**File: `src/auth/auth.ts`**

```typescript
export async function getCurrentUser() {
  const token = await Storage.getItem("access_token");

  try {
    // Change from /auth/me to /users/me
    const res = await fetch(`${BASE_URL}/users/me`, {  // ← Changed
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    // ... rest of the code
  }
}
```

### Solution 2: Add `/api` Prefix to BASE_URL

If your backend has all endpoints under `/api`:

**File: `src/env/baseUrl.ts`**

```typescript
import { Platform } from 'react-native';

export const BASE_URL = (() => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return 'https://freshlybackend.duckdns.org/api';  // ← Added /api
    }
    return 'http://127.0.0.1:8000/api';  // ← Added /api
  }
  return 'https://freshlybackend.duckdns.org/api';  // ← Added /api
})();
```

### Solution 3: Update Backend Endpoints (Alternative)

Add these endpoints to your FastAPI backend to match frontend expectations:

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

app = FastAPI()
security = HTTPBearer()

# ✅ Match frontend expectation: GET /auth/me
@app.get("/auth/me")
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Your logic to get user from token
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

# ✅ Match frontend expectation: POST /auth/register
@app.post("/auth/register")
async def register_user(email: str, password: str, name: str = None, phone_number: str = None):
    # Your registration logic
    user = create_user(email, password, name, phone_number)
    return user

# ✅ Match frontend expectation: POST /auth/login
@app.post("/auth/login")
async def login_user(email: str, password: str):
    # Your login logic
    token = authenticate(email, password)
    return {"access_token": token, "token_type": "bearer"}

# ✅ Match frontend expectation: GET /preferences/me
@app.get("/preferences/me")
async def get_user_preferences(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user = get_user_from_token(token)
    preferences = get_preferences(user.id)
    return preferences
```

## 🧪 How to Find Your Backend Endpoints

### Method 1: Check Backend Code
Look for route decorators:
```python
# FastAPI
@app.get("/...")
@app.post("/...")

# Express
app.get('/...', ...)
app.post('/...', ...)
```

### Method 2: Use API Documentation
If your backend has Swagger/OpenAPI docs:
```
Visit: https://freshlybackend.duckdns.org/docs
```

### Method 3: Test with curl
```bash
# Test if /users/me works instead of /auth/me
curl -X GET https://freshlybackend.duckdns.org/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# If 404, try:
curl -X GET https://freshlybackend.duckdns.org/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or with /api prefix:
curl -X GET https://freshlybackend.duckdns.org/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Method 4: Check Backend Logs
When you get a 404, your backend logs should show:
```
404 GET /auth/me - Not Found
```

This tells you the backend received the request but doesn't have that endpoint.

## 📊 Endpoint Mapping Quick Reference

| Frontend Expects | Backend Might Have | Fix |
|------------------|-------------------|-----|
| `/auth/me` | `/users/me` | Change frontend |
| `/auth/me` | `/me` | Change frontend |
| `/auth/register` | `/register` | Change frontend |
| `/auth/login` | `/login` | Change frontend |
| `/preferences/me` | `/users/preferences` | Change frontend |
| All endpoints | `/api/...` prefix | Add `/api` to BASE_URL |

## 🔍 Debug Steps

1. **Check Backend API Documentation**
   ```
   Visit: https://freshlybackend.duckdns.org/docs
   ```

2. **Test One Endpoint**
   ```bash
   # Try different variations
   curl https://freshlybackend.duckdns.org/auth/me
   curl https://freshlybackend.duckdns.org/users/me
   curl https://freshlybackend.duckdns.org/me
   curl https://freshlybackend.duckdns.org/api/auth/me
   ```

3. **Check Browser Console**
   - Open Vercel app
   - Open DevTools → Console
   - Look for `[GET_USER]` logs showing the full URL

4. **Update Frontend Accordingly**

## 💡 Recommended Approach

1. **Find the correct backend endpoints** (use Swagger docs or backend code)
2. **Document all endpoints** in a file like `BACKEND_ENDPOINTS.md`
3. **Update frontend** to match backend paths
4. **Test each endpoint** individually
5. **Deploy** and verify

## 📝 Next Steps

Please share:
1. Your backend framework (FastAPI, Express, etc.)
2. The actual endpoint paths your backend uses
3. A link to your API documentation (if available)
4. Or paste the relevant route definitions from your backend code

Then I can update the frontend endpoints to match exactly!
