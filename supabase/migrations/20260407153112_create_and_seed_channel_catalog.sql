/*
  # Create and seed channel_catalog table

  1. New Tables
    - `channel_catalog` — global read-only master list of all OTA channels and
      channel managers. No tenant_id. Every hotel sees the same catalog.
      Columns: id, name, slug (unique), type, category, description, website_url,
      logo_color, logo_letter, commission_typical, regions[], popularity_rank, active

  2. Security
    - RLS disabled: catalog is global, not per-tenant data. All authenticated
      users should be able to read it.

  3. Data
    - Seeds 40+ channels across: OTA, vacation_rental, metasearch,
      channel_manager, gds, direct, corporate categories.
*/

create table if not exists channel_catalog (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique not null,
  type                text not null,
  category            text not null check (category in (
    'ota', 'metasearch', 'channel_manager', 'vacation_rental', 'direct', 'corporate', 'gds'
  )),
  description         text,
  website_url         text,
  logo_color          text,
  logo_letter         text,
  commission_typical  numeric(5,2),
  regions             text[],
  popularity_rank     integer default 99,
  active              boolean default true,
  created_at          timestamptz default now()
);

alter table channel_catalog disable row level security;

insert into channel_catalog
  (name, slug, type, category, description, website_url, logo_color, logo_letter, commission_typical, regions, popularity_rank)
values
-- Major OTAs
('Booking.com',     'booking_com',  'booking_com',  'ota', 'World''s largest accommodation platform',        'https://booking.com',       '#003580', 'B',  15.0, array['global'],          1),
('Expedia',         'expedia',      'expedia',       'ota', 'Leading US-based OTA with global reach',          'https://expedia.com',       '#FFC72C', 'E',  18.0, array['global'],          2),
('Hotels.com',      'hotels_com',   'hotels_com',    'ota', 'Part of Expedia Group, loyalty rewards focus',    'https://hotels.com',        '#D9182D', 'H',  18.0, array['global'],          3),
('Agoda',           'agoda',        'agoda',         'ota', 'Strong in Asia-Pacific markets',                  'https://agoda.com',         '#CC0000', 'AG', 15.0, array['global','asia'],   4),
('Trip.com',        'trip_com',     'trip_com',      'ota', 'China''s largest OTA, strong Asian reach',        'https://trip.com',          '#007DFF', 'T',  14.0, array['global','asia'],   5),
('HRS',             'hrs',          'hrs',           'ota', 'Corporate travel focused, strong in Europe',      'https://hrs.com',           '#E30613', 'HR', 17.0, array['europe','global'], 6),
('Hotelbeds',       'hotelbeds',    'hotelbeds',     'ota', 'B2B distribution to 60,000+ travel agents',       'https://hotelbeds.com',     '#E8452C', 'HB', 20.0, array['global'],          7),
('Lastminute.com',  'lastminute',   'lastminute',    'ota', 'Last-minute deals focused platform',              'https://lastminute.com',    '#E60000', 'LM', 16.0, array['europe'],          8),
('eDreams',         'edreams',      'edreams',       'ota', 'Major European OTA and flights+hotels',           'https://edreams.com',       '#FF6900', 'ED', 16.0, array['europe'],          9),
('Despegar',        'despegar',     'despegar',      'ota', 'Leading OTA in Latin America',                    'https://despegar.com',      '#1A98FF', 'DE', 15.0, array['latam'],          10),

-- Vacation Rentals
('Airbnb',              'airbnb',              'airbnb',              'vacation_rental', 'World''s largest vacation rental platform',         'https://airbnb.com',          '#FF5A5F', 'AB', 14.0, array['global'],        1),
('Vrbo',                'vrbo',                'vrbo',                'vacation_rental', 'Vacation rentals by owner, part of Expedia',         'https://vrbo.com',            '#1B5EFF', 'VR',  8.0, array['global','us'],   2),
('HomeAway',            'homeaway',            'homeaway',            'vacation_rental', 'Long-term and holiday home rentals',                 'https://homeaway.com',        '#F5A623', 'HA',  8.0, array['global'],        3),
('TripAdvisor Rentals', 'tripadvisor_rentals', 'tripadvisor_rentals', 'vacation_rental', 'Vacation rental listings on TripAdvisor',            'https://tripadvisor.com',     '#34E0A1', 'TA',  3.0, array['global'],        4),
('Plum Guide',          'plum_guide',          'plum_guide',          'vacation_rental', 'Curated high-end vacation rentals',                  'https://plumguide.com',       '#2D2D2D', 'PG', 10.0, array['global'],        5),
('Holidu',              'holidu',              'holidu',              'vacation_rental', 'European vacation rental search engine',              'https://holidu.com',          '#FF5B24', 'HO', 12.0, array['europe'],        6),

