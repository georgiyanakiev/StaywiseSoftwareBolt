import { useState } from 'react';
import { Sparkles, CheckCircle, CheckCheck, TrendingUp, TrendingDown, Loader2, RefreshCw, Zap, Clock, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
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

type PoweredBy = 'ai_refined' | 'yield_algorithm' | null;

const PICKUP_COLORS: Record<string, string> = {
  accelerating: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  stable: 'text-gray-600 bg-gray-50 border-gray-200',
  decelerating: 'text-orange-600 bg-orange-50 border-orange-200',
};

function getLeadTimeLabel(leadTime: string, t: any): string {
  const labels: Record<string, string> = {
    same_day: t.dynamicPricing.sameDay,
    last_minute: t.dynamicPricing.lastMinute,
    short: t.dynamicPricing.shortLead,
    medium: t.dynamicPricing.mediumLead,
    advance: t.dynamicPricing.advanceLead,
  };
  return labels[leadTime] ?? leadTime;
}

function getDemandLabel(demand: string, t: any): string {
  const labels: Record<string, string> = {
    high: t.dynamicPricing.highDemand,
    medium: t.dynamicPricing.mediumDemand,
    low: t.dynamicPricing.lowDemand,
  };
  return labels[demand] ?? demand;
}

function getPickupLabel(pickup: string, t: any): string {
  const labels: Record<string, string> = {
    accelerating: t.dynamicPricing.accelerating,
    stable: t.dynamicPricing.stable,
    decelerating: t.dynamicPricing.decelerating,
  };
  return labels[pickup] ?? pickup;
}

export default function AISuggestionsPanel({ suggestions, roomTypes, loading, onRefresh }: Props) {
  const { currentHotel } = useHotel();
  const { t } = useLanguage();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [applyingAll, setApplyingAll] = useState(false);
  const [poweredBy, setPoweredBy] = useState<PoweredBy>(null);

  const getRoomTypeName = (id: string) => roomTypes.find(rt => rt.id === id)?.name ?? 'Unknown';

  const generateSuggestions = async () => {
    if (!currentHotel) return;
    setGenerating(true);
    setPoweredBy(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Your session has expired. Please sign in again.');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-pricing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            hotel_id: currentHotel.id,
            tenant_id: tenantId,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Generation failed');
      setPoweredBy(json.powered_by ?? 'yield_algorithm');
      toast('success', `Generated ${json.count} suggestions`);
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
      toast('success', `Applied ${formatCurrency(s.suggested_rate)} for ${getRoomTypeName(s.room_type_id)} on ${formatDate(s.date)}`);
      onRefresh();
    } catch {
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
    d === 'high' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    d === 'low' ? 'text-red-600 bg-red-50 border-red-200' :
    'text-amber-600 bg-amber-50 border-amber-200';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">AI Rate Suggestions</h3>
            {poweredBy === 'ai_refined' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3 h-3" /> AI-refined
              </span>
            )}
            {poweredBy === 'yield_algorithm' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                <Zap className="w-3 h-3" /> Yield engine
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {suggestions.length} {t.dynamicPricing.noPendingSuggestions}
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
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing...</>
              : <><Sparkles className="w-4 h-4" /> {t.dynamicPricing.generateSuggestions}</>
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
          <p className="text-sm font-medium text-blue-900">Running yield management engine...</p>
          <p className="text-xs text-blue-600 mt-1">Analysing occupancy pressure, booking pace, lead-time curves &amp; pricing rules</p>
        </div>
      )}

      {!generating && loading && <div className="flex items-center justify-center h-32"><LoadingSpinner size="md" /></div>}

      {!generating && !loading && suggestions.length === 0 && (
        <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-xl">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">{t.dynamicPricing.noSuggestionsYet}</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            {t.dynamicPricing.yieldEngineAnalyzes}
          </p>
          <button onClick={generateSuggestions} className="btn-primary text-sm flex items-center gap-2 mx-auto">
            <Sparkles className="w-4 h-4" /> {t.dynamicPricing.runYieldAnalysis}
          </button>
        </div>
      )}

      {!generating && suggestions.length > 0 && (
        <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
          {suggestions.slice(0, 100).map(s => {
            const diff = s.suggested_rate - s.current_rate;
            const diffPct = s.current_rate > 0 ? ((diff / s.current_rate) * 100) : 0;
            const isApplying = applying.has(s.id);

            return (
              <div key={s.id} className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{getRoomTypeName(s.room_type_id)}</span>
                    <span className="text-xs text-gray-500">{formatDate(s.date)}</span>

                    {s.factors?.demand && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${demandColor(s.factors.demand)}`}>
                        {getDemandLabel(s.factors.demand, t)}
                        {s.factors.occupancy_pct != null ? ` · ${s.factors.occupancy_pct}%` : ''}
                      </span>
                    )}

                    {s.factors?.pickup && s.factors.pickup !== 'stable' && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${PICKUP_COLORS[s.factors.pickup]}`}>
                        <Activity className="w-2.5 h-2.5" />
                        {getPickupLabel(s.factors.pickup, t)}
                      </span>
                    )}

                    {s.factors?.lead_time && s.factors.lead_time !== 'medium' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full border border-gray-200">
                        <Clock className="w-2.5 h-2.5" />
                        {getLeadTimeLabel(s.factors.lead_time, t)}
                      </span>
                    )}

                    {s.factors?.day_type === 'weekend' && (
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full border border-gray-200">
                        {t.dynamicPricing.weekend}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-0.5 truncate">{s.reasoning}</p>

                  <div className="mt-1.5 flex items-center gap-1 w-full max-w-[160px]">
                    <div className="flex-1 bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-teal-500 h-1 rounded-full transition-all"
                        style={{ width: `${s.confidence_score}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{s.confidence_score}% {t.dynamicPricing.confidence}</span>
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
                    {t.dynamicPricing.apply}
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
