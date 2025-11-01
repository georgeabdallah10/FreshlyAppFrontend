# Supabase Profile Picture Upload - RLS Policy Fix

## Error

```
StorageApiError: new row violates row-level security policy
```

**Cause**: The Supabase `users` bucket has Row-Level Security (RLS) enabled but no policy allows users to upload their own profile pictures.

---

## Solution: Add Supabase RLS Policies

### Option 1: Fix RLS Policies (RECOMMENDED)

Go to your Supabase Dashboard → Storage → `users` bucket → Policies and add these:

#### 1. **Allow Users to Upload Their Own Profile Pictures**

```sql
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'users' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

This allows authenticated users to upload files to `{their_user_id}/filename.jpg`.

#### 2. **Allow Users to Update Their Own Profile Pictures**

```sql
CREATE POLICY "Users can update their own profile picture"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'users' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'users' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

This allows users to overwrite their existing profile picture (upsert).

#### 3. **Allow Public Read Access**

```sql
CREATE POLICY "Public can view profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'users');
```

This allows anyone to view profile pictures (needed for displaying them in the app).

---

### Option 2: Create a New Bucket with Proper Policies

If you can't modify the `users` bucket:

1. **Create new bucket**: `avatars` (or `profile-pictures`)
2. **Make it public**: Settings → Make bucket public ✅
3. **Add RLS policies** (same as above, but change `bucket_id = 'avatars'`)
4. **Update frontend code** to use the new bucket

---

## Quick Fix: Update Frontend to Use Correct Bucket

If you've already set up an `avatars` bucket with proper policies:

### Update `setPfp.tsx`:

```typescript
// Change this:
const uploadResult = await uploadAvatarFromUri(userID, finalUri, {
  bucket: 'users',  // ❌ RLS blocked
  fileName: 'profile.jpg',
  quality: 0.9,
});

// To this:
const uploadResult = await uploadAvatarFromUri(userID, finalUri, {
  bucket: 'avatars',  // ✅ Or whatever bucket has proper RLS
  fileName: 'profile.jpg',
  quality: 0.9,
});
```

### Update Default Bucket in `uploadPfp.ts`:

```typescript
// Change:
const DEFAULT_BUCKET = "users";

// To:
const DEFAULT_BUCKET = "avatars";
```

---

## How to Apply RLS Policies

### Via Supabase Dashboard (Easy):

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Storage** → **Policies**
4. Click **New Policy**
5. Choose bucket: `users`
6. Add the SQL policies above (one at a time)

### Via SQL Editor (Advanced):

1. Go to **SQL Editor** in Supabase Dashboard
2. Paste all three SQL policies above
3. Click **Run**

---

## Verify the Fix

After adding policies, test the upload:

```bash
# In your app:
1. Navigate to Set Profile Picture screen
2. Take/choose a photo
3. Check browser console for:
   [uploadImageUri] result – {data: {...}, error: null}  ✅
```

**Expected**: Upload succeeds, no RLS error.

---

## Alternative: Disable RLS (NOT RECOMMENDED)

If you're in development and want to test quickly:

1. Go to Storage → `users` bucket → Settings
2. Toggle **"Enable RLS"** OFF
3. ⚠️ **WARNING**: This makes the bucket completely open. Anyone can upload/delete files!
4. ⚠️ **Re-enable RLS before production** and add proper policies

---

## Check Current Policies

To see what policies exist:

```sql
SELECT *
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';
```

Run this in **SQL Editor** to see all storage policies.

---

## Debugging

If upload still fails after adding policies:

### 1. Check User Authentication

```typescript
const supabase = createSupabaseClient();
const { data: { user }, error } = await supabase.auth.getUser();
console.log('Current user:', user?.id);
```

**Expected**: Should print a valid UUID, not `null`.

### 2. Check Upload Path

```typescript
console.log('Upload path:', path);
// Expected: "31/profile.jpg" or "{userId}/profile.jpg"
```

**Expected**: Path should start with the user's ID.

### 3. Check Bucket Permissions

In Supabase Dashboard:
- Storage → `users` → Settings
- Verify **"Public bucket"** is ON (if you want public read)
- Verify **"Enable RLS"** is ON (for security)

### 4. Test with Supabase CLI

```bash
# Test upload manually
curl -X POST \
  'https://pvpshqpyetlizobsgbtd.supabase.co/storage/v1/object/users/31/test.jpg' \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: image/jpeg" \
  --data-binary '@test.jpg'
```

**Expected**: `200 OK` response

---

## Summary

**Problem**: RLS blocking uploads to `users` bucket  
**Root Cause**: Missing RLS policies for authenticated users  
**Solution**: Add 3 RLS policies (INSERT, UPDATE, SELECT)  
**Quick Fix**: Use a different bucket with proper policies  
**Time**: 5 minutes to add policies via Supabase Dashboard  

---

## Final Code Changes (If Using New Bucket)

### 1. Update `setPfp.tsx`:

```typescript
// Line ~175 and ~250
const uploadResult = await uploadAvatarFromUri(userID, finalUri, {
  bucket: 'avatars',  // Changed from 'users'
  fileName: 'profile.jpg',
  quality: 0.9,
});
```

### 2. Update `uploadPfp.ts`:

```typescript
// Line ~12
const DEFAULT_BUCKET = "avatars"; // Changed from "users"
```

### 3. Update Any Other References:

```bash
# Search for hardcoded 'users' bucket:
grep -r "bucket.*users" src/ components/ app/
```

---

**Status**: ⚠️ **Requires Supabase Configuration**  
**Impact**: Profile picture uploads blocked until fixed  
**Priority**: 🔴 **HIGH** (blocks user signup flow)
