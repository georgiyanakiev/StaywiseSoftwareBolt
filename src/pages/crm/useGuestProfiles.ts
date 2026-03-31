import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { GuestProfile, GuestStayHistory, GuestCommunication } from './types';

export interface GuestFilters {
  search: string;
  loyaltyTier: string;
  nationality: string;
  lastStayFrom: string;
  lastStayTo: string;
  minStays: string;
  maxStays: string;
  tag: string;
  blacklisted: boolean | null;
}

export const DEFAULT_FILTERS: GuestFilters = {
  search: '',
  loyaltyTier: '',
  nationality: '',
  lastStayFrom: '',
  lastStayTo: '',
  minStays: '',
  maxStays: '',
  tag: '',
  blacklisted: null,
};

export function useGuestProfiles(hotelId: string | undefined) {
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<GuestFilters>(DEFAULT_FILTERS);
  const PAGE_SIZE = 20;

  const fetchGuests = useCallback(async () => {
    if (!hotelId) { setLoading(false); return; }
    setLoading(true);
    try {
      let q = supabase.from('guest_profiles').select('*', { count: 'exact' }).eq('hotel_id', hotelId);
      if (filters.search) {
        q = q.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }
      if (filters.loyaltyTier) q = q.eq('loyalty_tier', filters.loyaltyTier);
      if (filters.nationality) q = q.ilike('nationality', `%${filters.nationality}%`);
      if (filters.lastStayFrom) q = q.gte('last_stay_at', filters.lastStayFrom);
      if (filters.lastStayTo) q = q.lte('last_stay_at', filters.lastStayTo);
      if (filters.minStays) q = q.gte('total_stays', parseInt(filters.minStays));
      if (filters.maxStays) q = q.lte('total_stays', parseInt(filters.maxStays));
      if (filters.tag) q = q.contains('tags', [filters.tag]);
      if (filters.blacklisted !== null) q = q.eq('blacklisted', filters.blacklisted);
      q = q.order('total_spent', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, count, error } = await q;
      if (!error) { setGuests((data || []) as GuestProfile[]); setTotal(count || 0); }
    } finally {
      setLoading(false);
    }
  }, [hotelId, filters, page]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);
  useEffect(() => { setPage(0); }, [filters]);

  return { guests, total, loading, page, setPage, filters, setFilters, fetchGuests, PAGE_SIZE };
}

export async function fetchGuestProfile(id: string): Promise<GuestProfile | null> {
  const { data } = await supabase.from('guest_profiles').select('*').eq('id', id).maybeSingle();
  return data as GuestProfile | null;
}

export async function fetchGuestStays(guestProfileId: string): Promise<GuestStayHistory[]> {
  const { data } = await supabase.from('guest_stay_history').select('*').eq('guest_profile_id', guestProfileId).order('check_in', { ascending: false });
  return (data || []) as GuestStayHistory[];
}

export async function fetchGuestComms(guestProfileId: string): Promise<GuestCommunication[]> {
  const { data } = await supabase.from('guest_communications').select('*').eq('guest_profile_id', guestProfileId).order('sent_at', { ascending: false });
  return (data || []) as GuestCommunication[];
}

export function applyAutoTags(guests: GuestProfile[]): GuestProfile[] {
  return guests.map(g => {
    const newTags = [...(g.tags || [])];
    if (g.total_stays >= 3 && !newTags.includes('Loyal')) newTags.push('Loyal');
    if (g.total_spent >= 1000 && !newTags.includes('High Value')) newTags.push('High Value');
    const lastStay = g.last_stay_at ? new Date(g.last_stay_at) : null;
    const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    if (lastStay && lastStay < twelveMonthsAgo && !newTags.includes('Lapsed')) newTags.push('Lapsed');
    if (g.total_stays === 0 && !newTags.includes('New')) newTags.push('New');
    return { ...g, tags: newTags };
  });
}
