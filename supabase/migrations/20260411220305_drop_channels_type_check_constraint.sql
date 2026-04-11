/*
  # Drop restrictive channels type check constraint

  1. Changes
    - Removes the `channels_type_check` constraint on the `channels` table
    - Previously only allowed: booking_com, airbnb, expedia, direct, other
    - Now allows any value, so all 40+ channel catalog slugs (smoobu, cloudbeds, lodgify, siteminder, etc.) can be used

  2. Reason
    - The channel catalog has grown to 40 entries but the check constraint only permitted 5 types
    - Adding a channel from the catalog with any other slug (e.g. smoobu) failed with a check constraint violation
*/

ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_type_check;
