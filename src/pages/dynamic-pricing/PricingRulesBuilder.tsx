import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Play, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PricingRuleModal from './PricingRuleModal';
import type { PricingRule, RoomTypeRate } from './types';

const RULE_TYPE_LABELS: Record<string, string> = {
  base_rate: 'Base Rate',
  seasonal: 'Seasonal',
  event: 'Event',
  occupancy: 'Occupancy',
  last_minute: 'Last Minute',
  early_bird: 'Early Bird',
  day_of_week: 'Day of Week',
};

const RULE_TYPE_COLORS: Record<string, string> = {
  base_rate: 'bg-gray-100 text-gray-700',
  seasonal: 'bg-blue-100 text-blue-700',
  event: 'bg-orange-100 text-orange-700',
  occupancy: 'bg-teal-100 text-teal-700',
  last_minute: 'bg-rose-100 text-rose-700',
  early_bird: 'bg-emerald-100 text-emerald-700',
  day_of_week: 'bg-amber-100 text-amber-700',
};

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface SimResult {
  date: string;
  roomTypeName: string;
  baseRate: number;
  finalRate: number;
  rulesApplied: string[];
}

function applyRules(rules: PricingRule[], roomTypes: RoomTypeRate[], days = 30): SimResult[] {
  const results: SimResult[] = [];
  const today = new Date();
  const activeRules = [...rules.filter(r => r.active)].sort((a, b) => b.priority - a.priority);

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const daysFromNow = i;

    for (const rt of roomTypes) {
      let rate = rt.base_rate;
      const applied: string[] = [];

      for (const rule of activeRules) {
        if (rule.room_type_id && rule.room_type_id !== rt.id) continue;

        let match = false;
        if (rule.type === 'base_rate') match = true;
        if (rule.type === 'seasonal' || rule.type === 'event') {
          const from = rule.date_from ? new Date(rule.date_from) : null;
          const to = rule.date_to ? new Date(rule.date_to) : null;
          match = (!from || d >= from) && (!to || d <= to);
        }
        if (rule.type === 'day_of_week') {
          match = (rule.days_of_week ?? []).includes(dow);
        }
        if (rule.type === 'last_minute') {
          match = rule.days_before_arrival != null && daysFromNow <= rule.days_before_arrival;
        }
        if (rule.type === 'early_bird') {
          match = rule.days_before_arrival != null && daysFromNow >= rule.days_before_arrival;
        }
        if (rule.type === 'occupancy') match = false;

        if (!match) continue;

        const v = rule.adjustment_value;
        if (rule.adjustment_type === 'percentage_increase') rate *= 1 + v / 100;
        else if (rule.adjustment_type === 'percentage_decrease') rate *= 1 - v / 100;
        else if (rule.adjustment_type === 'fixed_increase') rate += v;
        else if (rule.adjustment_type === 'fixed_decrease') rate -= v;
        else if (rule.adjustment_type === 'set_rate') rate = v;

        if (rule.min_rate != null) rate = Math.max(rate, rule.min_rate);
        if (rule.max_rate != null) rate = Math.min(rate, rule.max_rate);

        applied.push(rule.name);
      }

      results.push({
        date: dateStr,
        roomTypeName: rt.name,
        baseRate: rt.base_rate,
        finalRate: Math.round(rate),
        rulesApplied: applied,
      });
    }
  }
  return results;
}

