import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, setActiveTenant } from '../lib/supabase';

const SESSION_KEY = 'sw_active_hotel';

export interface ActiveHotel {
  tenant_id: string;
  hotel_name: string;
  subdomain: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  plan: string;
  user_role: string;
}

export interface ActiveHotelContextType {
  activeHotel: ActiveHotel | null;
  setActiveHotel: (hotel: ActiveHotel | null) => void;
  clearActiveHotel: () => void;
  entering: boolean;
}

/**
 * Legacy shape kept for backward-compat with LobbyPage.enter() calls and
 * session-keyed consumers (TopNav, RequireHotel, ForbiddenPage).
 */
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

interface ActiveHotelContextValue extends ActiveHotelContextType {
  session: ActiveHotelSession | null;
  entering: boolean;
  enter: (payload: ActiveHotelSession) => Promise<void>;
  leave: () => void;
}

const ActiveHotelContext = createContext<ActiveHotelContextValue | null>(null);

function toActiveHotel(s: ActiveHotelSession): ActiveHotel {
  return {
    tenant_id: s.tenantId,
    hotel_name: s.hotelName,
    subdomain: s.subdomain,
    logo_url: s.hotelLogo,
    primary_color: s.primaryColor,
    secondary_color: s.secondaryColor,
    plan: s.plan,
    user_role: s.role,
  };
}

function toSession(h: ActiveHotel): ActiveHotelSession {
  return {
    tenantId: h.tenant_id,
    hotelId: '',
    role: h.user_role,
    hotelName: h.hotel_name,
    hotelLogo: h.logo_url,
    primaryColor: h.primary_color,
    secondaryColor: h.secondary_color,
    tenantName: h.hotel_name,
    subdomain: h.subdomain,
    plan: (h.plan as 'starter' | 'pro' | 'enterprise') ?? 'starter',
  };
}

function loadSession(): ActiveHotelSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ActiveHotelSession;
    const tenantParam = new URLSearchParams(window.location.search).get('tenant');
    if (tenantParam && session.subdomain !== tenantParam) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(s: ActiveHotelSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearStoredSession() {
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
  const navigate = useNavigate();
  const [session, setSession] = useState<ActiveHotelSession | null>(loadSession);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (session) {
      setActiveTenant(session.tenantId);
      applyBrandColor(session.primaryColor);
      void supabase.rpc('set_tenant_context', { p_tenant_id: session.tenantId });
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
      window.dispatchEvent(new Event('sw:hotel:entered'));
    } finally {
      setEntering(false);
    }
  }, []);

  const leave = useCallback(() => {
    clearStoredSession();
    setSession(null);
    setActiveTenant(null);
    window.dispatchEvent(new Event('sw:hotel:left'));
  }, []);

  const setActiveHotel = useCallback(async (hotel: ActiveHotel | null) => {
    if (!hotel) {
      leave();
      return;
    }
    const payload = toSession(hotel);
    await enter(payload);
  }, [enter, leave]);

  const clearActiveHotel = useCallback(() => {
    leave();
    navigate('/lobby');
  }, [leave, navigate]);

  const activeHotel = session ? toActiveHotel(session) : null;

  return (
    <ActiveHotelContext.Provider value={{
      activeHotel,
      setActiveHotel,
      clearActiveHotel,
      session,
      entering,
      enter,
      leave,
    }}>
      {children}
    </ActiveHotelContext.Provider>
  );
}

export function useActiveHotel() {
  const ctx = useContext(ActiveHotelContext);
  if (!ctx) throw new Error('useActiveHotel must be used within ActiveHotelProvider');
  return ctx;
}
