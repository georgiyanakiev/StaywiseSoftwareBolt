export type UpsellCategory =
  | 'room_upgrade'
  | 'early_checkin'
  | 'late_checkout'
  | 'breakfast'
  | 'dinner'
  | 'spa'
  | 'transfer'
  | 'parking'
  | 'experience'
  | 'other';

export type PriceType = 'per_stay' | 'per_night' | 'per_person' | 'per_night_per_person';

export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';

export interface UpsellItem {
  id: string;
  hotel_id: string;
  tenant_id: string | null;
  name: string;
  description: string;
  category: UpsellCategory;
  price: number;
  price_type: PriceType;
  max_quantity: number;
  available_from_days_before: number;
  available_until_hours_before: number;
  image_url: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface UpsellOrder {
  id: string;
  hotel_id: string;
  tenant_id: string | null;
  booking_id: string | null;
  guest_name: string;
  upsell_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: OrderStatus;
  notes: string;
  ordered_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
}

export const CATEGORY_LABELS: Record<UpsellCategory, string> = {
  room_upgrade:  'Room Upgrade',
  early_checkin: 'Early Check-in',
  late_checkout: 'Late Check-out',
  breakfast:     'Breakfast',
  dinner:        'Dinner',
  spa:           'Spa & Wellness',
  transfer:      'Airport Transfer',
  parking:       'Parking',
  experience:    'Experience',
  other:         'Other',
};

export const CATEGORY_COLORS: Record<UpsellCategory, string> = {
  room_upgrade:  'bg-blue-100 text-blue-700',
  early_checkin: 'bg-amber-100 text-amber-700',
  late_checkout: 'bg-orange-100 text-orange-700',
  breakfast:     'bg-emerald-100 text-emerald-700',
  dinner:        'bg-teal-100 text-teal-700',
  spa:           'bg-pink-100 text-pink-700',
  transfer:      'bg-sky-100 text-sky-700',
  parking:       'bg-gray-100 text-gray-700',
  experience:    'bg-violet-100 text-violet-700',
  other:         'bg-slate-100 text-slate-700',
};

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  per_stay:              'Per stay',
  per_night:             'Per night',
  per_person:            'Per person',
  per_night_per_person:  'Per night / person',
};

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
};
