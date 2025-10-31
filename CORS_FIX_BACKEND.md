# CORS Fix Required on Backend

## 🔴 Current Issue

Your Vercel deployment is failing with:
```
Preflight response is not successful. Status code: 400
Fetch API cannot load https://freshlybackend.duckdns.org/auth/me due to access control checks.
```

## 📋 Root Cause

Your backend at `https://freshlybackend.duckdns.org` is **rejecting CORS preflight requests** with a 400 error instead of returning 200 with proper CORS headers.

### What's Happening:

1. **Browser sends OPTIONS request** (CORS preflight):
   ```
   OPTIONS https://freshlybackend.duckdns.org/auth/me
   Origin: https://your-app.vercel.app
   Access-Control-Request-Method: GET
   Access-Control-Request-Headers: authorization, content-type
   ```

2. **Backend returns 400** ❌ (should be 200):
   ```
   HTTP 400 Bad Request
   ```

3. **Browser blocks the actual request** because preflight failed.

## ✅ Solution: Fix Backend CORS Configuration

### For FastAPI (Python) Backend

Update your backend's CORS middleware configuration:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ✅ CORS Configuration - Add this BEFORE your routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-vercel-app.vercel.app",  # ✅ Add your Vercel domain
        "https://*.vercel.app",                 # ✅ Allow all preview deployments
        "http://localhost:3000",                # For local web dev
        "http://localhost:8081",                # For Expo dev server
        "http://127.0.0.1:8000",                # For local testing
    ],
    allow_credentials=True,
    allow_methods=["*"],                        # ✅ Allow all HTTP methods
    allow_headers=["*"],                        # ✅ Allow all headers including Authorization
    expose_headers=["*"],
)

# ✅ Explicitly handle OPTIONS requests (if not already handled)
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return {"status": "ok"}

# Your routes here...
@app.get("/auth/me")
async def get_current_user():
    # ...
    pass
```

### For Express.js (Node) Backend

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// ✅ CORS Configuration
app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app',
    'https://*.vercel.app',
    'http://localhost:3000',
    'http://localhost:8081',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
}));

// ✅ Explicitly handle OPTIONS
app.options('*', cors());

// Your routes here...
app.get('/auth/me', (req, res) => {
  // ...
});
```

### For Django Backend

```python
# settings.py

INSTALLED_APPS = [
    # ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ✅ Add this FIRST
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]

# ✅ CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "https://your-vercel-app.vercel.app",
    "http://localhost:3000",
    "http://localhost:8081",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ['*']
CORS_ALLOW_METHODS = ['*']
```

## 🔍 How to Find Your Vercel Domain

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your project
3. Copy the domain (e.g., `freshly-app-frontend.vercel.app`)
4. Add it to your backend's CORS configuration

## 🧪 Testing the Fix

### 1. Test Locally First

Start your backend with the updated CORS configuration, then test with curl:

```bash
# Test OPTIONS request
curl -X OPTIONS https://freshlybackend.duckdns.org/auth/me \
  -H "Origin: https://your-vercel-app.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -v

# Should return:
# HTTP 200 OK
# Access-Control-Allow-Origin: https://your-vercel-app.vercel.app
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: authorization, content-type
```

### 2. Test from Browser Console

Once deployed, open your Vercel app and test in browser console:

```javascript
fetch('https://freshlybackend.duckdns.org/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json',
  },
  credentials: 'include',
})
.then(res => res.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

## 🚨 Common Mistakes

### ❌ Wrong: Allowing only specific origin without wildcards
```python
allow_origins=["https://freshlybackend.duckdns.org"]  # Wrong!
```

### ✅ Right: Allow your frontend domain
```python
allow_origins=[
    "https://your-vercel-app.vercel.app",  # Your actual Vercel domain
    "https://*.vercel.app",                 # Preview deployments
]
```

### ❌ Wrong: Not allowing credentials
```python
allow_credentials=False  # Wrong if you use Authorization headers!
```

### ✅ Right: Allow credentials for auth
```python
allow_credentials=True
```

### ❌ Wrong: Not handling OPTIONS method
Your backend must respond to OPTIONS requests with 200, not 400.

### ✅ Right: Explicit OPTIONS handler
```python
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return {"status": "ok"}
```

## 📊 Before & After

### Before (Current - Broken)
```
Browser → OPTIONS /auth/me → Backend returns 400 ❌
Browser → ❌ Request blocked, shows CORS error
```

### After (Fixed)
```
Browser → OPTIONS /auth/me → Backend returns 200 ✅
Browser → GET /auth/me with Authorization → Backend returns data ✅
```

## 🔧 Alternative: Use a CORS Proxy (Temporary)

**For testing only**, you can use a CORS proxy:

Update `src/env/baseUrl.ts`:
```typescript
// TEMPORARY - Only for testing CORS issues
export const BASE_URL = Platform.OS === 'web' 
  ? 'https://cors-anywhere.herokuapp.com/https://freshlybackend.duckdns.org'
  : 'https://freshlybackend.duckdns.org';
```

**⚠️ WARNING**: This is NOT secure for production. Fix your backend CORS instead.

## 📝 Checklist

Backend changes needed:

- [ ] Add CORS middleware with your Vercel domain
- [ ] Set `allow_credentials=True`
- [ ] Set `allow_methods=["*"]` or at least `["GET", "POST", "PUT", "DELETE", "OPTIONS"]`
- [ ] Set `allow_headers=["*"]` or at least `["Authorization", "Content-Type"]`
- [ ] Add explicit OPTIONS handler
- [ ] Deploy backend changes
- [ ] Test OPTIONS request returns 200
- [ ] Test actual API request works from Vercel

## 🎯 Expected Result

After fixing backend CORS:

✅ OPTIONS requests return 200 with CORS headers
✅ Browser allows actual requests
✅ Frontend can authenticate and fetch data
✅ No CORS errors in console

## 📚 Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
- [Express CORS](https://expressjs.com/en/resources/middleware/cors.html)

## 💡 Need Help?

If you're still stuck:

1. Share your backend framework (FastAPI, Express, Django, etc.)
2. Share your current CORS configuration
3. Share the full backend error logs
4. Share your Vercel domain URL

The backend needs to be fixed before the frontend will work on Vercel!
