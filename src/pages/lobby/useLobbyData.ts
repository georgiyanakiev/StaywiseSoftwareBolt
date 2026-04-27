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

const SUPERADMIN_EMAILS = (import.meta.env.VITE_SUPERADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

function emailLooksLikeSuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return (
    SUPERADMIN_EMAILS.includes(e) ||
    e.endsWith('@staywisesoftware.com') ||
    e === 'staywisesoftware@gmail.com'
  );
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
      const staffResult = await supabase
        .from('staff_members')
        .select('hotel_id, role, approval_status')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .then(r => r, () => ({ data: null, error: null }));

      const assignmentResult = await supabase
        .from('user_hotel_assignments')
        .select('tenant_id, role, active')
        .eq('user_id', user!.id)
        .then(r => r, () => ({ data: null, error: null }));

      if (staffResult.error) {
        console.warn('[lobby] staff_members query failed', staffResult.error);
      }
      if (assignmentResult.error) {
        console.warn('[lobby] user_hotel_assignments query failed', assignmentResult.error);
      }

      const directRoleMap: Record<string, string> = {};
      (staffResult.data ?? [])
        .filter(s => s.approval_status === 'approved' || s.approval_status === 'pending')
        .forEach(s => { directRoleMap[s.hotel_id] = s.role; });
      const directHotelIds = Object.keys(directRoleMap);

      const activeAssignments = (assignmentResult.data ?? []).filter(a => a.active === true || a.active === undefined);
      const isSuperAdminRole =
        emailLooksLikeSuperAdmin(user?.email) ||
        activeAssignments.some(a => a.role === 'super_admin' && !a.tenant_id);

      const tenantRoleMap: Record<string, string> = {};
      activeAssignments
        .filter(a => a.tenant_id && a.role !== 'super_admin')
        .forEach(a => { tenantRoleMap[a.tenant_id as string] = a.role; });
      const assignedTenantIds = Object.keys(tenantRoleMap);

      let hotelRows: any[] = [];

      const runQuery = async (build: (q: any) => any) => {
        const q = build(
          supabase
            .from('hotels')
            .select('id, name, address, city, country, logo_url, star_rating, currency, tenant_id')
            .order('name')
        );
        const { data, error: err } = await q;
        if (err) {
          console.warn('[lobby] hotels query failed', err);
          return [] as any[];
        }
        return data ?? [];
      };

      if (isSuperAdminRole) {
        hotelRows = await runQuery(q => q);
      } else if (directHotelIds.length > 0 && assignedTenantIds.length > 0) {
        hotelRows = await runQuery(q =>
          q.or(`id.in.(${directHotelIds.join(',')}),tenant_id.in.(${assignedTenantIds.join(',')})`)
        );
      } else if (directHotelIds.length > 0) {
        hotelRows = await runQuery(q => q.in('id', directHotelIds));
      } else if (assignedTenantIds.length > 0) {
        hotelRows = await runQuery(q => q.in('tenant_id', assignedTenantIds));
      } else {
        hotelRows = [];
      }

      if (hotelRows.length === 0) {
        setHotels([]);
        setLoading(false);
        return;
      }

      const tenantIds = [...new Set(hotelRows.map(h => h.tenant_id).filter(Boolean) as string[])];
      const tenantMap: Record<string, LobbyHotel['tenant']> = {};

      if (tenantIds.length > 0) {
        try {
          const { data: tenantRows } = await supabase
            .from('tenants')
            .select('id, name, subdomain, primary_color, secondary_color, plan, logo_url')
            .in('id', tenantIds);
          (tenantRows ?? []).forEach(t => { tenantMap[t.id] = t; });
        } catch (e) {
          console.warn('[lobby] tenants query failed', e);
        }
      }

      const today = new Date().toISOString().slice(0, 10);

      const enriched: LobbyHotel[] = await Promise.all(
        hotelRows.map(async hotel => {
          let rawRole = directRoleMap[hotel.id];
          if (!rawRole && hotel.tenant_id) rawRole = tenantRoleMap[hotel.tenant_id];
          if (!rawRole && isSuperAdminRole) rawRole = 'super_admin';

          const safeCount = async (build: () => any): Promise<number> => {
            try {
              const res = await build();
              return res.count ?? 0;
            } catch {
              return 0;
            }
          };

          const [totalRooms, todaysArrivals, occupiedRooms] = await Promise.all([
            safeCount(() => supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('hotel_id', hotel.id)),
            safeCount(() => supabase.from('reservations').select('id', { count: 'exact', head: true })
              .eq('hotel_id', hotel.id)
              .eq('check_in', today)
              .in('status', ['confirmed', 'checked_in'])),
            safeCount(() => supabase.from('rooms').select('id', { count: 'exact', head: true })
              .eq('hotel_id', hotel.id)
              .eq('status', 'occupied')),
          ]);

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
            todays_arrivals: todaysArrivals,
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
      console.error('[lobby] unexpected error', e);
      setHotels([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  return { hotels, loading, error, refetch: fetchLobbyData };
}
