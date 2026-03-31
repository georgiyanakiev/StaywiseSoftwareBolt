import { useState, useCallback } from 'react';
import { Sparkles, CheckCircle, CheckCheck, TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useTenantId } from '../../hooks/useTenantQuery';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type { AIPriceSuggestion, RoomTypeRate } from './types';

interface Props {
  suggestions: AIPriceSuggestion[];
  roomTypes: RoomTypeRate[];
  loading: boolean;
  onRefresh: () => void;
}

export default function AISuggestionsPanel({ suggestions, roomTypes, loading, onRefresh }: Props) {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [applyingAll, setApplyingAll] = useState(false);

  const getRoomTypeName = (id: string) => roomTypes.find(rt => rt.id === id)?.name ?? 'Unknown';

  const generateSuggestions = async () => {
    if (!currentHotel) return;
    setGenerating(true);
    try {
      const [rtRes, resvRes, roomsRes] = await Promise.all([
        supabase.from('room_types').select('id, name, base_rate').eq('hotel_id', currentHotel.id),
        supabase.from('reservations')
          .select('room_id, check_in, check_out, status')
          .eq('hotel_id', currentHotel.id)
          .in('status', ['confirmed', 'checked_in'])
          .gte('check_in', new Date().toISOString().split('T')[0]),
        supabase.from('rooms').select('id').eq('hotel_id', currentHotel.id),
      ]);

      const currentRates = ((rtRes.data ?? []) as RoomTypeRate[]).map(rt => ({
        room_type_id: rt.id,
        room_type_name: rt.name,
        base_rate: rt.base_rate,
      }));

      const totalRooms = (roomsRes.data ?? []).length;
      const reservations = resvRes.data ?? [];

      const occupancy_data: Record<string, number> = {};
      const booking_pace: Record<string, number> = {};
      const dow_counts: Record<number, number[]> = {};

      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const occupied = reservations.filter(r => r.check_in <= dateStr && r.check_out > dateStr).length;
        occupancy_data[dateStr] = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;
        booking_pace[dateStr] = occupied;
        const dow = d.getDay();
        if (!dow_counts[dow]) dow_counts[dow] = [];
        dow_counts[dow].push(occupancy_data[dateStr]);
      }

      const dow_patterns: Record<string, number> = {};
      for (const [dow, vals] of Object.entries(dow_counts)) {
        dow_patterns[dow] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-pricing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            hotel_id: currentHotel.id,
            tenant_id: tenantId,
            occupancy_data,
            current_rates: currentRates,
            booking_pace,
            dow_patterns,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Generation failed');
      toast('success', `Generated ${json.count} AI suggestions`);
      onRefresh();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setGenerating(false);
    }
  };

  const applySuggestion = async (s: AIPriceSuggestion) => {
    setApplying(prev => new Set(prev).add(s.id));
    try {
      await supabase.from('ai_price_suggestions').update({
        applied: true,
        applied_at: new Date().toISOString(),
      }).eq('id', s.id);
      toast('success', `Applied $${s.suggested_rate} for ${getRoomTypeName(s.room_type_id)} on ${formatDate(s.date)}`);
      onRefresh();
    } catch (err) {
      toast('error', 'Failed to apply suggestion');
    } finally {
      setApplying(prev => { const n = new Set(prev); n.delete(s.id); return n; });
    }
  };

  const applyAll = async () => {
    if (!suggestions.length) return;
    setApplyingAll(true);
    try {
      const ids = suggestions.map(s => s.id);
      await supabase.from('ai_price_suggestions').update({
        applied: true,
        applied_at: new Date().toISOString(),
      }).in('id', ids);
      toast('success', `Applied ${ids.length} suggestions`);
      onRefresh();
    } catch {
      toast('error', 'Failed to apply all suggestions');
    } finally {
      setApplyingAll(false);
    }
  };

  const demandColor = (d?: string) =>
    d === 'high' ? 'text-emerald-600 bg-emerald-50' :
    d === 'low' ? 'text-red-500 bg-red-50' :
    'text-amber-600 bg-amber-50';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">AI Rate Suggestions</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {suggestions.length} pending suggestions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {suggestions.length > 0 && (
            <button
              onClick={applyAll}
              disabled={applyingAll}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              {applyingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Apply All
            </button>
          )}
          <button
            onClick={generateSuggestions}
            disabled={generating}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><Sparkles className="w-4 h-4" /> Generate AI Suggestions</>
            }
          </button>
          <button onClick={onRefresh} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {generating && (
        <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-xl p-6 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-blue-900">AI is analysing your hotel data...</p>
          <p className="text-xs text-blue-600 mt-1">Checking occupancy patterns, booking pace, and day-of-week demand</p>
        </div>
      )}

      {!generating && loading && <div className="flex items-center justify-center h-32"><LoadingSpinner size="md" /></div>}

      {!generating && !loading && suggestions.length === 0 && (
        <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-xl">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No pending suggestions</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Click "Generate AI Suggestions" to analyse your data</p>
          <button onClick={generateSuggestions} className="btn-primary text-sm flex items-center gap-2 mx-auto">
            <Sparkles className="w-4 h-4" /> Generate Now
          </button>
        </div>
      )}

      {!generating && suggestions.length > 0 && (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {suggestions.slice(0, 100).map(s => {
            const diff = s.suggested_rate - s.current_rate;
            const diffPct = s.current_rate > 0 ? ((diff / s.current_rate) * 100) : 0;
            const isApplying = applying.has(s.id);

            return (
              <div key={s.id} className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{getRoomTypeName(s.room_type_id)}</span>
                    <span className="text-xs text-gray-500">{formatDate(s.date)}</span>
                    {s.factors?.demand && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${demandColor(s.factors.demand)}`}>
                        {s.factors.demand} demand
                      </span>
                    )}
                    {s.factors?.day_type && (
                      <span className="text-xs text-gray-400 capitalize">{s.factors.day_type}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{s.reasoning}</p>
                  <div className="mt-1.5 flex items-center gap-1 w-full max-w-[160px]">
                    <div className="flex-1 bg-gray-200 rounded-full h-1">
                      <div className="bg-teal-500 h-1 rounded-full transition-all" style={{ width: `${s.confidence_score}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{s.confidence_score}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-gray-400 line-through">{formatCurrency(s.current_rate)}</div>
                    <div className="text-base font-bold text-teal-700">{formatCurrency(s.suggested_rate)}</div>
                    <div className={`text-xs font-medium flex items-center gap-0.5 justify-end ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {diff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {diff >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
                    </div>
                  </div>
                  <button
                    onClick={() => applySuggestion(s)}
                    disabled={isApplying}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                  >
                    {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Apply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
