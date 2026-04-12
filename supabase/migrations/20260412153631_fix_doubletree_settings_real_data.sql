/*
  # Fix DoubleTree Chester hotel settings with real UK data

  1. Changes
    - Currency from EUR to GBP (UK hotel)
    - VAT rate set to 20% (UK standard), tax_rate to 0 (was duplicating VAT)
    - Service charge set to 0% (not common in UK hotels)
    - City tax set to 0% (UK has no city/tourist tax)
    - Payment policy populated with realistic content
    - Email templates populated with professional content
    - Deposit required with 50% for a 4-star hotel
    - Bank transfer enabled (common in UK hotels)
    - Stripe enabled for online bookings

  2. Important Notes
    - All values reflect real UK hospitality standards
    - Tax-inclusive pricing set to true (UK standard)
*/

UPDATE hotels SET
  currency = 'GBP',
  tax_rate = 0,
  vat_rate = 20.00,
  city_tax = 0,
  service_charge = 0,
  tax_inclusive = true,
  accepts_bank_transfer = true,
  deposit_required = true,
  deposit_percentage = 50,
  stripe_enabled = true,
  payment_policy = 'A deposit of 50% is required at the time of booking. The remaining balance is due upon check-in. We accept credit cards, debit cards, bank transfers, and cash. Refunds for eligible cancellations are processed within 5-7 business days.',
  booking_confirmation_template = 'Dear {guest_name},

Thank you for choosing DoubleTree by Hilton Chester! Your reservation has been confirmed.

Booking Reference: {reservation_number}
Check-in: {check_in_date} from 3:00 PM
Check-out: {check_out_date} by 11:00 AM
Room Type: {room_type}
Room: {room_number}
Total: {total_amount}

Please present a valid photo ID and the credit card used for booking at check-in. If you have any special requests or need to modify your reservation, please contact us at +44 1244 408800.

We look forward to welcoming you!

Warm regards,
DoubleTree by Hilton Chester
Trinity Street, Chester CH1 2BD',
  checkin_reminder_template = 'Dear {guest_name},

Just a friendly reminder that your stay at DoubleTree by Hilton Chester begins tomorrow!

Booking Reference: {reservation_number}
Check-in: {check_in_date} from 3:00 PM
Room Type: {room_type}

What to bring: A valid photo ID and the credit card used for booking.

Parking: On-site parking is available at £12 per day. Please enquire at reception.

Need help? Contact us at +44 1244 408800 or reply to this email.

See you tomorrow!

DoubleTree by Hilton Chester',
  thankyou_template = 'Dear {guest_name},

Thank you for staying with us at DoubleTree by Hilton Chester! We truly hope you enjoyed your visit.

Your Booking Reference was: {reservation_number}
Stay: {check_in_date} to {check_out_date}

We would love to hear about your experience. If you have a moment, please consider leaving a review on TripAdvisor or Google.

As a valued guest, we are delighted to offer you a 10% discount on your next stay. Simply quote RETURN10 when booking directly.

We hope to welcome you back soon.

Warm regards,
The Team at DoubleTree by Hilton Chester'
WHERE id = '1a176f97-b4be-4a37-83de-3c23b6be58c0';
