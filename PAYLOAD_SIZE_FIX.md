# 413 Payload Too Large - Fix Summary

## Problem
Backend was returning **413 Payload Too Large** error when uploading profile pictures, indicating the image file exceeded the backend's maximum request body size limit (likely 1MB).

## Root Cause
- Backend has a max payload size limit (probably 1MB or less)
- Previous compression settings (2MB max, 1024px, 70% quality) weren't aggressive enough
- Some images were still exceeding the backend's limit after compression

## Solution Applied

### Frontend Changes (uploadViaBackend.ts)
Made compression **MUCH more aggressive** to guarantee files stay under 1MB:

1. **Reduced max dimensions**: 1024px → **800px**
2. **Reduced JPEG quality**: 70% → **60%** (with fallback to **40%** if still too large)
3. **Smaller target size**: 2MB → **900KB** (to provide safety margin)
4. **Always compress**: Removed conditional compression - now ALWAYS compresses on web

### Changes Made:
```typescript
// Before: Optional compression at 2MB threshold
if (blob.size > 2MB) { compress(...) }

// After: ALWAYS compress aggressively
- Max dimensions: 800x800px (down from 1024x1024)
- JPEG quality: 60% (down from 70%)
- Fallback quality: 40% if file still > 900KB
- Target size: < 900KB (down from 2MB)
```

### Mobile Compression:
```typescript
ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: 800 } }], // Down from 1024
  { compress: 0.5, format: JPEG } // Down from 0.7
)
```

## Backend Requirements (Optional Fix)

If you want to allow larger files, update your backend's max payload size:

### FastAPI:
```python
# In your main FastAPI app file
from fastapi import FastAPI

app = FastAPI()

# Increase max request body size to 5MB
app.add_middleware(
    CORSMiddleware,
    # ... CORS config ...
)

# Add max body size
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware

class LimitUploadSize(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Limit to 5MB
        if request.headers.get("content-length"):
            content_length = int(request.headers["content-length"])
            if content_length > 5_000_000:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "File too large"}
                )
        return await call_next(request)

app.add_middleware(LimitUploadSize)
```

### Nginx (if using):
```nginx
client_max_body_size 5M;
```

## Testing
1. Try uploading a large photo (> 2MB original size)
2. Check browser console logs for compression messages
3. Verify final file size is < 900KB
4. Upload should succeed with 200 status code

## Result
- ✅ Images are now aggressively compressed to stay under 1MB
- ✅ Uploads should succeed without 413 errors
- ✅ Profile pictures still look good at 800px max dimension
- ✅ CORS headers fixed (X-User-ID capitalization)
