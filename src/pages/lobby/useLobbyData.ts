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
      const { data: staffRows, error: staffErr } = await supabase
        .from('staff_members')
        .select('hotel_id, role')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      if (staffErr) throw staffErr;
      if (!staffRows || staffRows.length === 0) {
        setHotels([]);
        setLoading(false);
        return;
      }

      const hotelIds = staffRows.map(s => s.hotel_id);
      const roleMap: Record<string, string> = {};
      staffRows.forEach(s => { roleMap[s.hotel_id] = s.role; });

      const { data: hotelRows, error: hotelErr } = await supabase
        .from('hotels')
        .select('id, name, address, city, country, logo_url, star_rating, currency, tenant_id')
        .in('id', hotelIds)
        .order('name');

      if (hotelErr) throw hotelErr;

      const tenantIds = [...new Set((hotelRows || []).map(h => h.tenant_id).filter(Boolean))];
      let tenantMap: Record<string, LobbyHotel['tenant']> = {};

      if (tenantIds.length > 0) {
        const { data: tenantRows } = await supabase
          .from('tenants')
          .select('id, name, subdomain, primary_color, secondary_color, plan, logo_url')
          .in('id', tenantIds);
        (tenantRows || []).forEach(t => { tenantMap[t.id] = t; });
      }

      const today = new Date().toISOString().slice(0, 10);

      const enriched: LobbyHotel[] = await Promise.all(
        (hotelRows || []).map(async hotel => {
          const [roomsRes, arrivalsRes, occupiedRes] = await Promise.all([
            supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('hotel_id', hotel.id),
            supabase.from('reservations').select('id', { count: 'exact', head: true })
              .eq('hotel_id', hotel.id)
              .eq('check_in', today)
              .in('status', ['confirmed', 'checked_in']),
            supabase.from('rooms').select('id', { count: 'exact', head: true })
              .eq('hotel_id', hotel.id)
              .eq('status', 'occupied'),
          ]);

          const totalRooms = roomsRes.count ?? 0;
          const occupiedRooms = occupiedRes.count ?? 0;
          const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

          return {
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
            staff_role: (roleMap[hotel.id] as LobbyHotel['staff_role']) ?? 'receptionist',
            rooms_count: totalRooms,
            todays_arrivals: arrivalsRes.count ?? 0,
            occupancy_pct: occupancyPct,
          };
        })
      );

      setHotels(enriched);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load hotels');
    } finally {
      setLoading(false);
    }
  }

  return { hotels, loading, error, refetch: fetchLobbyData };
}
