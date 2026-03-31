import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, setActiveTenant } from '../lib/supabase';

const SESSION_KEY = 'sw_active_hotel';

export interface ActiveHotelSession {
  tenantId: string;
  hotelId: string;
  role: string;
  hotelName: string;
  hotelLogo: string | null;
  primaryColor: string;
  secondaryColor: string;
  tenantName: string;
  subdomain: string;
  plan: 'starter' | 'pro' | 'enterprise';
}

interface ActiveHotelContextValue {
  session: ActiveHotelSession | null;
  entering: boolean;
  enter: (payload: ActiveHotelSession) => Promise<void>;
  leave: () => void;
}

const ActiveHotelContext = createContext<ActiveHotelContextValue | null>(null);

function loadSession(): ActiveHotelSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ActiveHotelSession) : null;
  } catch {
    return null;
  }
}

function saveSession(s: ActiveHotelSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function applyBrandColor(primaryColor: string) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', primaryColor);
  root.style.setProperty('--brand-primary', primaryColor);

  const hex = primaryColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  root.style.setProperty('--brand-primary-r', String(r));
  root.style.setProperty('--brand-primary-g', String(g));
  root.style.setProperty('--brand-primary-b', String(b));

  root.style.setProperty('--brand-50', `rgba(${r}, ${g}, ${b}, 0.06)`);
  root.style.setProperty('--brand-100', `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--brand-600', primaryColor);
  root.style.setProperty('--brand-700', primaryColor);
}

export function ActiveHotelProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveHotelSession | null>(loadSession);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (session) {
      setActiveTenant(session.tenantId);
      applyBrandColor(session.primaryColor);
      supabase.rpc('set_tenant_context', { p_tenant_id: session.tenantId }).catch(() => {});
    }
  }, []);

  const enter = useCallback(async (payload: ActiveHotelSession) => {
    setEntering(true);
    try {
      await supabase.rpc('set_tenant_context', { p_tenant_id: payload.tenantId });
      setActiveTenant(payload.tenantId);
      applyBrandColor(payload.primaryColor);
      saveSession(payload);
      setSession(payload);
    } finally {
      setEntering(false);
    }
  }, []);

  const leave = useCallback(() => {
    clearSession();
    setSession(null);
    setActiveTenant(null);
  }, []);

  return (
    <ActiveHotelContext.Provider value={{ session, entering, enter, leave }}>
      {children}
    </ActiveHotelContext.Provider>
  );
}

export function useActiveHotel() {
  const ctx = useContext(ActiveHotelContext);
  if (!ctx) throw new Error('useActiveHotel must be used within ActiveHotelProvider');
  return ctx;
}
