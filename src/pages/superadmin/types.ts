export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  plan: 'starter' | 'pro' | 'enterprise';
  active: boolean;
  owner_email: string | null;
  created_at: string;
  staff_count?: number;
}

export interface TenantFormData {
  name: string;
  subdomain: string;
  owner_email: string;
  plan: 'starter' | 'pro' | 'enterprise';
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  active: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  raw_user_meta_data: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
  hotel_assignment_count: number;
}

export interface HotelAssignment {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  active: boolean;
  assigned_at: string;
}

export type AssignmentRole =
  | 'owner'
  | 'manager'
  | 'front_desk'
  | 'housekeeping'
  | 'accountant'
  | 'readonly';

export const ASSIGNMENT_ROLES: { value: AssignmentRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'readonly', label: 'Read Only' },
];
