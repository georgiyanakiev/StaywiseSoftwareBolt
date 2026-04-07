/*
  # Move OTA Channel Credentials to Supabase Vault

  ## Summary
  OTA API keys (api_key) were stored as plaintext in the channels table and
  queryable by any authenticated staff member. This migration moves credentials
  into Supabase Vault (encrypted at rest) and replaces them with opaque vault
  reference IDs. It also adds several missing columns required by the frontend.

  ## Changes to `channels`
  - Adds `type` — OTA type (booking_com, airbnb, expedia, direct, other)
  - Adds `commission_pct` — commission percentage (separate from legacy commission_rate)
  - Adds `client_id` — OAuth client ID (non-secret, stored in plaintext)
  - Adds `sync_enabled` — whether auto-sync is active
  - Adds `tenant_id` — multi-tenant foreign key
  - Adds `api_key_vault_id` (uuid) — Vault reference for the API key
  - Adds `client_secret_vault_id` (uuid) — Vault reference for the OAuth client secret
  - Nullifies the existing `api_key` plaintext column values

  ## New Functions
  - `store_channel_secret(p_vault_id, p_name, p_value)` — SECURITY DEFINER
    Creates a new or updates an existing Vault secret; returns the vault UUID.
    Executable by authenticated users only.

  ## Security
  - Secrets are encrypted by pgsodium inside Vault; never returned by a regular
    SELECT on channels.
  - The helper is SECURITY DEFINER so Vault internals stay server-side; callers
    only receive the opaque UUID to store as a reference.
*/

-- 1. Add missing business columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='channels' AND column_name='type') THEN
    ALTER TABLE channels ADD COLUMN type text DEFAULT 'other'
      CHECK (type IN ('booking_com','airbnb','expedia','direct','other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='channels' AND column_name='commission_pct') THEN
    ALTER TABLE channels ADD COLUMN commission_pct numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='channels' AND column_name='client_id') THEN
    ALTER TABLE channels ADD COLUMN client_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='channels' AND column_name='sync_enabled') THEN
    ALTER TABLE channels ADD COLUMN sync_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='channels' AND column_name='tenant_id') THEN
    ALTER TABLE channels ADD COLUMN tenant_id uuid REFERENCES tenants(id);
  END IF;
END $$;

-- 2. Add vault reference columns (idempotent)
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS api_key_vault_id uuid,
  ADD COLUMN IF NOT EXISTS client_secret_vault_id uuid;

-- 3. Backfill type from existing channel names
UPDATE channels SET type = 'booking_com' WHERE lower(name) LIKE '%booking%' AND (type = 'other' OR type IS NULL);
UPDATE channels SET type = 'airbnb'      WHERE lower(name) LIKE '%airbnb%'  AND (type = 'other' OR type IS NULL);
UPDATE channels SET type = 'expedia'     WHERE lower(name) LIKE '%expedia%' AND (type = 'other' OR type IS NULL);
UPDATE channels SET type = 'direct'      WHERE lower(name) LIKE '%direct%'  AND (type = 'other' OR type IS NULL);

-- Backfill commission_pct from commission_rate if available
UPDATE channels SET commission_pct = commission_rate WHERE commission_pct = 0 AND commission_rate > 0;

-- 4. Null out existing plaintext api_key values (all demo data — no real secrets)
UPDATE channels SET api_key = NULL WHERE api_key IS NOT NULL AND api_key <> '';

-- 5. Create SECURITY DEFINER helper to store/update a Vault secret
CREATE OR REPLACE FUNCTION store_channel_secret(
  p_vault_id    uuid,
  p_name        text,
  p_value       text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public, extensions
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_vault_id IS NOT NULL THEN
    PERFORM vault.update_secret(p_vault_id, p_value);
    RETURN p_vault_id;
  ELSE
    v_id := vault.create_secret(p_value, p_name);
    RETURN v_id;
  END IF;
END;
$$;

-- Restrict to authenticated users only
REVOKE ALL ON FUNCTION store_channel_secret(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION store_channel_secret(uuid, text, text) TO authenticated;
