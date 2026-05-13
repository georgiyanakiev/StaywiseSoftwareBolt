/*
  # Ensure Data API grants on public schema tables

  Background:
  Starting May 30, 2026 new Supabase projects will not auto-grant access on tables
  created in the `public` schema, and on October 30, 2026 this is enforced for all
  existing projects. Without explicit GRANTs, supabase-js / PostgREST / GraphQL
  cannot read or write a table even if RLS policies would allow it.

  This migration:

  1. Re-applies grants on every existing `public` table to `anon`, `authenticated`,
     and `service_role` so the current schema is explicitly compliant.
  2. Sets `ALTER DEFAULT PRIVILEGES` for the `postgres` role so any future tables
     created in `public` automatically get the right grants without us having to
     remember in each migration.

  No data is modified. RLS policies on each table continue to control row-level
  access; these GRANTs only restore the table-level permissions that PostgREST
  inspects.
*/

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', r.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', r.tablename);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
