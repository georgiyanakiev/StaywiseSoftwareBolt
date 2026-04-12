import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isToday, addMonths } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { formatDate, formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface OccupancyData {
  date: string;
  occupied: number;
  total: number;
  pct: number;
}

interface Reservation {
  id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  total_amount: number;
  status: string;
  guest?: { first_name: string; last_name: string } | null;
}

interface DayDetail {
  date: string;
  reservations: Reservation[];
  occupied: number;
  total: number;
  revenue: number;
}

function occColor(pct: number): string {
  if (pct >= 90) return 'bg-emerald-600 text-white';
  if (pct >= 75) return 'bg-emerald-400 text-white';
  if (pct >= 55) return 'bg-amber-400 text-white';
  if (pct >= 35) return 'bg-orange-400 text-white';
  if (pct >= 1)  return 'bg-red-400 text-white';
  return 'bg-gray-100 text-gray-400';
}

function occLabel(pct: number): string {
  if (pct >= 90) return 'High';
  if (pct >= 60) return 'Med-High';
  if (pct >= 35) return 'Medium';
  if (pct >= 1)  return 'Low';
  return 'Empty';
}

export default function OccupancyHeatmap() {
  const { currentHotel } = useHotel();
  const [monthOffset, setMonthOffset] = useState(0);
  const [occupancy, setOccupancy] = useState<Record<string, OccupancyData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const baseMonth = addMonths(new Date(), monthOffset);

  const load = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const startDate = format(startOfMonth(addMonths(new Date(), 0)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(new Date(), 2)), 'yyyy-MM-dd');

      const [resvRes, directRes, roomsRes] = await Promise.all([
        supabase.from('reservations')
          .select('room_id, check_in, check_out, status')
          .eq('hotel_id', currentHotel.id)
          .in('status', ['confirmed', 'checked_in', 'checked_out'])
          .or(`check_in.lte.${endDate},check_out.gte.${startDate}`),
        supabase.from('direct_bookings')
          .select('room_type_id, check_in, check_out, status')
          .eq('hotel_id', currentHotel.id)
          .in('status', ['confirmed', 'checked_in', 'checked_out'])
          .or(`check_in.lte.${endDate},check_out.gte.${startDate}`),
        supabase.from('rooms').select('id').eq('hotel_id', currentHotel.id),
      ]);

      const total = (roomsRes.data ?? []).length;
      const reservations = resvRes.data ?? [];
      const directBookings = directRes.data ?? [];
      const map: Record<string, OccupancyData> = {};

      const cur = new Date(startDate);
      const end = new Date(endDate);
      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        const resvOcc = reservations.filter(r => r.check_in <= dateStr && r.check_out > dateStr).length;
        const directOcc = directBookings.filter(r => r.check_in <= dateStr && r.check_out > dateStr).length;
        const occupied = resvOcc + directOcc;
        map[dateStr] = { date: dateStr, occupied, total, pct: total > 0 ? Math.round((occupied / total) * 100) : 0 };
        cur.setDate(cur.getDate() + 1);
      }
      setOccupancy(map);
    } finally {
      setLoading(false);
    }
  }, [currentHotel]);

  useEffect(() => { load(); }, [load]);

  const handleDayClick = async (dateStr: string) => {
    if (!currentHotel) return;
    setLoadingDetail(true);
    const { data } = await supabase
      .from('reservations')
      .select('id, room_id, check_in, check_out, total_amount, status, guest:guests(first_name, last_name)')
      .eq('hotel_id', currentHotel.id)
      .in('status', ['confirmed', 'checked_in', 'checked_out'])
      .lte('check_in', dateStr)
      .gt('check_out', dateStr);

    const occ = occupancy[dateStr] ?? { occupied: 0, total: 0, pct: 0 };
    const resvList = (data ?? []) as Reservation[];
    setSelectedDay({
      date: dateStr,
      reservations: resvList,
      occupied: occ.occupied,
      total: occ.total,
      revenue: resvList.reduce((sum, r) => sum + (r.total_amount ?? 0), 0),
    });
    setLoadingDetail(false);
  };

  const months = [0, 1, 2].map(offset => {
    const d = addMonths(new Date(), offset);
    return {
      label: format(d, 'MMMM yyyy'),
      days: eachDayOfInterval({ start: startOfMonth(d), end: endOfMonth(d) }),
      firstDow: startOfMonth(d).getDay(),
      monthDate: d,
    };
  });

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="md" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 text-xs flex-wrap">
        <span className="font-medium text-gray-600">Occupancy:</span>
        {[
          { label: '≥ 90%', color: 'bg-emerald-600' },
          { label: '75–89%', color: 'bg-emerald-400' },
          { label: '55–74%', color: 'bg-amber-400' },
          { label: '35–54%', color: 'bg-orange-400' },
          { label: '1–34%', color: 'bg-red-400' },
          { label: '0%', color: 'bg-gray-200' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${item.color}`} />
            <span className="text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {months.map(month => (
          <div key={month.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">{month.label}</h4>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: month.firstDow }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {month.days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const occ = occupancy[dateStr];
                const pct = occ?.pct ?? 0;
                const sameMo = isSameMonth(day, month.monthDate);
                const today = isToday(day);

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDayClick(dateStr)}
                    className={`relative aspect-square rounded-md text-xs font-medium transition-all hover:scale-105 hover:shadow-sm ${
                      sameMo ? occColor(pct) : 'bg-gray-50 text-gray-300'
                    } ${today ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                    title={`${dateStr}: ${pct}% occupied`}
                  >
                    {format(day, 'd')}
                    {occ && occ.occupied > 0 && (
                      <span className="absolute bottom-0.5 left-0 right-0 text-[8px] text-center opacity-80 leading-none">
                        {pct}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedDay && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{formatDate(selectedDay.date, 'EEEE, MMMM d yyyy')}</h4>
              <p className={`text-xs font-medium mt-0.5 ${occColor(selectedDay.total > 0 ? Math.round((selectedDay.occupied / selectedDay.total) * 100) : 0).replace('bg-', 'text-').replace(' text-white', '')}`}>
                {selectedDay.occupied} of {selectedDay.total} rooms occupied
                ({selectedDay.total > 0 ? Math.round((selectedDay.occupied / selectedDay.total) * 100) : 0}%
                — {occLabel(selectedDay.total > 0 ? Math.round((selectedDay.occupied / selectedDay.total) * 100) : 0)})
              </p>
            </div>
            <button onClick={() => setSelectedDay(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {loadingDetail ? (
            <div className="flex items-center justify-center h-16"><LoadingSpinner size="sm" /></div>
          ) : selectedDay.reservations.length === 0 ? (
            <p className="text-sm text-gray-400">No active reservations on this date</p>
          ) : (
            <div className="space-y-1">
              {selectedDay.reservations.map(r => (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'checked_in' ? 'bg-emerald-500' : 'bg-blue-400'}`} />
                    <span className="text-sm text-gray-700">
                      {r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : 'Guest'}
                    </span>
                    <span className="text-xs text-gray-400">{r.check_in} → {r.check_out}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(r.total_amount)}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">{selectedDay.reservations.length} booking{selectedDay.reservations.length !== 1 ? 's' : ''}</span>
                <span className="text-sm font-bold text-gray-900">Total: {formatCurrency(selectedDay.revenue)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
