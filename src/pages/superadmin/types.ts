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
