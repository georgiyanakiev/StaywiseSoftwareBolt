export interface PropertyOwner {
  id: string;
  hotel_id: string;
  tenant_id: string | null;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  bank_iban: string;
  commission_rate: number;
  active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OwnerProperty {
  id: string;
  hotel_id: string;
  tenant_id: string | null;
  owner_id: string;
  room_id: string | null;
  room_number: string;
  ownership_pct: number;
  monthly_expenses: number;
  notes: string;
  created_at: string;
}

export interface OwnerStatement {
  id: string;
  hotel_id: string;
  tenant_id: string | null;
  owner_id: string;
  period_start: string;
  period_end: string;
  gross_revenue: number;
  management_fee: number;
  expenses: number;
  net_payout: number;
  booking_count: number;
  occupancy_rate: number;
  avg_daily_rate: number;
  status: 'draft' | 'sent' | 'paid';
  notes: string;
  created_at: string;
  updated_at: string;
}
