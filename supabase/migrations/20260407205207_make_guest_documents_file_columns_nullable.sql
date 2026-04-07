/*
  # Make file_name and file_url nullable in guest_documents

  ## Summary
  The guest_documents table is used for both:
  1. Digital check-in portal submissions (metadata only: type, number, nationality, dates)
  2. Staff-uploaded file attachments (file_name + file_url required)

  The original NOT NULL constraints on file_name and file_url broke the portal
  upsert path, which legitimately saves document metadata without a physical file.
  This migration relaxes those constraints so both use-cases work correctly.

  ## Changes
  - `file_name`: NOT NULL → nullable (default empty string for backwards compat)
  - `file_url`:  NOT NULL → nullable (default empty string for backwards compat)
*/

ALTER TABLE guest_documents
  ALTER COLUMN file_name SET DEFAULT '',
  ALTER COLUMN file_url  SET DEFAULT '';

ALTER TABLE guest_documents
  ALTER COLUMN file_name DROP NOT NULL,
  ALTER COLUMN file_url  DROP NOT NULL;
