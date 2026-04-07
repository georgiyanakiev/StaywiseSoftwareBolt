/*
  # Enrich Channel Catalog: connection_type and features

  ## Summary
  Adds two new columns to channel_catalog and populates all existing rows
  with connection details. The focus is on Booking.com, Expedia, and Airbnb
  which get full feature lists and are marked as direct-API integrations.

  ## New Columns
  - `connection_type` (text) — how the channel connects:
      'direct_api'      — REST API with API key / property ID
      'oauth'           — OAuth 2.0 flow
      'xml_api'         — SOAP/XML (GDS legacy)
      'channel_manager' — must route through a third-party CM
      'manual'          — no live sync; manual upload/download
  - `features` (text[]) — bullet-point capabilities shown on the card
  - `connect_note` (text) — short one-liner shown below the Add button

  ## Security
  No RLS changes needed (channel_catalog is read-only for normal users).
*/

-- 1. Add columns
ALTER TABLE channel_catalog
  ADD COLUMN IF NOT EXISTS connection_type text NOT NULL DEFAULT 'direct_api',
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS connect_note text;

-- 2. Booking.com — Direct API via Connectivity API
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY[
    'Real-time availability sync',
    'Rate & restriction management',
    'Reservation auto-import',
    'Promotions & deals push',
    'Review & message inbox'
  ],
  connect_note    = 'Requires Connectivity API credentials from the Extranet',
  description     = 'World''s largest accommodation OTA — 28 M+ listings, 220+ countries. Connect via the official Connectivity API to sync rates, availability, and receive reservations instantly.',
  commission_typical = 15
WHERE slug = 'booking_com';

-- 3. Expedia — Direct API via EQC (Expedia QuickConnect)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY[
    'Real-time rate & availability',
    'Reservation delivery via EQC',
    'Promotions & value-add deals',
    'Multi-currency pricing',
    'Partner Central reporting'
  ],
  connect_note    = 'Connect via Expedia QuickConnect (EQC) API with Hotel ID & API key',
  description     = 'Leading OTA with Hotels.com, Vrbo, and Orbitz under the same umbrella. EQC API provides two-way rate and availability sync plus instant reservation delivery.',
  commission_typical = 18
WHERE slug = 'expedia';

-- 4. Airbnb — Direct API (approved connectivity partners)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY[
    'Calendar availability sync',
    'Nightly rate management',
    'Reservation auto-import',
    'Guest messaging passthrough',
    'Pricing rules & smart pricing'
  ],
  connect_note    = 'API access via Airbnb Software Partner program (apply at airbnb.com/partners)',
  description     = 'World''s leading short-term rental marketplace with 7 M+ listings globally. API connectivity is available through approved software partners for real-time calendar and rate sync.',
  commission_typical = 14
WHERE slug = 'airbnb';

-- 5. Hotels.com (Expedia Group — same EQC)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Rate & availability sync', 'Reservation delivery', 'Expedia Group umbrella'],
  connect_note    = 'Connected via Expedia QuickConnect (EQC) — same as Expedia',
  commission_typical = 18
WHERE slug = 'hotels_com';

-- 6. Agoda
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Real-time sync', 'Asia-Pacific strong reach', 'YCS extranet integration'],
  connect_note    = 'Connect via Agoda API using YCS Hotel ID & API key',
  commission_typical = 15
WHERE slug = 'agoda';

-- 7. Trip.com (Ctrip)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['China & Asia market access', 'Rate & availability sync', 'Ctrip OTA partner portal'],
  connect_note    = 'Connect via Ctrip OpenAPI with Hotel ID & secret key',
  commission_typical = 15
WHERE slug = 'trip_com';

-- 8. HRS
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Corporate travel focus', 'Rate & availability sync', 'Negotiated rate portal'],
  connect_note    = 'Connect via HRS Partner API or HTNG interface',
  commission_typical = 12
WHERE slug = 'hrs';

-- 9. Vrbo
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Vacation rental focus', 'Calendar sync', 'Expedia Group distribution'],
  connect_note    = 'Connect via Expedia QuickConnect (EQC)',
  commission_typical = 8
WHERE slug = 'vrbo';

-- 10. HomeAway (legacy Vrbo brand)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Vacation rental listings', 'Calendar & rate sync', 'Global homeowner reach'],
  connect_note    = 'Now operating under Vrbo / Expedia Group',
  commission_typical = 8
WHERE slug = 'homeaway';

-- 11. TripAdvisor Rentals
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Vacation rental focus', 'Review-driven traffic', 'Calendar sync'],
  connect_note    = 'Connect via TripAdvisor Connectivity API',
  commission_typical = 12
WHERE slug = 'tripadvisor_rentals';

-- 12. Google Hotels (metasearch — no bookings, only rate feed)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Free booking links', 'Hotel Ads (paid CPC)', 'Rate accuracy feed', 'Direct traffic driver'],
  connect_note    = 'Set up via Google Hotel Center — no booking commission, just rate feed',
  commission_typical = 0
