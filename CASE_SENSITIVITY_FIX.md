# Case-Sensitivity Fix for Vercel Deployment

## Problem
Vercel build failed with error:
```
Error: Unable to resolve module @/api/Auth/auth from /vercel/path0/app/(auth)/Login.tsx
```

## Root Cause
- **macOS file system**: Case-insensitive (Auth = auth)
- **Linux (Vercel)**: Case-sensitive (Auth ≠ auth)
- Directory was named `Auth` (capital A)
- Imports used `@/api/Auth/auth`
- On Linux, this exact case must match

## Solution Applied

### 1. Renamed Directory
```bash
mv api/Auth api/auth
```

### 2. Updated All Imports
Changed all instances from:
```typescript
import { loginUser } from "@/api/Auth/auth";
```

To:
```typescript
import { loginUser } from "@/api/auth/auth";
```

### Files Updated (8 files)
- ✅ `app/(user)/setPfp.tsx`
- ✅ `app/(auth)/Login.tsx`
- ✅ `app/(auth)/signup.tsx`
- ✅ `app/(auth)/forgot-password.tsx`
- ✅ `app/(tabs)/index.tsx`
- ✅ `context/usercontext.tsx` (2 imports)
- ✅ `components/familyMangment/OwnerView.tsx`

## Verification

### Directory Structure
```
api/
  ├── auth/          ✅ (lowercase)
  │   └── auth.ts
  ├── client/
  ├── config/
  ├── services/
  └── ...
```

### All Imports Now Use Lowercase
```bash
# Check for any remaining uppercase paths
grep -r "@/api/[A-Z]" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.expo

# Result: No matches ✅
```

## Best Practices for Expo/React Native

### Follow Unix/Linux Conventions
- Use **lowercase** for all directory names
- Use **kebab-case** or **lowercase** for file names
- Avoid mixed case to prevent cross-platform issues

### Recommended Structure
```
api/
  ├── auth/           ✅ lowercase
  ├── services/       ✅ lowercase
  ├── client/         ✅ lowercase
  └── config/         ✅ lowercase
```

### Avoid
```
api/
  ├── Auth/           ❌ uppercase
  ├── Services/       ❌ uppercase
  ├── Client/         ❌ uppercase
  └── Config/         ❌ uppercase
```

## Why This Matters

### Development (macOS/Windows)
- File system is case-insensitive
- `Auth` and `auth` point to same directory
- Code works fine locally

### Production (Linux/Vercel)
- File system is case-sensitive
- `Auth` and `auth` are different directories
- Import must exactly match directory name
- Build fails if case doesn't match

## Deploy Now

This fix is complete. You can now deploy:

```bash
git add .
git commit -m "fix: Rename Auth directory to auth for case-sensitive builds"
git push
```

## Future Prevention

### Pre-commit Check
Add this to your workflow:

```bash
# Check for uppercase in api directory names
find api -type d -name "[A-Z]*" | while read dir; do
  echo "⚠️  Warning: Uppercase directory detected: $dir"
  echo "   Consider renaming to lowercase for Linux compatibility"
done
```

### ESLint Rule (Optional)
Consider adding a rule to enforce lowercase imports:

```json
{
  "rules": {
    "import/no-unresolved": ["error", {
      "caseSensitive": true
    }]
  }
}
```

## Summary

✅ **Fixed**: Renamed `api/Auth` → `api/auth`
✅ **Updated**: 8 files with import statements
✅ **Verified**: No remaining uppercase paths
✅ **Ready**: Can now deploy to Vercel

The build should now succeed on Linux-based systems like Vercel! 🚀

---

**Date**: October 31, 2025
**Issue**: Case-sensitivity on Linux vs macOS
**Status**: ✅ Fixed
