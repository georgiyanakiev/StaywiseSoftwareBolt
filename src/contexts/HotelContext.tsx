import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useActiveHotel } from './ActiveHotelContext';
import type { Hotel } from '../types';

interface HotelContextValue {
  hotels: Hotel[];
  currentHotel: Hotel | null;
  setCurrentHotel: (hotel: Hotel) => void;
  loading: boolean;
  refreshHotels: () => Promise<void>;
}

const HotelContext = createContext<HotelContextValue | null>(null);

export function HotelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeHotel } = useActiveHotel();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshHotels = async () => {
    if (!user) {
      setHotels([]);
      setCurrentHotel(null);
      setLoading(false);
      return;
    }

    const targetHotelId = activeHotel?.hotel_id || null;

    if (targetHotelId) {
      const { data } = await supabase.from('hotels').select('*').eq('id', targetHotelId).maybeSingle();
      if (data) {
        const hotel = data as Hotel;
        setHotels([hotel]);
        setCurrentHotel(hotel);
        setLoading(false);
        return;
      }
    }

    try {
      const { data: rpcRows, error: rpcErr } = await supabase.rpc('lobby_get_my_hotels');
      if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
        const hotelList = rpcRows.map((r: any) => ({
          id: r.id, name: r.name, address: r.address, city: r.city,
          country: r.country, logo_url: r.logo_url, star_rating: r.star_rating,
          currency: r.currency, tenant_id: r.tenant_id,
        })) as Hotel[];
        setHotels(hotelList);
        const savedId = localStorage.getItem('staywise_current_hotel');
        const found = savedId ? hotelList.find(h => h.id === savedId) : null;
        setCurrentHotel(found || hotelList[0]);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('[hotelctx] rpc lobby_get_my_hotels failed', e);
    }

    const [staffResult, assignmentResult] = await Promise.all([
      supabase
        .from('staff_members')
        .select('hotel_id, approval_status')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('user_hotel_assignments')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('active', true),
    ]);

    const directHotelIds = (staffResult.data ?? [])
      .filter(s => s.approval_status === 'approved' || s.approval_status === 'pending')
      .map(s => s.hotel_id);

    const isSuperAdmin = (assignmentResult.data ?? [])
      .some(a => a.role === 'super_admin' && !a.tenant_id);

    const assignedTenantIds = (assignmentResult.data ?? [])
      .filter(a => a.tenant_id && a.role !== 'super_admin')
      .map(a => a.tenant_id as string);

    if (!isSuperAdmin && directHotelIds.length === 0 && assignedTenantIds.length === 0) {
      setHotels([]);
      setCurrentHotel(null);
      setLoading(false);
      return;
    }

    let query = supabase.from('hotels').select('*').order('name');

    if (!isSuperAdmin) {
      if (directHotelIds.length > 0 && assignedTenantIds.length > 0) {
        query = query.or(
          `id.in.(${directHotelIds.join(',')}),tenant_id.in.(${assignedTenantIds.join(',')})`
        );
      } else if (directHotelIds.length > 0) {
        query = query.in('id', directHotelIds);
      } else {
        query = query.in('tenant_id', assignedTenantIds);
      }
    }

    const { data } = await query;
    const seen = new Set<string>();
    const hotelList = ((data || []) as Hotel[]).filter(h => {
      if (seen.has(h.id)) return false;
      seen.add(h.id);
      return true;
    });
    setHotels(hotelList);
    if (hotelList.length > 0) {
      const savedId = localStorage.getItem('staywise_current_hotel');
      const found = savedId ? hotelList.find(h => h.id === savedId) : null;
      setCurrentHotel(found || hotelList[0]);
    } else {
      setCurrentHotel(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      refreshHotels();
    } else {
      setHotels([]);
      setCurrentHotel(null);
      setLoading(false);
    }
  }, [user, activeHotel?.hotel_id]);

  const handleSetHotel = (hotel: Hotel) => {
    setCurrentHotel(hotel);
    localStorage.setItem('staywise_current_hotel', hotel.id);
  };

  return (
    <HotelContext.Provider value={{ hotels, currentHotel, setCurrentHotel: handleSetHotel, loading, refreshHotels }}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  const ctx = useContext(HotelContext);
  if (!ctx) throw new Error('useHotel must be used within HotelProvider');
  return ctx;
}
