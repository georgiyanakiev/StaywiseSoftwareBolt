/*
# Clear leftover plain-text channel API keys

1. Changes
   - Sets `channels.api_key` to NULL on every row that already has an
     `api_key_vault_id`, completing the earlier migration that moved channel
     credentials into the encrypted vault.

2. Security
   - The channels table is readable by staff at the hotel through the data API, so any
     plain-text credential left in it was effectively published to every staff member.
     The vaulted copy remains and is what the sync functions read, so no integration
     loses its credential.

3. Notes
   - Rows without a vault id are left untouched so that no working integration is
     broken by this change.
*/

UPDATE public.channels
SET api_key = NULL
WHERE api_key_vault_id IS NOT NULL
  AND api_key IS NOT NULL;
