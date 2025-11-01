# Profile Picture Upload - Quick Fix Applied

## Problem
```
StorageApiError: new row violates row-level security policy
```

**Cause**: Supabase `users` bucket has RLS enabled but no policy allows authenticated users to upload their own files.

---

## Changes Made

### 1. Changed Bucket Name (`users` → `avatars`)

**Files Modified**:
- `/app/(user)/setPfp.tsx` (2 locations)
- `/src/user/uploadPfp.ts` (DEFAULT_BUCKET constant)

**Reason**: The `avatars` bucket likely has proper RLS policies configured, or needs to be created with them.

### 2. Added Error Handling

Added try-catch around Supabase uploads with specific RLS error detection:

```typescript
try {
  const uploadResult = await uploadAvatarFromUri(...);
  // ... success
} catch (uploadError: any) {
  if (uploadError?.message?.includes('row-level security')) {
    showToast("error", "Storage permissions not configured. Check SUPABASE_RLS_FIX.md");
  } else {
    showToast("error", `Upload failed: ${uploadError?.message}`);
  }
  // Reset state
}
```

---

## Required: Supabase Configuration

You **MUST** do ONE of the following:

### Option A: Create `avatars` Bucket with RLS Policies ✅ RECOMMENDED

1. **Go to Supabase Dashboard** → Storage
2. **Create bucket**: `avatars`
3. **Make it public** (Settings → Public bucket ON)
4. **Add RLS policies**:

```sql
-- Allow users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to view avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
```

### Option B: Fix `users` Bucket RLS Policies

If you want to keep using the `users` bucket:

1. **Revert code changes**:
   - Change `bucket: 'avatars'` back to `bucket: 'users'`
   - Change `DEFAULT_BUCKET = "avatars"` back to `"users"`

2. **Add RLS policies** to `users` bucket (same SQL as above, but change `bucket_id = 'users'`)

### Option C: Disable RLS (DEV ONLY - NOT SECURE)

⚠️ **For testing only**:

1. Storage → `users` or `avatars` bucket → Settings
2. Toggle **"Enable RLS"** OFF
3. ⚠️ **Re-enable before production!**

---

## Testing

After configuration:

1. **Open app** and navigate to Set Profile Picture
2. **Choose/take photo**
3. **Check console**:
   ```
   [UPLOAD] Uploading to Supabase, userId: 31
   [uploadImageUri] uploading {bucket: "avatars", ...}
   [uploadImageUri] result {data: {...}, error: null}  ✅
   [UPLOAD] Upload successful, publicUrl: https://...
   ```

4. **Expected**: Upload succeeds, profile picture displays

---

## File Changes Summary

```diff
// setPfp.tsx (2 places)
- bucket: 'users',
+ bucket: 'avatars',
+ try { ... } catch (uploadError) { ... }

// uploadPfp.ts
- const DEFAULT_BUCKET = "users";
+ const DEFAULT_BUCKET = "avatars";
```

---

## Documentation

**Full Guide**: See `SUPABASE_RLS_FIX.md` for:
- Complete SQL policies
- Step-by-step Supabase setup
- Debugging tips
- Alternative solutions

---

## Next Steps

1. ✅ **Code updated** (bucket changed to `avatars`)
2. ⚠️ **Supabase config needed** (create `avatars` bucket + RLS policies)
3. 🧪 **Test upload** after Supabase setup
4. 📝 **Update docs** if using different bucket name

---

**Status**: ⚠️ **Waiting for Supabase Configuration**  
**Blockers**: Need to create `avatars` bucket or fix `users` bucket RLS  
**ETA**: 5 minutes (Supabase Dashboard setup)
