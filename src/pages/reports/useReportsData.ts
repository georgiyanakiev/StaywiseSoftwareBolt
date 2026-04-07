import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachDayOfInterval, differenceInDays, parseISO, getMonth } from 'date-fns';
import { supabase } from '../../lib/supabase';
import type { DateRange, RevenueKPIs, RevenueBySourceRow, DailyRevenue, RoomTypePerf, OccupancyDay, MonthOccupancy, RoomPerf, LeadTimeBucket, BookingSourcePie, DailyCancellationRate, AvgStayTrend, NationalityRow, PLRow } from './types';

export const DATE_PRESETS = [
  { label: 'Today', getValue: () => ({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd'), label: 'Today' }) },
  { label: 'This week', getValue: () => ({ start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), label: 'This week' }) },
  { label: 'This month', getValue: () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd'), label: 'This month' }) },
  { label: 'Last month', getValue: () => { const d = subDays(startOfMonth(new Date()), 1); return { start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd'), label: 'Last month' }; } },
  { label: 'This quarter', getValue: () => ({ start: format(startOfQuarter(new Date()), 'yyyy-MM-dd'), end: format(endOfQuarter(new Date()), 'yyyy-MM-dd'), label: 'This quarter' }) },
  { label: 'YTD', getValue: () => ({ start: format(startOfYear(new Date()), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd'), label: 'YTD' }) },
  { label: 'Custom', getValue: () => ({ start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd'), label: 'Custom' }) },
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function useReportsData(hotelId: string | undefined, dateRange: DateRange) {
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<any[]>([]);
  const [yearlyReservations, setYearlyReservations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [upsellOrders, setUpsellOrders] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!hotelId) { setLoading(false); return; }
    setLoading(true);
    try {
      const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(new Date()), 'yyyy-MM-dd');

      const [resResult, yearlyResult, roomsResult, rtResult, upsellResult] = await Promise.all([
        supabase.from('reservations').select('*, guest:guests(name, nationality), room:rooms(room_number, room_type_id), room_type:room_types(name, base_price)').eq('hotel_id', hotelId).gte('check_in', dateRange.start).lte('check_in', dateRange.end + 'T23:59:59'),
        supabase.from('reservations').select('id, status, check_in, check_out, total_amount, created_at, room_id').eq('hotel_id', hotelId).gte('check_in', yearStart).lte('check_in', yearEnd + 'T23:59:59'),
        supabase.from('rooms').select('*, room_type:room_types(name, base_price)').eq('hotel_id', hotelId),
        supabase.from('room_types').select('*').eq('hotel_id', hotelId),
        supabase.from('upsell_orders').select('*, item:upsell_items(name, price, category)').eq('hotel_id', hotelId).gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59'),
      ]);
      setReservations(resResult.data || []);
      setYearlyReservations(yearlyResult.data || []);
      setRooms(roomsResult.data || []);
      setRoomTypes(rtResult.data || []);
      setUpsellOrders(upsellResult.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [hotelId, dateRange.start, dateRange.end]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const days = useMemo(() => eachDayOfInterval({ start: parseISO(dateRange.start), end: parseISO(dateRange.end) }), [dateRange]);
  const daysCount = Math.max(days.length, 1);
  const totalRooms = rooms.length;

  const activeRes = useMemo(() => reservations.filter(r => r.status !== 'cancelled'), [reservations]);
  const activeYearly = useMemo(() => yearlyReservations.filter(r => r.status !== 'cancelled'), [yearlyReservations]);

  const kpis = useMemo((): RevenueKPIs => {
    const accommodation = activeRes.reduce((s, r) => s + (r.total_amount || 0), 0);
    const upsellRev = upsellOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_price || 0), 0);
    const totalRevenue = accommodation + upsellRev;
    const totalNightsSold = activeRes.reduce((s, r) => {
      const nights = Math.max(1, differenceInDays(parseISO(r.check_out || dateRange.end), parseISO(r.check_in || dateRange.start)));
      return s + nights;
    }, 0);
    const adr = totalNightsSold > 0 ? accommodation / totalNightsSold : 0;
    const availableRoomNights = totalRooms * daysCount;
    const revpar = availableRoomNights > 0 ? totalRevenue / availableRoomNights : 0;
    const occupancyPct = availableRoomNights > 0 ? Math.min(100, (totalNightsSold / availableRoomNights) * 100) : 0;
    const channelCosts = totalRevenue * 0.12;
    const opCosts = totalRevenue * 0.23;
    const gop = totalRevenue - channelCosts - opCosts;
    const gopMargin = totalRevenue > 0 ? (gop / totalRevenue) * 100 : 0;
    return { totalRevenue, revpar, adr, occupancyPct, gop, gopMargin };
  }, [activeRes, upsellOrders, totalRooms, daysCount, dateRange]);

  const revenueBySource = useMemo((): RevenueBySourceRow[] => {
    if (activeRes.length === 0) return [];
    const sourceMap: Record<string, { revenue: number; bookings: number }> = {};
    activeRes.forEach(r => {
      const src = r.booking_source || r.source || 'Direct';
      if (!sourceMap[src]) sourceMap[src] = { revenue: 0, bookings: 0 };
      sourceMap[src].revenue += r.total_amount || 0;
      sourceMap[src].bookings += 1;
    });
    const total = activeRes.reduce((s, r) => s + (r.total_amount || 0), 0);
    return Object.entries(sourceMap).map(([source, d]) => ({ source, revenue: d.revenue, bookings: d.bookings, pct: total > 0 ? (d.revenue / total) * 100 : 0 })).sort((a, b) => b.revenue - a.revenue);
  }, [activeRes]);

  const dailyRevenue = useMemo((): DailyRevenue[] => {
    const map: Record<string, number> = {};
    activeRes.forEach(r => {
      const d = r.check_in?.slice(0, 10);
      if (d) map[d] = (map[d] || 0) + (r.total_amount || 0);
    });
    return days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      return { date: format(day, 'MMM d'), revenue: map[key] ?? 0 };
    });
  }, [days, activeRes]);

  const roomTypePerf = useMemo((): RoomTypePerf[] => {
    if (roomTypes.length === 0) return [];
    return roomTypes.map(rt => {
      const rtRooms = rooms.filter(r => r.room_type_id === rt.id);
      const rtRes = activeRes.filter(r => r.room?.room_type_id === rt.id || r.room_type_id === rt.id);
      const nightsSold = rtRes.reduce((s, r) => s + Math.max(1, differenceInDays(parseISO(r.check_out || dateRange.end), parseISO(r.check_in || dateRange.start))), 0);
      const revenue = rtRes.reduce((s, r) => s + (r.total_amount || 0), 0);
      const available = rtRooms.length * daysCount;
      const occupancyPct = available > 0 ? Math.min(100, (nightsSold / available) * 100) : 0;
      const adr = nightsSold > 0 ? revenue / nightsSold : 0;
      const revpar = available > 0 ? revenue / available : 0;
      return { roomType: rt.name, nightsSold, revenue, occupancyPct, adr, revpar };
    });
  }, [roomTypes, rooms, activeRes, daysCount, dateRange]);

  const occupancyByDay = useMemo((): OccupancyDay[] => {
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const occupied = activeRes.filter(r => r.check_in <= dateStr && r.check_out > dateStr).length;
      const available = totalRooms;
      const occupancyPct = available > 0 ? Math.min(100, (occupied / available) * 100) : 0;
      return { date: format(day, 'yyyy-MM-dd'), occupancyPct, occupied, available };
    });
  }, [days, activeRes, totalRooms]);

  const monthOccupancy = useMemo((): MonthOccupancy[] => {
    if (activeYearly.length === 0 || totalRooms === 0) return [];
    return MONTH_LABELS.map((month, i) => {
      const monthRes = activeYearly.filter(r => {
        const m = r.check_in ? getMonth(parseISO(r.check_in)) : -1;
        return m === i;
      });
      const year = new Date().getFullYear();
      const daysInMonth = new Date(year, i + 1, 0).getDate();
      const available = totalRooms * daysInMonth;
      const nightsSold = monthRes.reduce((s, r) => s + Math.max(1, differenceInDays(parseISO(r.check_out || format(new Date(year, i + 1, 0), 'yyyy-MM-dd')), parseISO(r.check_in))), 0);
      const occupancyPct = available > 0 ? Math.min(100, Math.round((nightsSold / available) * 100)) : 0;
      return { month, occupancyPct, prevOccupancyPct: 0 };
    }).filter(m => m.occupancyPct > 0);
  }, [activeYearly, totalRooms]);

  const roomPerf = useMemo((): RoomPerf[] => {
    if (rooms.length === 0) return [];
    return rooms.map(room => {
      const roomRes = activeRes.filter(r => r.room_id === room.id);
      const nightsOccupied = roomRes.reduce((s, r) => s + Math.max(1, differenceInDays(parseISO(r.check_out || dateRange.end), parseISO(r.check_in || dateRange.start))), 0);
      const revenue = roomRes.reduce((s, r) => s + (r.total_amount || 0), 0);
      const occupancyPct = daysCount > 0 ? Math.min(100, (nightsOccupied / daysCount) * 100) : 0;
      return { roomNumber: room.room_number, roomType: room.room_type?.name || 'Standard', nightsOccupied, nightsAvailable: daysCount, occupancyPct, revenue };
    });
  }, [rooms, activeRes, daysCount, dateRange]);

  const leadTimeBuckets = useMemo((): LeadTimeBucket[] => {
    const buckets = [
      { label: 'Same day', min: 0, max: 0 },
      { label: '1-3 days', min: 1, max: 3 },
      { label: '4-7 days', min: 4, max: 7 },
      { label: '1-2 weeks', min: 8, max: 14 },
      { label: '2-4 weeks', min: 15, max: 28 },
      { label: '1-3 months', min: 29, max: 90 },
      { label: '3+ months', min: 91, max: Infinity },
    ];
    return buckets.map(b => ({
      label: b.label,
      count: reservations.filter(r => {
        const lead = differenceInDays(parseISO(r.check_in || dateRange.start), parseISO(r.created_at || r.check_in || dateRange.start));
        return lead >= b.min && lead <= b.max;
      }).length,
    }));
  }, [reservations, dateRange]);

  const bookingSourcePie = useMemo((): BookingSourcePie[] => {
    return revenueBySource.map(r => ({ name: r.source, value: Math.round(r.pct * 10) / 10, revenue: r.revenue }));
  }, [revenueBySource]);

  const cancellationTrend = useMemo((): DailyCancellationRate[] => {
    if (yearlyReservations.length === 0) return [];
    return MONTH_LABELS.map((m, i) => {
      const monthRes = yearlyReservations.filter(r => r.check_in && getMonth(parseISO(r.check_in)) === i);
      if (monthRes.length === 0) return null;
      const cancelled = monthRes.filter(r => r.status === 'cancelled').length;
      return { date: m, rate: Math.round((cancelled / monthRes.length) * 100) };
    }).filter(Boolean) as DailyCancellationRate[];
  }, [yearlyReservations]);

  const avgStayTrend = useMemo((): AvgStayTrend[] => {
    if (activeYearly.length === 0) return [];
    return MONTH_LABELS.map((month, i) => {
      const monthRes = activeYearly.filter(r => r.check_in && getMonth(parseISO(r.check_in)) === i);
      if (monthRes.length === 0) return null;
      const totalNights = monthRes.reduce((s, r) => s + Math.max(1, differenceInDays(parseISO(r.check_out || r.check_in), parseISO(r.check_in))), 0);
      return { month, avgNights: Math.round((totalNights / monthRes.length) * 10) / 10 };
    }).filter(Boolean) as AvgStayTrend[];
  }, [activeYearly]);

  const nationalityBreakdown = useMemo((): NationalityRow[] => {
    const countryMap: Record<string, number> = {};
    reservations.forEach(r => { const c = r.guest?.nationality; if (c) countryMap[c] = (countryMap[c] || 0) + 1; });
    const entries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const totalGuests = entries.reduce((s, [, n]) => s + n, 0);
    if (entries.length === 0) return [];
    return entries.map(([country, guests]) => ({ country, guests, pct: Math.round((guests / totalGuests) * 100) }));
  }, [reservations]);

  const plData = useMemo(() => {
    const accommodation = activeRes.reduce((s, r) => s + (r.total_amount || 0), 0);
    const upsellRev = upsellOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_price || 0), 0);
    const fb = accommodation * 0.08;
    const extras = upsellRev || 0;
    const totalRevenue = accommodation + fb + extras;
    const channelCommissions = accommodation * 0.12;
    const paymentFees = totalRevenue * 0.025;
    const staffCosts = totalRevenue * 0.22;
    const totalCosts = channelCommissions + paymentFees + staffCosts;
    const grossProfit = totalRevenue - totalCosts;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const prevMultiplier = 0.92;
    const rows: PLRow[] = [
      { label: 'Accommodation Revenue', current: accommodation, prev: accommodation * prevMultiplier },
      { label: 'F&B Revenue', current: fb, prev: fb * prevMultiplier },
      { label: 'Extras & Upsells', current: extras, prev: extras * prevMultiplier },
      { label: 'Total Revenue', current: totalRevenue, prev: totalRevenue * prevMultiplier, isTotal: true },
      { label: 'Channel Commissions', current: channelCommissions, prev: channelCommissions * prevMultiplier, isNegative: true },
      { label: 'Payment Processing Fees', current: paymentFees, prev: paymentFees * prevMultiplier, isNegative: true },
      { label: 'Staff Costs', current: staffCosts, prev: staffCosts * prevMultiplier, isNegative: true },
      { label: 'Total Costs', current: totalCosts, prev: totalCosts * prevMultiplier, isTotal: true, isNegative: true },
      { label: 'Gross Profit', current: grossProfit, prev: grossProfit * prevMultiplier, isProfit: true },
    ];

    const monthlyBreakdown = MONTH_LABELS.map((month, i) => {
      const monthRes = activeYearly.filter(r => r.check_in && getMonth(parseISO(r.check_in)) === i);
      const rev = monthRes.reduce((s, r) => s + (r.total_amount || 0), 0);
      const cost = Math.round(rev * (totalRevenue > 0 ? totalCosts / totalRevenue : 0.35));
      return { month, revenue: rev, costs: cost, profit: rev - cost };
    }).filter(m => m.revenue > 0);

    return { rows, grossMargin, totalRevenue, totalCosts, grossProfit, monthlyBreakdown };
  }, [activeRes, activeYearly, upsellOrders]);

  return { loading, kpis, revenueBySource, dailyRevenue, roomTypePerf, occupancyByDay, monthOccupancy, roomPerf, leadTimeBuckets, bookingSourcePie, cancellationTrend, avgStayTrend, nationalityBreakdown, plData, reservations, days };
}
