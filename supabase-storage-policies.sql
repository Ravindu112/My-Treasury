-- Storage bucket RLS policies
-- Run this AFTER creating the buckets in the Supabase dashboard

-- AVATARS bucket
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (
  bucket_id = 'avatars'
);
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);

-- BILLS bucket
DROP POLICY IF EXISTS "Anyone can view bills" ON storage.objects;
CREATE POLICY "Anyone can view bills" ON storage.objects FOR SELECT USING (
  bucket_id = 'bills'
);
DROP POLICY IF EXISTS "Authenticated users can upload bills" ON storage.objects;
CREATE POLICY "Authenticated users can upload bills" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'bills' AND auth.role() = 'authenticated'
);
DROP POLICY IF EXISTS "Users can delete own bill" ON storage.objects;
CREATE POLICY "Users can delete own bill" ON storage.objects FOR DELETE USING (
  bucket_id = 'bills' AND auth.role() = 'authenticated'
);
