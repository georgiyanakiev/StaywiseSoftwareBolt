/*
  # Add anon SELECT policies for booking widget tables

  ## Purpose
  The public booking widget is loaded by unauthenticated (anon) guests to browse
  available rooms and add-ons. All four tables currently restrict SELECT to
  `authenticated` only, meaning the widget returns empty results for real guests.

  ## Changes

  ### booking_engine_config
  - New anon SELECT policy: guests can read config rows where `active = true`.
    This covers hotel branding, check-in/out times, currency, and deposit settings
    needed to render the widget.

  ### room_types
  - New anon SELECT policy: guests can read room types whose hotel has an active
    booking engine config. This lets the widget display room categories and rates.

  ### rooms
  - New anon SELECT policy: guests can read individual rooms whose hotel has an
    active booking engine config. The widget uses this to calculate availability
    and inventory counts.

  ### upsell_items
  - New anon SELECT policy: guests can read upsell items that are themselves
    `active = true` AND whose hotel has an active booking engine config.
    This lets the widget offer add-ons (breakfast, late check-out, etc.) at the
    point of booking.

  ## Security notes
  - Write operations (INSERT / UPDATE / DELETE) remain restricted to `authenticated`
    staff — these policies add no write exposure.
  - Data is scoped to hotels that have explicitly enabled their booking widget
    (`active = true` on booking_engine_config), so deactivated properties stay
    invisible to unauthenticated users.
  - No cross-tenant data is exposed; every policy ultimately anchors on hotel_id,
    which is already enforced by the FK chain from booking_engine_config.
*/

-- booking_engine_config: anon can read active widget configs
CREATE POLICY "Anon can view active booking engine configs"
  ON booking_engine_config
  FOR SELECT
  TO anon
  USING (active = true);

-- room_types: anon can read types belonging to hotels with an active booking engine
CREATE POLICY "Anon can view room types for active booking engines"
  ON room_types
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM booking_engine_config bec
      WHERE bec.hotel_id = room_types.hotel_id
        AND bec.active = true
    )
  );

-- rooms: anon can read rooms belonging to hotels with an active booking engine
CREATE POLICY "Anon can view rooms for active booking engines"
  ON rooms
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM booking_engine_config bec
      WHERE bec.hotel_id = rooms.hotel_id
        AND bec.active = true
    )
  );

-- upsell_items: anon can read active items for hotels with an active booking engine
CREATE POLICY "Anon can view active upsell items for active booking engines"
  ON upsell_items
  FOR SELECT
  TO anon
  USING (
    active = true
    AND EXISTS (
      SELECT 1
      FROM booking_engine_config bec
      WHERE bec.hotel_id = upsell_items.hotel_id
        AND bec.active = true
    )
  );
