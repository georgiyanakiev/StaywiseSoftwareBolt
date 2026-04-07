import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let _activeTenantId: string | null = null;

export function setActiveTenant(tenantId: string | null) {
  _activeTenantId = tenantId;
}

export function getActiveTenantId(): string | null {
  return _activeTenantId;
}
