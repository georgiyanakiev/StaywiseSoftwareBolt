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

function normalizeRole(role: string): LobbyHotel['staff_role'] {
  return ROLE_MAP[role] ?? 'receptionist';
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
      const [staffResult, assignmentResult] = await Promise.all([
        supabase
          .from('staff_members')
          .select('hotel_id, role, approval_status')
          .eq('user_id', user!.id)
          .eq('is_active', true),
        supabase
          .from('user_hotel_assignments')
          .select('tenant_id, role')
          .eq('user_id', user!.id)
          .eq('active', true),
      ]);

      if (staffResult.error) throw staffResult.error;

      // PRIMARY SOURCE OF TRUTH: Direct hotel assignments from staff_members
      // Only approved or pending staff can see their hotel
      const directRoleMap: Record<string, string> = {};
      (staffResult.data ?? [])
        .filter(s => s.approval_status === 'approved' || s.approval_status === 'pending')
        .forEach(s => { directRoleMap[s.hotel_id] = s.role; });
      const directHotelIds = Object.keys(directRoleMap);

      // SECONDARY: Check if user is a global super admin (no tenant_id)
      const isSuperAdminRole = (assignmentResult.data ?? [])
        .some(a => a.role === 'super_admin' && !a.tenant_id);

      // Tenant-level assignments only count for tenant-specific access (when staff has no direct hotel)
      const tenantRoleMap: Record<string, string> = {};
      (assignmentResult.data ?? [])
        .filter(a => a.tenant_id && a.role !== 'super_admin')
        .forEach(a => { tenantRoleMap[a.tenant_id] = a.role; });
      const assignedTenantIds = Object.keys(tenantRoleMap);

      // If not super admin and has no assignments at all, show empty
      if (!isSuperAdminRole && directHotelIds.length === 0 && assignedTenantIds.length === 0) {
        setHotels([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('hotels')
        .select('id, name, address, city, country, logo_url, star_rating, currency, tenant_id')
        .order('name');

      if (!isSuperAdminRole) {
        // Non-super-admins see only their assigned hotels
        if (directHotelIds.length > 0 && assignedTenantIds.length > 0) {
          // Has both direct and tenant assignments - show both
          query = query.or(
            `id.in.(${directHotelIds.join(',')}),tenant_id.in.(${assignedTenantIds.join(',')})`
          );
        } else if (directHotelIds.length > 0) {
          // Only direct hotel assignments
          query = query.in('id', directHotelIds);
        } else if (assignedTenantIds.length > 0) {
          // Only tenant-level assignments
          query = query.in('tenant_id', assignedTenantIds);
        }
      }

      const { data: hotelRows, error: hotelErr } = await query;
      if (hotelErr) throw hotelErr;

      if (!hotelRows || hotelRows.length === 0) {
        setHotels([]);
        setLoading(false);
        return;
      }

      const tenantIds = [...new Set(hotelRows.map(h => h.tenant_id).filter(Boolean) as string[])];
      let tenantMap: Record<string, LobbyHotel['tenant']> = {};

      if (tenantIds.length > 0) {
        const { data: tenantRows } = await supabase
          .from('tenants')
          .select('id, name, subdomain, primary_color, secondary_color, plan, logo_url')
          .in('id', tenantIds);
        (tenantRows ?? []).forEach(t => { tenantMap[t.id] = t; });
      }

      const today = new Date().toISOString().slice(0, 10);

      const enriched: LobbyHotel[] = await Promise.all(
        hotelRows.map(async hotel => {
          let rawRole = directRoleMap[hotel.id];
          if (!rawRole && hotel.tenant_id) rawRole = tenantRoleMap[hotel.tenant_id];
          if (!rawRole && isSuperAdminRole) rawRole = 'super_admin';

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
            staff_role: normalizeRole(rawRole ?? 'receptionist'),
            rooms_count: totalRooms,
            todays_arrivals: arrivalsRes.count ?? 0,
            occupancy_pct: occupancyPct,
          };
        })
      );

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
