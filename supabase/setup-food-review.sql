-- Storage bucket setup for food review photos
-- This script should be run in the Supabase SQL Editor

-- Step 1: Create the food-review storage bucket (if it doesn't exist)
-- Note: Bucket creation must be done via Supabase Dashboard or API
-- Go to: Storage > Create Bucket
-- Name: food-review
-- Public: true (for public access to photos)

-- Step 2: Ensure the bucket exists and is public
-- This will create the bucket if it doesn't exist (requires superuser or use Dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-review', 'food-review', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Step 3: Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "food_review_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "food_review_view_policy" ON storage.objects;
DROP POLICY IF EXISTS "food_review_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "food_review_delete_policy" ON storage.objects;

-- Step 4: Create bucket-level policies for the food-review bucket

-- Policy: Authenticated users can upload photos to their own folder
-- File path format: {user_id}/filename.ext
CREATE POLICY "food_review_upload_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-review' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view photos in the food-review bucket (public bucket)
CREATE POLICY "food_review_view_policy"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'food-review');

-- Policy: Users can update their own photos
CREATE POLICY "food_review_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'food-review' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'food-review' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own photos
CREATE POLICY "food_review_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-review' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify the bucket was created/updated
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE name = 'food-review';

