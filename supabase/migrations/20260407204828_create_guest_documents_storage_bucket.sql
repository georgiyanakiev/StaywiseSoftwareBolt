/*
  # Create guest-documents Storage Bucket

  ## Summary
  Creates a private Supabase Storage bucket for guest identity documents
  (passports, ID cards, driver's licenses) uploaded via the staff interface
  or the guest digital check-in portal.

  ## Changes
  - Creates private bucket `guest-documents` (10 MB file limit, images + PDF)
  - Adds RLS policies so authenticated users can upload, read, and delete
    objects within the bucket (access to specific records is still controlled
    by RLS on the `guest_documents` table)

  ## Security
  - Bucket is private (public = false) — files are not publicly accessible
  - All operations require an authenticated Supabase session
  - Individual row access is enforced by the guest_documents table RLS policies
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest-documents',
  'guest-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload guest documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload guest documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'guest-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can read guest documents'
  ) THEN
    CREATE POLICY "Authenticated users can read guest documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'guest-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can delete guest documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete guest documents"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'guest-documents');
  END IF;
END $$;
