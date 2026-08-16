import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import type { Hotel } from '../../types';

export interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  dirtyRooms: number;
  cleanRooms: number;
  maintenanceRooms: number;
  outOfServiceRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  pendingCheckIns: number;
  pendingCheckOuts: number;
  occupancyRate: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  ytdRevenue: number;
  activeReservations: number;
  statusBreakdown: Record<string, number>;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface ActivityItem {
  id: string;
  type: 'checkin' | 'checkout' | 'booking' | 'cancelled';
  guestName: string;
  roomNumber: string;
  time: string;
  amount?: number;
}

export interface AvailabilityDay {
  date: string;
  label: string;
  dayNum: number;
  available: number;
  occupied: number;
  total: number;
  isPast: boolean;
  isToday: boolean;
}

export interface RoomStatusCount {
  name: string;
  key: string;
  value: number;
  color: string;
}

const ROOM_STATUS_COLORS: Record<string, string> = {
  available: '#10b981',
  occupied: '#2563eb',
  dirty: '#f59e0b',
  clean: '#22c55e',
  maintenance: '#6b7280',
  out_of_service: '#9ca3af',
};

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return isoDate(d);
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  return isoDate(d);
}

function startOfYear() {
  const d = new Date();
  d.setMonth(0, 1);
  return isoDate(d);
}

function paymentDateStr(ts: string): string {
  return ts.slice(0, 10);
}

