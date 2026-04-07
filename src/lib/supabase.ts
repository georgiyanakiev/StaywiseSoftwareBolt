import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.'
  );
}

const QUERY_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
  const signal = options.signal
    ? (typeof AbortSignal.any === 'function'
        ? AbortSignal.any([options.signal as AbortSignal, controller.signal])
        : controller.signal)
    : controller.signal;
  return fetch(url, { ...options, signal }).finally(() => clearTimeout(timer));
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});

let _activeTenantId: string | null = null;

export function setActiveTenant(tenantId: string | null) {
  _activeTenantId = tenantId;
}

export function getActiveTenantId(): string | null {
  return _activeTenantId;
}
