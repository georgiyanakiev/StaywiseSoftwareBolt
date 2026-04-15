import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTenantId } from '../../hooks/useTenantQuery';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type { RoomTypeRate, AIPriceSuggestion } from './types';

const DAYS_PER_PAGE = 30;

interface CellOverride {
  roomTypeId: string;
  date: string;
  value: string;
}

interface OccupancyCell {
  occupied: number;
  total: number;
}

export default function RateCalendar90Day() {
  const { currentHotel } = useHotel();
  const { t } = useLanguage();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [roomTypes, setRoomTypes] = useState<RoomTypeRate[]>([]);
  const [suggestions, setSuggestions] = useState<AIPriceSuggestion[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, OccupancyCell>>({});
  const [loading, setLoading] = useState(true);
  const [pageOffset, setPageOffset] = useState(0);
  const [editing, setEditing] = useState<CellOverride | null>(null);
  const [saving, setSaving] = useState(false);

  const getDates = useCallback(() => {
    const dates: string[] = [];
    const base = new Date();
    base.setDate(base.getDate() + pageOffset * DAYS_PER_PAGE);
    for (let i = 0; i < DAYS_PER_PAGE; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [pageOffset]);

  const load = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const dates = getDates();
      const [rtRes, suggRes, resvRes, directRes, roomsRes] = await Promise.all([
        supabase.from('room_types').select('id, name, base_rate').eq('hotel_id', currentHotel.id).order('name'),
        supabase.from('ai_price_suggestions')
          .select('*')
          .eq('hotel_id', currentHotel.id)
          .eq('applied', false)
          .gte('date', dates[0])
          .lte('date', dates[dates.length - 1]),
        supabase.from('reservations')
          .select('room_id, check_in, check_out, status')
          .eq('hotel_id', currentHotel.id)
          .in('status', ['confirmed', 'checked_in'])
          .gte('check_in', dates[0])
          .lte('check_out', dates[dates.length - 1]),
        supabase.from('direct_bookings')
          .select('room_type_id, check_in, check_out, status')
          .eq('hotel_id', currentHotel.id)
          .in('status', ['confirmed', 'checked_in'])
          .gte('check_in', dates[0])
          .lte('check_out', dates[dates.length - 1]),
        supabase.from('rooms').select('id').eq('hotel_id', currentHotel.id),
      ]);

      setRoomTypes((rtRes.data ?? []).map(rt => ({ ...rt, base_rate: Number(rt.base_rate) })) as RoomTypeRate[]);
      setSuggestions((suggRes.data ?? []).map(s => ({
        ...s,
        current_rate: Number(s.current_rate),
        suggested_rate: Number(s.suggested_rate),
        confidence_score: Number(s.confidence_score),
      })) as AIPriceSuggestion[]);

      const totalRooms = (roomsRes.data ?? []).length;
      const occMap: Record<string, OccupancyCell> = {};
      const resvData = resvRes.data ?? [];
      const directData = directRes.data ?? [];

      for (const date of dates) {
        const resvOcc = resvData.filter(r => r.check_in <= date && r.check_out > date).length;
        const directOcc = directData.filter(r => r.check_in <= date && r.check_out > date).length;
        occMap[date] = { occupied: resvOcc + directOcc, total: totalRooms };
      }
      setOccupancy(occMap);
    } finally {
      setLoading(false);
    }
  }, [currentHotel, getDates]);

  useEffect(() => { load(); }, [load]);

  const getSuggestion = (roomTypeId: string, date: string) =>
    suggestions.find(s => s.room_type_id === roomTypeId && s.date === date);

  const getRate = (rt: RoomTypeRate, date: string): number => {
    const sugg = getSuggestion(rt.id, date);
    return sugg ? sugg.suggested_rate : rt.base_rate;
  };

  const applyOverride = async () => {
    if (!editing || !currentHotel) return;
    const rate = parseFloat(editing.value);
    if (isNaN(rate) || rate <= 0) return;
    setSaving(true);
    try {
      const existing = getSuggestion(editing.roomTypeId, editing.date);
      if (existing) {
        await supabase.from('ai_price_suggestions').update({
          suggested_rate: rate, applied: true, applied_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        const rt = roomTypes.find(r => r.id === editing.roomTypeId);
        const payload: Record<string, unknown> = {
          hotel_id: currentHotel.id,
          room_type_id: editing.roomTypeId,
          date: editing.date,
          current_rate: rt?.base_rate ?? 0,
          suggested_rate: rate,
          confidence_score: 100,
          reasoning: 'Manual override',
          factors: { demand: 'medium', competition: 'medium', day_type: 'weekday' },
          applied: true,
          applied_at: new Date().toISOString(),
        };
        if (tenantId) payload.tenant_id = tenantId;
        await supabase.from('ai_price_suggestions').insert(payload);
      }
      toast('success', 'Rate override saved');
      setEditing(null);
      load();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const dates = getDates();
  const maxPage = 2;

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="md" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageOffset(p => Math.max(0, p - 1))}
            disabled={pageOffset === 0}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
            {formatDate(dates[0])} – {formatDate(dates[dates.length - 1])}
          </span>
          <button
            onClick={() => setPageOffset(p => Math.min(maxPage, p + 1))}
            disabled={pageOffset === maxPage}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-teal-500" /> {t.dynamicPricing.aiSuggestedHigher}</span>
          <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-rose-500" /> {t.dynamicPricing.aiSuggestedLower}</span>
          <span className="flex items-center gap-1"><Minus className="w-3 h-3 text-gray-400" /> {t.dynamicPricing.baseRate}</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="text-sm w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[120px]">
                {t.dynamicPricing.roomType}
              </th>
              {dates.map(d => {
                const dow = new Date(d + 'T12:00:00').getDay();
                const isWe = dow === 0 || dow === 6;
                const occ = occupancy[d];
                const occPct = occ && occ.total > 0 ? Math.round((occ.occupied / occ.total) * 100) : 0;
                const occColor = occPct >= 80 ? 'text-emerald-600' : occPct >= 50 ? 'text-amber-600' : 'text-red-500';
                return (
                  <th key={d} className={`px-1 py-1.5 text-center min-w-[56px] ${isWe ? 'bg-blue-50/60' : ''}`}>
                    <div className="text-[10px] font-medium text-gray-500">
                      {['Su','Mo','Tu','We','Th','Fr','Sa'][dow]}
                    </div>
                    <div className="text-[10px] text-gray-400">{d.slice(5)}</div>
                    {occ && occ.total > 0 && (
                      <div className={`text-[9px] font-semibold ${occColor}`}>{occPct}%</div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {roomTypes.length === 0 ? (
              <tr><td colSpan={dates.length + 1} className="py-12 text-center text-sm text-gray-400">No room types found</td></tr>
            ) : (
              roomTypes.map(rt => (
                <tr key={rt.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/30">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-gray-100">
                    <p className="text-xs font-semibold text-gray-900 leading-tight">{rt.name}</p>
                    <p className="text-[10px] text-gray-400">Base {formatCurrency(rt.base_rate)}</p>
                  </td>
                  {dates.map(d => {
                    const sugg = getSuggestion(rt.id, d);
                    const displayRate = getRate(rt, d);
                    const diff = sugg ? sugg.suggested_rate - sugg.current_rate : 0;
                    const isEditing = editing?.roomTypeId === rt.id && editing?.date === d;
                    const dow = new Date(d + 'T12:00:00').getDay();
                    const isWe = dow === 0 || dow === 6;

                    return (
                      <td key={d} className={`px-0.5 py-0.5 text-center ${isWe ? 'bg-blue-50/30' : ''}`}>
                        {isEditing ? (
                          <div className="flex items-center gap-0.5 px-0.5">
                            <input
                              type="number"
                              value={editing.value}
                              onChange={e => setEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                              className="w-12 px-1 py-0.5 border border-blue-400 rounded text-center text-xs focus:outline-none"
                              onKeyDown={e => {
                                if (e.key === 'Enter') applyOverride();
                                if (e.key === 'Escape') setEditing(null);
                              }}
                              autoFocus
                            />
                            <button onClick={applyOverride} disabled={saving} className="text-emerald-600 hover:text-emerald-700">
                              <Save className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditing({ roomTypeId: rt.id, date: d, value: String(displayRate) })}
                            className="w-full hover:bg-teal-50 rounded p-1 transition-colors group"
                            title={sugg ? `AI: ${sugg.reasoning}` : 'Click to override'}
                          >
                            <div className="flex flex-col items-center">
                              <span className={`text-xs font-semibold ${sugg ? 'text-teal-700' : 'text-gray-700'}`}>
                                €{Math.round(displayRate)}
                              </span>
                              {sugg && Math.abs(diff) >= 1 && (
                                <span className={`text-[9px] flex items-center gap-0.5 ${diff > 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                                  {diff > 0 ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                                  {Math.abs(Math.round(diff))}
                                </span>
                              )}
                            </div>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">Teal = AI suggested rate. Click any cell to override manually.</p>
    </div>
  );
}
