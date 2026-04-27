import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface LobbyHotel {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  logo_url: string | null;
  star_rating: number;
  currency: string;
  tenant_id: string | null;
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    primary_color: string;
    secondary_color: string;
    plan: 'starter' | 'pro' | 'enterprise';
    logo_url: string | null;
  } | null;
  staff_role: 'admin' | 'manager' | 'receptionist' | 'housekeeping';
  rooms_count: number;
  todays_arrivals: number;
  occupancy_pct: number;
}

const ROLE_MAP: Record<string, LobbyHotel['staff_role']> = {
  super_admin: 'admin',
  owner: 'admin',
  manager: 'manager',
  front_desk: 'receptionist',
  receptionist: 'receptionist',
  housekeeping: 'housekeeping',
  accountant: 'manager',
  readonly: 'receptionist',
  admin: 'admin',
};

function normalizeRole(role: string | null | undefined): LobbyHotel['staff_role'] {
  return ROLE_MAP[role ?? ''] ?? 'receptionist';
}

export function useLobbyData() {
  const { user } = useAuth();
  const [hotels, setHotels] = useState<LobbyHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchLobbyData();
  }, [user]);

  async function fetchLobbyData() {
    setLoading(true);
    setError(null);

    try {
      const { data: rpcRows, error: rpcErr } = await supabase.rpc('lobby_get_my_hotels');
      if (rpcErr) throw rpcErr;

      const hotelRows = (rpcRows ?? []) as Array<{
        id: string;
        name: string;
        address: string;
        city: string;
        country: string;
        logo_url: string | null;
        star_rating: number;
        currency: string;
        tenant_id: string | null;
        user_role: string | null;
        rooms_count: number | null;
        todays_arrivals: number | null;
        occupancy_pct: number | null;
      }>;

      if (hotelRows.length === 0) {
        setHotels([]);
        setLoading(false);
        return;
      }

      const tenantIds = [...new Set(hotelRows.map(h => h.tenant_id).filter(Boolean) as string[])];
      const tenantMap: Record<string, LobbyHotel['tenant']> = {};

      if (tenantIds.length > 0) {
        const { data: tenantRows } = await supabase
          .from('tenants')
          .select('id, name, subdomain, primary_color, secondary_color, plan, logo_url')
          .in('id', tenantIds);
        (tenantRows ?? []).forEach(t => { tenantMap[t.id] = t; });
      }

      const enriched: LobbyHotel[] = hotelRows.map(hotel => ({
        id: hotel.id,
        name: hotel.name,
        address: hotel.address,
        city: hotel.city,
        country: hotel.country,
        logo_url: hotel.logo_url,
        star_rating: hotel.star_rating,
        currency: hotel.currency,
        tenant_id: hotel.tenant_id,
        tenant: hotel.tenant_id ? (tenantMap[hotel.tenant_id] ?? null) : null,
        staff_role: normalizeRole(hotel.user_role),
        rooms_count: hotel.rooms_count ?? 0,
        todays_arrivals: hotel.todays_arrivals ?? 0,
        occupancy_pct: hotel.occupancy_pct ?? 0,
      }));

      const seen = new Set<string>();
      const deduped = enriched.filter(h => {
        if (seen.has(h.id)) return false;
        seen.add(h.id);
        return true;
      });

      setHotels(deduped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load hotels');
    } finally {
      setLoading(false);
    }
  }

  return { hotels, loading, error, refetch: fetchLobbyData };
}
