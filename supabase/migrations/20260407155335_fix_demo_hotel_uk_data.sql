/*
  # Fix Demo Hotel Data Mismatch (BUG-009)

  ## Problem
  The Grand Metropolitan hotel (assigned to admin@demo.com) contains placeholder US data
  ("500 Park Avenue, New York, United States") while the app's pilot hotel is
  "DoubleTree by Hilton Chester" (UK). The DoubleTree record also has blank address fields.

  ## Changes
  1. Updates "The Grand Metropolitan" with correct Chester, UK address details so
     Settings > Hotel Settings reflects the right location for the demo admin user.
  2. Populates "DoubleTree by Hilton Chester" with full UK address and contact details.
  3. Corrects timezone to Europe/London for both UK hotels.
  4. Ensures check-in/check-out times are standard UK hospitality times.
*/

UPDATE hotels
SET
  address        = 'Trinity Street',
  city           = 'Chester',
  country        = 'United Kingdom',
  phone          = '+44 1244 408800',
  email          = 'chester@doubletree.com',
  website        = 'https://www.hilton.com/en/hotels/manctdi-doubletree-chester/',
  star_rating    = 4,
  check_in_time  = '15:00',
  check_out_time = '12:00',
  timezone       = 'Europe/London',
  currency       = 'GBP'
WHERE id = 'e83fbd69-4191-41b4-9651-cdbfd784786d';

UPDATE hotels
SET
  name           = 'DoubleTree by Hilton Chester',
  address        = 'Trinity Street',
  city           = 'Chester',
  country        = 'United Kingdom',
  phone          = '+44 1244 408800',
  email          = 'chester@doubletree.com',
  website        = 'https://www.hilton.com/en/hotels/manctdi-doubletree-chester/',
  star_rating    = 4,
  check_in_time  = '15:00',
  check_out_time = '12:00',
  timezone       = 'Europe/London',
  currency       = 'GBP'
WHERE id = '1a176f97-b4be-4a37-83de-3c23b6be58c0';
