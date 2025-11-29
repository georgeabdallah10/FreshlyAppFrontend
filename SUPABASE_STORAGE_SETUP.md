# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage buckets for AI-generated meal and pantry images.

## Prerequisites

- Access to your Supabase Dashboard
- Project already created in Supabase

## Bucket Setup

### 1. Create Storage Buckets

Navigate to **Storage** in your Supabase Dashboard and create the following buckets:

1. **Meals** - For AI-generated meal images
2. **pantryItems** - For AI-generated pantry item images

### 2. Configure Bucket Settings

For each bucket:

1. Click on the bucket name
2. Go to **Configuration**
3. Set **Public bucket** to `ON` (this allows public read access to images)

### 3. Set Up Row Level Security (RLS) Policies

You need to add policies to allow authenticated users to upload, update, and read images.

#### For the "Meals" bucket:

Go to **Storage** → **Policies** → Create new policy for the **Meals** bucket:

##### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated users to upload meal images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Meals');
```

##### Policy 2: Allow authenticated users to update
```sql
CREATE POLICY "Allow authenticated users to update meal images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Meals');
```

##### Policy 3: Allow public read access
```sql
CREATE POLICY "Allow public read access to meal images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Meals');
```

#### For the "pantryItems" bucket:

Repeat the same policies for the **pantryItems** bucket:

##### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated users to upload pantry images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pantryItems');
```

##### Policy 2: Allow authenticated users to update
```sql
CREATE POLICY "Allow authenticated users to update pantry images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pantryItems');
```

##### Policy 3: Allow public read access
```sql
CREATE POLICY "Allow public read access to pantry images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pantryItems');
```

### 4. Alternative: Use Supabase Dashboard UI

If you prefer using the UI instead of SQL:

1. Go to **Storage** → **Policies**
2. Click **New Policy**
3. Select the bucket (e.g., "Meals")
4. Choose a template or create custom:
   - **Target roles**: `authenticated` (for INSERT/UPDATE) or `public` (for SELECT)
   - **Policy command**: `INSERT`, `UPDATE`, or `SELECT`
   - **USING expression**: `bucket_id = 'Meals'`
   - **WITH CHECK expression**: `bucket_id = 'Meals'` (for INSERT/UPDATE)

## Verification

After setup, you can verify the configuration:

1. **Test bucket access**: The app will automatically check bucket accessibility on first image upload
2. **Check console logs**: Look for `[MealImageService] ✅ Bucket "Meals" is accessible`
3. **Test upload**: Generate an image for a meal - it should upload successfully

## Troubleshooting

### Error: "Network request failed"

This usually means:
- The bucket doesn't exist
- RLS policies are too restrictive
- The bucket is not set to public

**Solution**:
1. Verify bucket exists and is set to **Public**
2. Check RLS policies allow authenticated users to INSERT/UPDATE
3. Check your authentication token is valid

### Error: "Permission denied"

This means:
- RLS policies are blocking the operation
- User is not authenticated

**Solution**:
1. Ensure user is logged in (check `access_token` in storage)
2. Verify RLS policies are correctly set up
3. Check the policy uses `authenticated` role, not `anon`

### Images upload but don't display

This means:
- Bucket is not set to public
- SELECT policy is missing

**Solution**:
1. Set bucket to **Public** in configuration
2. Add a SELECT policy for `public` role

## Cost Optimization

The app implements a three-tier caching strategy to minimize costs:

1. **In-memory cache** - Instant, free
2. **Supabase bucket** - Fast, free (after initial upload)
3. **AI generation** - Slow, ~$0.02 per image

Supabase free tier includes:
- 1GB storage
- 2GB bandwidth per month

This is sufficient for ~5,000-10,000 meal images with typical usage patterns.

## Security Notes

- Images are stored with sanitized filenames (lowercase, no special chars)
- Filenames are derived from meal names, making them predictable
- All images are publicly readable (by design)
- Only authenticated users can upload/update images
- Consider adding rate limiting if you expect high traffic

## Support

If you encounter issues not covered here:

1. Check Supabase logs in Dashboard → Logs
2. Enable debug logging in the app by setting `DEBUG_LOGS = true` in `mealImageService.ts`
3. Check browser/console for detailed error messages
