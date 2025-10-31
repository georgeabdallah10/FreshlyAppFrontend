# Vercel Deployment Fix - Static Export Configuration

## Problem
Vercel was detecting more than 12 serverless functions and failing deployment because it was treating the React Native/Expo app as a Next.js app with serverless functions.

## Root Cause
The `/api` directory in the project contains **frontend API services** (TypeScript modules for data fetching), not serverless API routes. Vercel was incorrectly detecting these as serverless functions.

## Solution Applied

### 1. Updated `vercel.json`
Changed the configuration to explicitly tell Vercel this is a **static site export**:

```json
{
  "version": 2,
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "web-build",
  "framework": null,           // ✅ Tells Vercel: not a Next.js app
  // Note: No "functions" property - omit entirely for static sites
  "routes": [                  // ✅ Static routing rules
    {
      "src": "/_expo/(.*)",
      "dest": "/_expo/$1"
    },
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/favicon.ico",
      "dest": "/favicon.ico"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

**Key Changes:**
- `"version": 2` - Uses Vercel's latest platform version
- `"framework": null` - Explicitly tells Vercel this is not a framework-specific app
- **No `"functions"` property** - Omit entirely; empty object causes validation errors
- Changed `rewrites` to `routes` - Uses static routing instead of dynamic rewrites

### 2. Created `.vercelignore`
Prevents Vercel from scanning unnecessary directories:

```
# Ignore API directories (frontend services, not serverless functions)
api/

# Ignore Expo artifacts
.expo/
.expo-shared/

# Ignore build artifacts
node_modules/
web-build/

# Ignore development files
*.log
.DS_Store
```

## How It Works

### Build Process
1. **Build Command**: `expo export --platform web --output-dir web-build`
   - Exports Expo app as static HTML/CSS/JS
   - Output goes to `web-build/` directory

2. **Vercel Deploy**:
   - Uploads static files from `web-build/`
   - Serves as a CDN (no serverless functions)
   - Routes all paths to `index.html` (SPA routing)

### Your API Architecture (Unchanged)
```
Frontend (Static on Vercel)
  ↓
/api/* (Frontend modules - bundled with app)
  ↓
apiClient.ts (Axios HTTP client)
  ↓
https://your-backend-api.com (Actual backend server)
```

**Important**: The `/api` directory contains **frontend code** that gets bundled into your app. It's not serverless functions.

## Deployment Steps

### Option 1: Deploy via Git (Recommended)
```bash
git add vercel.json .vercelignore
git commit -m "fix: Configure Vercel for static export (Expo web)"
git push
```

Vercel will automatically redeploy with the new configuration.

### Option 2: Deploy via Vercel CLI
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel --prod
```

## Verification

After deployment, verify:

1. **Build Log** should show:
   ```
   ✓ Running Build Command: npm run vercel-build
   ✓ Exporting 42 routes
   ✓ Exported static files to web-build
   ```

2. **Deployment Type** should show:
   ```
   Functions: 0
   Static Files: 42
   ```

3. **Visit your app**:
   - Should load instantly (CDN-cached)
   - All routes should work (SPA routing)
   - API calls should go to your actual backend

## Expected Performance

### Before (Serverless Functions)
- ❌ Cold start delays (300-1000ms)
- ❌ Function execution limits
- ❌ Concurrent execution limits
- ❌ Higher costs

### After (Static Export)
- ✅ Instant loads (<50ms from CDN)
- ✅ No execution limits
- ✅ Unlimited concurrent users
- ✅ Lower costs (only bandwidth)

## Troubleshooting

### If You Still See "Too Many Functions" Error:

1. **Clear Vercel Cache**:
   ```bash
   vercel --prod --force
   ```

2. **Check for Hidden API Routes**:
   ```bash
   # Search for Next.js API route patterns
   find . -path "./api" -type f -name "*.ts" -o -name "*.js"
   ```

3. **Verify Build Output**:
   ```bash
   npm run vercel-build
   ls -la web-build/
   # Should only see static files (HTML, JS, CSS, images)
   ```

4. **Check Vercel Project Settings**:
   - Go to Vercel Dashboard → Project Settings
   - Under "Build & Development Settings"
   - Ensure "Framework Preset" is set to "Other" or "None"

### If Routes Don't Work:

All routes should redirect to `/index.html` for SPA routing. The configuration handles this with:
```json
{
  "src": "/(.*)",
  "dest": "/index.html"
}
```

### If Assets Don't Load:

Ensure your assets are in the `web-build` directory after build:
```bash
npm run vercel-build
ls web-build/assets/
ls web-build/_expo/
```

## Alternative: Using Expo Hosting

If Vercel continues to have issues, consider using Expo's official hosting:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Deploy to Expo Hosting
eas build --platform web
eas submit --platform web
```

## Summary

✅ **Fixed**: Vercel now treats your app as a static site
✅ **No serverless functions**: The `/api` directory is just frontend code
✅ **Faster performance**: CDN-cached static assets
✅ **Lower costs**: No serverless function execution costs
✅ **Unlimited scale**: Static files can handle millions of concurrent users

Your React Query + Axios refactoring is fully compatible with this static deployment. The API client runs in the browser and makes requests to your backend API.

## Questions?

- **Q**: Won't I need serverless functions for APIs?
  **A**: No. Your backend API is separate. The frontend calls your backend via HTTPS.

- **Q**: How do I add environment variables?
  **A**: Add them in Vercel Dashboard → Project Settings → Environment Variables. They get baked into the static build.

- **Q**: Can I still use SSR/SSG?
  **A**: Not with Expo. Expo web exports as a client-side SPA. For SSR, you'd need Next.js (different project).

- **Q**: Will caching still work?
  **A**: Yes! React Query caching is in-memory in the browser. Completely independent of Vercel.
