import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let _activeTenantId: string | null = null;

export function setActiveTenant(tenantId: string | null) {
  _activeTenantId = tenantId;
}

export function getActiveTenantId(): string | null {
  return _activeTenantId;
}