export default function PricingRulesBuilder({ roomTypes }: { roomTypes: RoomTypeRate[] }) {
  const { currentHotel } = useHotel();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PricingRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PricingRule | null>(null);
  const [simResults, setSimResults] = useState<SimResult[] | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    const { data } = await supabase.from('pricing_rules').select('*').eq('hotel_id', currentHotel.id).order('priority', { ascending: false });
    setRules((data ?? []) as PricingRule[]);
    setLoading(false);
  }, [currentHotel]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('pricing_rules').delete().eq('id', deleteTarget.id);
    toast('success', 'Rule deleted');
    setDeleteTarget(null);
    load();
  };

  const toggleActive = async (rule: PricingRule) => {
    await supabase.from('pricing_rules').update({ active: !rule.active }).eq('id', rule.id);
    load();
  };

  const simulate = () => {
    setSimLoading(true);
    setTimeout(() => {
      const results = applyRules(rules, roomTypes, 14);
      setSimResults(results);
      setSimLoading(false);
    }, 400);
  };

  const describeRule = (rule: PricingRule): string => {
    const adj = rule.adjustment_type === 'percentage_increase' ? `+${rule.adjustment_value}%`
      : rule.adjustment_type === 'percentage_decrease' ? `-${rule.adjustment_value}%`
      : rule.adjustment_type === 'fixed_increase' ? `+$${rule.adjustment_value}`
      : rule.adjustment_type === 'fixed_decrease' ? `-$${rule.adjustment_value}`
      : `= $${rule.adjustment_value}`;
    return adj;
  };

  if (loading) return <div className="flex items-center justify-center h-48"><LoadingSpinner size="md" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">{t.dynamicPricing.pricingRules}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t.dynamicPricing.rulesAppliedInOrder}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={simulate}
            disabled={simLoading || rules.length === 0}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {simLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {t.dynamicPricing.simulate} 14 {t.dynamicPricing.days}
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            {t.dynamicPricing.addRule}
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500 mb-3">{t.dynamicPricing.noPricingRulesYet}</p>
          <button onClick={() => setAddOpen(true)} className="btn-primary text-sm flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" /> {t.dynamicPricing.addFirstRule}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={rule.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${rule.active ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
              <div className="flex-shrink-0 flex flex-col gap-0.5 mt-0.5">
                <button disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-gray-400 text-center">{rule.priority}</span>
                <button disabled={idx === rules.length - 1} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{rule.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RULE_TYPE_COLORS[rule.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {RULE_TYPE_LABELS[rule.type]}
                  </span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    {describeRule(rule)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  {rule.room_type_id ? (
                    <span>{roomTypes.find(r => r.id === rule.room_type_id)?.name ?? 'Unknown type'}</span>
                  ) : (
                    <span>All room types</span>
                  )}
                  {rule.date_from && rule.date_to && (
                    <span>{rule.date_from} → {rule.date_to}</span>
                  )}
                  {rule.type === 'day_of_week' && rule.days_of_week?.length > 0 && (
                    <span>{rule.days_of_week.map(d => DOW_NAMES[d]).join(', ')}</span>
                  )}
                  {rule.type === 'occupancy' && rule.occupancy_threshold_pct != null && (
                    <span>Occ &gt; {rule.occupancy_threshold_pct}%</span>
                  )}
                  {(rule.type === 'last_minute' || rule.type === 'early_bird') && rule.days_before_arrival != null && (
                    <span>{rule.days_before_arrival} days before</span>
                  )}
                  {(rule.min_rate != null || rule.max_rate != null) && (
                    <span>
                      Guardrails: {rule.min_rate != null ? `min ${formatCurrency(rule.min_rate)}` : ''}
                      {rule.min_rate != null && rule.max_rate != null ? ' / ' : ''}
                      {rule.max_rate != null ? `max ${formatCurrency(rule.max_rate)}` : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(rule)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors" title={rule.active ? 'Deactivate' : 'Activate'}>
                  {rule.active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditTarget(rule)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteTarget(rule)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {simResults && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Simulation Results — Next 14 Days</h4>
            <button onClick={() => setSimResults(null)} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="table-header">Date</th>
                  <th className="table-header">Room Type</th>
                  <th className="table-header">Base Rate</th>
                  <th className="table-header">Simulated Rate</th>
                  <th className="table-header">Change</th>
                  <th className="table-header">Rules Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {simResults.map((r, i) => {
                  const diff = r.finalRate - r.baseRate;
                  return (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="table-cell">{r.date}</td>
                      <td className="table-cell font-medium text-gray-900">{r.roomTypeName}</td>
                      <td className="table-cell text-gray-500">{formatCurrency(r.baseRate)}</td>
                      <td className="table-cell font-semibold text-gray-900">{formatCurrency(r.finalRate)}</td>
                      <td className={`table-cell font-medium ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                      </td>
                      <td className="table-cell text-gray-400">{r.rulesApplied.join(', ') || 'None'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PricingRuleModal open={addOpen} rule={null} roomTypes={roomTypes} onClose={() => setAddOpen(false)} onSaved={load} />
      <PricingRuleModal open={!!editTarget} rule={editTarget} roomTypes={roomTypes} onClose={() => setEditTarget(null)} onSaved={load} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Rule"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
