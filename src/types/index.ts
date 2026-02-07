export interface Hotel {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  star_rating: number;
  check_in_time: string;
  check_out_time: string;
  logo_url: string;
  cover_image_url: string;
  currency: string;
  timezone: string;
  tax_rate: number;
  cancellation_policy: string;
  created_at: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  hotel_id: string;
  name: string;
  description: string;
  base_rate: number;
  max_occupancy: number;
  bed_type: string;
  amenities: string[];
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  hotel_id: string;
  room_type_id: string;
  number: string;
  floor: number;
  status: 'available' | 'occupied' | 'dirty' | 'clean' | 'maintenance' | 'out_of_service';
  rate_override: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
  room_type?: RoomType;
}

export interface Guest {
  id: string;
  hotel_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  id_number: string;
  nationality: string;
  date_of_birth: string | null;
  vip_status: 'regular' | 'silver' | 'gold' | 'platinum';
  notes: string;
  preferences: Record<string, unknown>;
  total_stays: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  hotel_id: string;
  guest_id: string;
  room_id: string | null;
  room_type_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  base_rate: number;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_status: 'paid' | 'partial' | 'pending';
  amount_paid: number;
  payment_method: string;
  booking_source: string;
  special_requests: string;
  cancellation_reason: string;
  confirmation_code: string;
  created_at: string;
  updated_at: string;
  guest?: Guest;
  room?: Room;
  room_type?: RoomType;
}

export interface Invoice {
  id: string;
  hotel_id: string;
  reservation_id: string | null;
  guest_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes: string;
  created_at: string;
  updated_at: string;
  guest?: Guest;
  reservation?: Reservation;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface HousekeepingTask {
  id: string;
  hotel_id: string;
  room_id: string;
  task_type: 'clean' | 'deep_clean' | 'linen_change' | 'restock' | 'inspection';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
  notes: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  room?: Room;
}

export interface MaintenanceRequest {
  id: string;
  hotel_id: string;
  room_id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'reported' | 'in_progress' | 'completed';
  assigned_to: string;
  cost: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  room?: Room;
}

export interface StaffMember {
  id: string;
  hotel_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'receptionist' | 'housekeeping';
  is_active: boolean;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: string;
  hotel_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
