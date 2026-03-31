export interface GuestProfile {
  id: string;
  tenant_id?: string;
  hotel_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  country?: string;
  city?: string;
  address?: string;
  company?: string;
  vat_number?: string;
  loyalty_tier: 'standard' | 'silver' | 'gold' | 'platinum';
  loyalty_points: number;
  marketing_opt_in: boolean;
  tags: string[];
  notes?: string;
  blacklisted: boolean;
  created_at: string;
  last_stay_at?: string;
  total_stays: number;
  total_spent: number;
  dietary_requirements?: string;
  room_preferences?: string;
  language_preference?: string;
  birthday_month?: number;
  birthday_day?: number;
  anniversary_date?: string;
  special_occasions?: string;
}

export interface GuestStayHistory {
  id: string;
  tenant_id?: string;
  hotel_id?: string;
  guest_profile_id: string;
  booking_id?: string;
  room_number?: string;
  room_type?: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
  total_amount?: number;
  source?: string;
  special_requests?: string;
  notes?: string;
  rating?: number;
  review_text?: string;
  created_at: string;
}

export interface GuestCommunication {
  id: string;
  tenant_id?: string;
  hotel_id?: string;
  guest_profile_id: string;
  type: 'email' | 'sms' | 'note' | 'call';
  direction: 'inbound' | 'outbound';
  subject?: string;
  body: string;
  sent_at: string;
  sent_by?: string;
  created_at: string;
}

export type LoyaltyTier = 'standard' | 'silver' | 'gold' | 'platinum';
export type CommType = 'email' | 'sms' | 'note' | 'call';

export const LOYALTY_COLORS: Record<LoyaltyTier, string> = {
  standard: 'bg-gray-100 text-gray-600',
  silver: 'bg-slate-100 text-slate-700',
  gold: 'bg-amber-100 text-amber-700',
  platinum: 'bg-blue-100 text-blue-700',
};

export const LOYALTY_LABELS: Record<LoyaltyTier, string> = {
  standard: 'Standard',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export const COMM_TYPE_ICONS: Record<CommType, string> = {
  email: 'mail',
  sms: 'message-square',
  note: 'file-text',
  call: 'phone',
};

export const COMM_TYPE_COLORS: Record<CommType, string> = {
  email: 'bg-blue-50 text-blue-700',
  sms: 'bg-emerald-50 text-emerald-700',
  note: 'bg-amber-50 text-amber-700',
  call: 'bg-teal-50 text-teal-700',
};
