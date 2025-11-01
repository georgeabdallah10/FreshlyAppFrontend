# Backend CORS Configuration Fix Required

## Issue
Profile picture upload fails with CORS preflight error:
```
Preflight response is not successful. Status code: 400
```

## Root Cause
The frontend sends a custom header `x-user-id` which triggers a CORS preflight check (OPTIONS request). The backend is not configured to allow this custom header in CORS.

## Solution

### For FastAPI (Python)
Add `x-user-id` to the allowed headers in CORS middleware:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://freshly-app-frontend.vercel.app",
        "http://localhost:3000",
        "http://localhost:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "x-user-id", "Authorization", "Content-Type"],  # ← Add x-user-id
    expose_headers=["*"],
)
```

### For Express.js (Node.js)
```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://freshly-app-frontend.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'], // ← Add x-user-id
}));
```

### For Django
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://freshly-app-frontend.vercel.app",
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-user-id',  # ← Add this
]
```

## Testing
After implementing this fix:
1. Deploy the backend changes
2. Test profile picture upload from https://freshly-app-frontend.vercel.app
3. Check browser console - the CORS error should be gone
4. Upload should succeed with status 200

## Endpoint Affected
`POST /storage/avatar/proxy`

## Current Behavior
- Returns 400 on OPTIONS preflight request
- Browser blocks the actual POST request

## Expected Behavior
- Returns 200/204 on OPTIONS request
- Actual POST request proceeds successfully