export function useDashboardData(currentHotel: Hotel | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0, availableRooms: 0, occupiedRooms: 0, dirtyRooms: 0,
    cleanRooms: 0, maintenanceRooms: 0, outOfServiceRooms: 0,
    todayCheckIns: 0, todayCheckOuts: 0,
    pendingCheckIns: 0, pendingCheckOuts: 0, occupancyRate: 0,
    todayRevenue: 0, weekRevenue: 0, monthRevenue: 0, ytdRevenue: 0,
    activeReservations: 0, statusBreakdown: {},
  });
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityDay[]>([]);
  const [roomStatusData, setRoomStatusData] = useState<RoomStatusCount[]>([]);

  useEffect(() => {
    if (currentHotel) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [currentHotel]);

  async function fetchAll() {
    if (!currentHotel) return;
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchStats(), fetchRevenue(), fetchActivity(), fetchAvailability()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    if (!currentHotel) return;
    const today = isoToday();
    const yearStart = startOfYear();

    const [roomsRes, resStatusRes, checkInsRes, checkOutsRes, pendingCIRes, pendingCORes, paymentsRes, upsellRes] = await Promise.all([
      supabase.from('rooms').select('status').eq('hotel_id', currentHotel.id),
      supabase.from('reservations').select('status').eq('hotel_id', currentHotel.id),
      supabase.from('reservations').select('id', { count: 'exact' }).eq('hotel_id', currentHotel.id).eq('check_in', today).eq('status', 'checked_in'),
      supabase.from('reservations').select('id', { count: 'exact' }).eq('hotel_id', currentHotel.id).eq('check_out', today).eq('status', 'checked_out'),
      supabase.from('reservations').select('id', { count: 'exact' }).eq('hotel_id', currentHotel.id).eq('check_in', today).eq('status', 'confirmed'),
      supabase.from('reservations').select('id', { count: 'exact' }).eq('hotel_id', currentHotel.id).eq('check_out', today).eq('status', 'checked_in'),
      supabase.from('payments').select('amount, payment_date').eq('hotel_id', currentHotel.id).gte('payment_date', yearStart),
      supabase.from('upsell_orders').select('total_price, status, ordered_at').eq('hotel_id', currentHotel.id).gte('ordered_at', yearStart),
    ]);

    if (roomsRes.error) throw roomsRes.error;

    const rooms = roomsRes.data || [];
    const totalRooms = rooms.length;

    const KNOWN_STATUSES = ['available', 'occupied', 'dirty', 'clean', 'maintenance', 'out_of_service'];
    const STATUS_NORMALIZE: Record<string, string> = {
      cleaning: 'dirty',
      inspected: 'clean',
      blocked: 'out_of_service',
    };

    const statusCounts: Record<string, number> = {};
    KNOWN_STATUSES.forEach(s => { statusCounts[s] = 0; });
    rooms.forEach(r => {
      const key = STATUS_NORMALIZE[r.status] || (KNOWN_STATUSES.includes(r.status) ? r.status : 'available');
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });

    const occupiedRooms = statusCounts['occupied'];
    const availableRooms = statusCounts['available'];
    const dirtyRooms = statusCounts['dirty'];
    const cleanRooms = statusCounts['clean'];
    const maintenanceRooms = statusCounts['maintenance'];
    const outOfServiceRooms = statusCounts['out_of_service'];
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const statusBreakdown: Record<string, number> = {};
    (resStatusRes.data || []).forEach(r => { statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1; });
    const activeReservations = (statusBreakdown['confirmed'] || 0) + (statusBreakdown['checked_in'] || 0);

    const weekStart = startOfWeek();
    const monthStart = startOfMonth();
    const payments = paymentsRes.data || [];

    const todayRevenue = payments
      .filter(p => paymentDateStr(p.payment_date) === today)
      .reduce((s, p) => s + Number(p.amount), 0);
    const weekRevenue = payments
      .filter(p => paymentDateStr(p.payment_date) >= weekStart && paymentDateStr(p.payment_date) <= today)
      .reduce((s, p) => s + Number(p.amount), 0);
    const monthRevenue = payments
      .filter(p => paymentDateStr(p.payment_date) >= monthStart && paymentDateStr(p.payment_date) <= today)
      .reduce((s, p) => s + Number(p.amount), 0);
    const ytdRevenue = payments.reduce((s, p) => s + Number(p.amount), 0) + (upsellRes.data || []).filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_price || 0), 0);

    setStats({
      totalRooms, availableRooms, occupiedRooms, dirtyRooms, cleanRooms, maintenanceRooms, outOfServiceRooms,
      todayCheckIns: checkInsRes.count || 0,
      todayCheckOuts: checkOutsRes.count || 0,
      pendingCheckIns: pendingCIRes.count || 0,
      pendingCheckOuts: pendingCORes.count || 0,
      occupancyRate, todayRevenue, weekRevenue, monthRevenue, ytdRevenue,
      activeReservations, statusBreakdown,
    });

    setRoomStatusData(
      Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          key,
          name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          value,
          color: ROOM_STATUS_COLORS[key] || '#6b7280',
        }))
    );
  }

  async function fetchRevenue() {
    if (!currentHotel) return;
    const daySlots: { date: string; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daySlots.push({ date: isoDate(d), label: formatDate(d, 'MMM d') });
    }

    const cutoffDate = daySlots[0].date;
    const { data } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('hotel_id', currentHotel.id)
      .gte('payment_date', cutoffDate);

    const revenueMap: Record<string, number> = {};
    daySlots.forEach(s => { revenueMap[s.date] = 0; });

    (data || []).forEach(p => {
      const d = paymentDateStr(p.payment_date);
      if (d in revenueMap) {
        revenueMap[d] += Number(p.amount);
      }
    });

    setRevenueData(daySlots.map(s => ({ date: s.label, revenue: Math.round(revenueMap[s.date]) })));
  }

  async function fetchActivity() {
    if (!currentHotel) return;
    const { data } = await supabase
      .from('reservations')
      .select('id, status, check_in, check_out, total_amount, created_at, confirmation_code, guest:guests(first_name, last_name), room:rooms(number)')
      .eq('hotel_id', currentHotel.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const items: ActivityItem[] = (data || []).map((r: any) => {
      let type: ActivityItem['type'] = 'booking';
      if (r.status === 'checked_in') type = 'checkin';
      else if (r.status === 'checked_out') type = 'checkout';
      else if (r.status === 'cancelled') type = 'cancelled';
      return {
        id: r.id,
        type,
        guestName: r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : 'Unknown Guest',
        roomNumber: r.room?.number || '—',
        time: r.created_at,
        amount: r.total_amount,
      };
    });

    setRecentActivity(items);
  }

  async function fetchAvailability() {
    if (!currentHotel) return;
    const today = new Date();
    const todayStr = isoToday();

    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .eq('hotel_id', currentHotel.id);
    const totalRooms = rooms?.length || 0;

    const days: AvailabilityDay[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = isoDate(d);

      days.push({
        date: dateStr,
        label: formatDate(d, 'EEE'),
        dayNum: d.getDate(),
        available: totalRooms,
        occupied: 0,
        total: totalRooms,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
      });
    }

    const startDate = days[0].date;
    const endDate = days[days.length - 1].date;

    const { data: reservations } = await supabase
      .from('reservations')
      .select('check_in, check_out, status')
      .eq('hotel_id', currentHotel.id)
      .in('status', ['confirmed', 'checked_in'])
      .lte('check_in', endDate)
      .gte('check_out', startDate);

    (reservations || []).forEach(r => {
      days.forEach(day => {
        if (r.check_in <= day.date && r.check_out > day.date) {
          day.occupied++;
          day.available = Math.max(0, day.total - day.occupied);
        }
      });
    });

    setAvailabilityData(days);
  }

  return { loading, error, stats, revenueData, recentActivity, availabilityData, roomStatusData, refresh: fetchAll };
}
