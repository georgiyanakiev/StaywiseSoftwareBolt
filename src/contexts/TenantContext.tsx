import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, setActiveTenant } from '../lib/supabase';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  active: boolean;
  owner_email: string | null;
  created_at: string;
}

interface TenantContextValue {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  subdomain: string | null;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export type TenantLookup =
  | { type: 'subdomain'; value: string }
  | { type: 'custom_domain'; value: string }
  | { type: 'none' };

function detectTenantLookup(): TenantLookup {
  const hostname = window.location.hostname;
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('tenant');

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { type: 'subdomain', value: tenantParam || 'demo' };
  }

  if (hostname.match(/\.bolt\.new$/) || hostname.match(/\.webcontainer-api\.io$/)) {
    if (tenantParam) {
      return { type: 'subdomain', value: tenantParam };
    }
    return { type: 'none' };
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return { type: 'subdomain', value: parts[0] };
  }

  if (tenantParam) {
    return { type: 'subdomain', value: tenantParam };
  }

  return { type: 'custom_domain', value: hostname };
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lookup = detectTenantLookup();
  const subdomain = lookup.type === 'subdomain' ? lookup.value : null;

  useEffect(() => {
    if (lookup.type === 'none') {
      setLoading(false);
      return;
    }

    const fetchTenant = async () => {
      setLoading(true);
      setError(null);

      let query = supabase.from('tenants').select('*').eq('active', true);

      if (lookup.type === 'subdomain') {
        query = query.eq('subdomain', lookup.value);
      } else {
        query = query.eq('custom_domain', lookup.value);
      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) {
        setError('Failed to load tenant configuration.');
        setLoading(false);
        return;
      }

      if (!data) {
        setError(`No active account found for "${subdomain}".`);
        setLoading(false);
        return;
      }

      await supabase.rpc('set_tenant_context', { p_tenant_id: (data as Tenant).id });

      setTenant(data as Tenant);
      setActiveTenant((data as Tenant).id);
      applyTenantBranding(data as Tenant);
      setLoading(false);
    };

    fetchTenant();
  }, [lookup.type, lookup.type !== 'none' ? lookup.value : '']);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, subdomain }}>
      {children}
    </TenantContext.Provider>
  );
}

function applyTenantBranding(tenant: Tenant) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', tenant.primary_color);
  root.style.setProperty('--color-secondary', tenant.secondary_color);

  const existing = document.getElementById('tenant-favicon');
  if (tenant.logo_url && !existing) {
    const link = document.createElement('link');
    link.id = 'tenant-favicon';
    link.rel = 'icon';
    link.href = tenant.logo_url;
    document.head.appendChild(link);
  }

  document.title = `${tenant.name} — StayWise`;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
