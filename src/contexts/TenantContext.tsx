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
  plan: 'starter' | 'pro' | 'enterprise';
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

function detectSubdomain(): string | null {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const params = new URLSearchParams(window.location.search);
    const tenantParam = params.get('tenant');
    if (tenantParam) return tenantParam;
    return 'demo';
  }

  const boltPreviewMatch = hostname.match(/^([^.]+)\.bolt\.new$/);
  if (boltPreviewMatch) return null;

  const webcontainerMatch = hostname.match(/^([^.]+)\.webcontainer-api\.io$/);
  if (webcontainerMatch) return null;

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subdomain = detectSubdomain();

  useEffect(() => {
    if (!subdomain) {
      setLoading(false);
      return;
    }

    const fetchTenant = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', subdomain)
        .eq('active', true)
        .maybeSingle();

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

      setTenant(data as Tenant);
      setActiveTenant((data as Tenant).id);
      applyTenantBranding(data as Tenant);
      setLoading(false);
    };

    fetchTenant();
  }, [subdomain]);

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