WHERE slug = 'google_hotels';

-- 13. TripAdvisor (metasearch)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Instant booking (CPA)', 'CPC rate ads', 'Review platform integration'],
  connect_note    = 'Connect via TripAdvisor Connectivity API',
  commission_typical = 12
WHERE slug = 'tripadvisor';

-- 14. Trivago (metasearch)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Rate comparison engine', 'CPC bidding', 'Trivago Business Studio'],
  connect_note    = 'Connect via Trivago RATES API',
  commission_typical = 0
WHERE slug = 'trivago';

-- 15. Kayak (metasearch)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Rate comparison', 'CPC bidding', 'Kayak for Business'],
  connect_note    = 'Connect via Kayak Connectivity or through a channel manager',
  commission_typical = 0
WHERE slug = 'kayak';

-- 16. Skyscanner (metasearch)
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Global metasearch', 'Direct booking integration', 'Travel audience reach'],
  connect_note    = 'Connect via Skyscanner Hotels Connectivity API',
  commission_typical = 0
WHERE slug = 'skyscanner';

-- 17. SiteMinder (channel manager)
UPDATE channel_catalog SET
  connection_type = 'channel_manager',
  features        = ARRAY['400+ distribution channels', 'Real-time 2-way sync', 'Booking engine included', 'Revenue management tools'],
  connect_note    = 'Channel manager — connects your PMS to 400+ OTAs',
  commission_typical = 0
WHERE slug = 'siteminder';

-- 18. Cloudbeds (channel manager / PMS)
UPDATE channel_catalog SET
  connection_type = 'channel_manager',
  features        = ARRAY['Built-in PMS + channel manager', '300+ OTA connections', 'Booking engine', 'Analytics dashboard'],
  connect_note    = 'All-in-one PMS with integrated channel manager',
  commission_typical = 0
WHERE slug = 'cloudbeds';

-- 19. Lodgify (channel manager)
UPDATE channel_catalog SET
  connection_type = 'channel_manager',
  features        = ARRAY['Website builder', 'Channel manager', 'Booking engine', 'Vacation rental focus'],
  connect_note    = 'Vacation rental channel manager with website builder',
  commission_typical = 0
WHERE slug = 'lodgify';

-- 20. Rentals United (channel manager)
UPDATE channel_catalog SET
  connection_type = 'channel_manager',
  features        = ARRAY['100+ vacation rental channels', 'Centralised calendar', 'Revenue management', 'Rate automation'],
  connect_note    = 'Vacation rental channel manager — distributes to 100+ platforms',
  commission_typical = 0
WHERE slug = 'rentals_united';

-- 21. Beds24 (channel manager)
UPDATE channel_catalog SET
  connection_type = 'channel_manager',
  features        = ARRAY['Multi-property support', '200+ channel connections', 'Booking engine', 'Automated messaging'],
  connect_note    = 'Cloud PMS + channel manager for multi-property operators',
  commission_typical = 0
WHERE slug = 'beds24';

-- 22. Octorate (channel manager)
UPDATE channel_catalog SET
  connection_type = 'channel_manager',
  features        = ARRAY['Italian-market specialist', 'Multi-channel sync', 'Booking engine', 'Rate intelligence'],
  connect_note    = 'Channel manager popular in Italy and Southern Europe',
  commission_typical = 0
WHERE slug = 'octorate';

-- 23. GDS — XML API
UPDATE channel_catalog SET connection_type = 'xml_api', features = ARRAY['Corporate & TMC distribution', 'Global agent network', 'Negotiated rates', 'GDS codes required'], connect_note = 'Access via GDS interface — requires GDS codes and HTNG compliance' WHERE slug IN ('amadeus', 'sabre', 'travelport');

-- 24. Direct channels — manual
UPDATE channel_catalog SET connection_type = 'manual', features = ARRAY['No OTA commission', 'Full guest data ownership', 'Flexible pricing control'], connect_note = 'No API required — track manually or via booking engine' WHERE slug IN ('direct_website', 'walk_in', 'phone_email');

-- 25. Corporate / Travel Agent — manual
UPDATE channel_catalog SET connection_type = 'manual', features = ARRAY['Negotiated rates', 'Direct client relationship', 'Invoice-based billing'], connect_note = 'No live connection — manage manually through invoicing' WHERE slug IN ('travel_agent', 'corporate_contract');

-- 26. Trip.com / Plum Guide etc.
UPDATE channel_catalog SET
  connection_type = 'direct_api',
  features        = ARRAY['Luxury vacation rental focus', 'Editorial curation', 'Quality-assured listings'],
  connect_note    = 'Apply at plumguide.com — connection after acceptance',
  commission_typical = 12
WHERE slug = 'plum_guide';
