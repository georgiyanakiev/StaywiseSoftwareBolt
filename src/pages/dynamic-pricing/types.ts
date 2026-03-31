export interface PricingRule {
  id: string;
  hotel_id: string;
  tenant_id: string | null;
  name: string;
  type: 'base_rate' | 'seasonal' | 'event' | 'occupancy' | 'last_minute' | 'early_bird' | 'day_of_week';
  room_type_id: string | null;
  date_from: string | null;
  date_to: string | null;
  days_of_week: number[];
  occupancy_threshold_pct: number | null;
  days_before_arrival: number | null;
  adjustment_type: 'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease' | 'set_rate';
  adjustment_value: number;
  min_rate: number | null;
  max_rate: number | null;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIPriceSuggestion {
  id: string;
  hotel_id: string;
  tenant_id: string | null;
  room_type_id: string;
  date: string;
  current_rate: number;
  suggested_rate: number;
  confidence_score: number;
  reasoning: string;
  factors: {
    demand?: string;
    competition?: string;
    day_type?: string;
  };
  applied: boolean;
  applied_at: string | null;
  created_at: string;
}

export interface RoomTypeRate {
  id: string;
  name: string;
  base_rate: number;
}

export interface OccupancyDay {
  date: string;
  occupied: number;
  total: number;
  pct: number;
}
