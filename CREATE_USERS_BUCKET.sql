-- Create the 'users' bucket for profile pictures
-- Run this in your Supabase SQL Editor

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('users', 'users', true, 52428800, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/*'];

-- 2. Create RLS policies that allow anyone to upload (since you use custom JWT auth)
DROP POLICY IF EXISTS "Allow all inserts to users bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow all updates to users bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads from users bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes from users bucket" ON storage.objects;

CREATE POLICY "Allow all inserts to users bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'users');

CREATE POLICY "Allow all updates to users bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'users');

CREATE POLICY "Allow all reads from users bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'users');

CREATE POLICY "Allow all deletes from users bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'users');

-- 3. Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name = 'users';