-- Metasearch
('Google Hotels',   'google_hotels',   'google_hotels',   'metasearch', 'Google''s hotel search with direct booking',     'https://google.com',         '#4285F4', 'G',   0.0, array['global'],          1),
('TripAdvisor',     'tripadvisor',     'tripadvisor',     'metasearch', 'Travel review platform with hotel booking',      'https://tripadvisor.com',    '#34E0A1', 'TR',  3.0, array['global'],          2),
('Trivago',         'trivago',         'trivago',         'metasearch', 'Hotel price comparison metasearch',               'https://trivago.com',        '#E8002B', 'TV',  0.0, array['global'],          3),
('Kayak',           'kayak',           'kayak',           'metasearch', 'Travel search owned by Booking Holdings',         'https://kayak.com',          '#FF690F', 'KY',  0.0, array['global','us'],     4),
('Skyscanner',      'skyscanner',      'skyscanner',      'metasearch', 'Flight and hotel comparison platform',            'https://skyscanner.com',     '#0770E3', 'SK',  0.0, array['global','europe'], 5),
('HotelsCombined',  'hotelscombined',  'hotelscombined',  'metasearch', 'Hotel comparison and price aggregator',           'https://hotelscombined.com', '#FF9900', 'HC',  0.0, array['global'],          6),

-- Channel Managers
('SiteMinder',      'siteminder',      'siteminder',      'channel_manager', 'Leading channel manager for hotels',             'https://siteminder.com',    '#0066CC', 'SM', 0.0, array['global'],          1),
('Cloudbeds',       'cloudbeds',       'cloudbeds',       'channel_manager', 'All-in-one PMS and channel manager',              'https://cloudbeds.com',     '#FF6B2B', 'CB', 0.0, array['global'],          2),
('Lodgify',         'lodgify',         'lodgify',         'channel_manager', 'Website builder and channel manager',             'https://lodgify.com',       '#00C4B4', 'LO', 0.0, array['global'],          3),
('Rentals United',  'rentals_united',  'rentals_united',  'channel_manager', 'Vacation rental channel manager',                 'https://rentalsunited.com', '#2196F3', 'RU', 0.0, array['global'],          4),
('Beds24',          'beds24',          'beds24',          'channel_manager', 'Flexible channel manager and PMS',                'https://beds24.com',        '#1976D2', 'B2', 0.0, array['global'],          5),
('Octorate',        'octorate',        'octorate',        'channel_manager', 'Italian PMS and channel manager',                 'https://octorate.com',      '#FF5722', 'OC', 0.0, array['europe'],          6),
('Smoobu',          'smoobu',          'smoobu',          'channel_manager', 'Vacation rental management software',             'https://smoobu.com',        '#00BCD4', 'SB', 0.0, array['global','europe'], 7),
('Hostaway',        'hostaway',        'hostaway',        'channel_manager', 'Short-term rental management platform',           'https://hostaway.com',      '#1B3A6B', 'HW', 0.0, array['global'],          8),
('iGMS',            'igms',            'igms',            'channel_manager', 'Vacation rental management software',             'https://igms.com',          '#5C6BC0', 'IG', 0.0, array['global'],          9),
('Guesty',          'guesty',          'guesty',          'channel_manager', 'Property management for short-term rentals',      'https://guesty.com',        '#00B4D8', 'GU', 0.0, array['global'],         10),

-- GDS
('Amadeus',              'amadeus',    'amadeus',    'gds', 'Global Distribution System for travel agents',  'https://amadeus.com',    '#005FAD', 'AM', 25.0, array['global'], 1),
('Sabre',                'sabre',      'sabre',      'gds', 'GDS used by travel agents worldwide',            'https://sabre.com',      '#003087', 'SA', 25.0, array['global'], 2),
('Galileo / Travelport', 'travelport', 'travelport', 'gds', 'Global travel distribution platform',           'https://travelport.com', '#0052CC', 'GP', 25.0, array['global'], 3),

-- Direct
('Direct Booking (Website)', 'direct_website',     'direct',    'direct',    'Bookings from your own hotel website',         null, '#10B981', 'DW',  0.0, array['global'], 1),
('Walk-in',                  'walk_in',            'direct',    'direct',    'In-person reservations at front desk',         null, '#64748B', 'WI',  0.0, array['global'], 2),
('Phone / Email',            'phone_email',        'direct',    'direct',    'Reservations taken by phone or email',         null, '#0EA5E9', 'PE',  0.0, array['global'], 3),
('Travel Agent',             'travel_agent',       'corporate', 'corporate', 'Traditional travel agency bookings',           null, '#F59E0B', 'TA', 10.0, array['global'], 4),
('Corporate Contract',       'corporate_contract', 'corporate', 'corporate', 'Direct corporate rate agreements',             null, '#0891B2', 'CC',  5.0, array['global'], 5)

on conflict (slug) do nothing;
