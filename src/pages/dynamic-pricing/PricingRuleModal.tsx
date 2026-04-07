import { useState, useEffect } from 'react';
import { Save, Plus } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useHotel } from '../../contexts/HotelContext';
import { useTenantId } from '../../hooks/useTenantQuery';
import { supabase } from '../../lib/supabase';
import type { PricingRule, RoomTypeRate } from './types';

interface Props {
  open: boolean;
  rule: PricingRule | null;
  roomTypes: RoomTypeRate[];
  onClose: () => void;
  onSaved: () => void;
}

const RULE_TYPES = [
  { value: 'base_rate', label: 'Base Rate' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'event', label: 'Event' },
  { value: 'occupancy', label: 'Occupancy Trigger' },
  { value: 'last_minute', label: 'Last Minute' },
  { value: 'early_bird', label: 'Early Bird' },
  { value: 'day_of_week', label: 'Day of Week' },
];

const ADJUSTMENT_TYPES = [
  { value: 'percentage_increase', label: '% Increase' },
  { value: 'percentage_decrease', label: '% Decrease' },
  { value: 'fixed_increase', label: 'Fixed Increase ($)' },
  { value: 'fixed_decrease', label: 'Fixed Decrease ($)' },
  { value: 'set_rate', label: 'Set Exact Rate ($)' },
];

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const emptyForm = {
  name: '',
  type: 'seasonal' as PricingRule['type'],
  room_type_id: '',
  date_from: '',
  date_to: '',
  days_of_week: [] as number[],
  occupancy_threshold_pct: '',
  days_before_arrival: '',
  adjustment_type: 'percentage_increase' as PricingRule['adjustment_type'],
  adjustment_value: '',
  min_rate: '',
  max_rate: '',
  priority: '0',
  active: true,
};

export default function PricingRuleModal({ open, rule, roomTypes, onClose, onSaved }: Props) {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name,
        type: rule.type,
        room_type_id: rule.room_type_id ?? '',
        date_from: rule.date_from ?? '',
        date_to: rule.date_to ?? '',
        days_of_week: rule.days_of_week ?? [],
        occupancy_threshold_pct: rule.occupancy_threshold_pct != null ? String(rule.occupancy_threshold_pct) : '',
        days_before_arrival: rule.days_before_arrival != null ? String(rule.days_before_arrival) : '',
        adjustment_type: rule.adjustment_type,
        adjustment_value: String(rule.adjustment_value),
        min_rate: rule.min_rate != null ? String(rule.min_rate) : '',
        max_rate: rule.max_rate != null ? String(rule.max_rate) : '',
        priority: String(rule.priority),
        active: rule.active,
      });
    } else {
      setForm(emptyForm);
    }
  }, [rule, open]);

  const toggleDow = (day: number) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        hotel_id: currentHotel.id,
        name: form.name,
        type: form.type,
        room_type_id: form.room_type_id || null,
        date_from: form.date_from || null,
        date_to: form.date_to || null,
        days_of_week: form.days_of_week,
        occupancy_threshold_pct: form.occupancy_threshold_pct ? parseFloat(form.occupancy_threshold_pct) : null,
        days_before_arrival: form.days_before_arrival ? parseInt(form.days_before_arrival) : null,
        adjustment_type: form.adjustment_type,
        adjustment_value: parseFloat(form.adjustment_value) || 0,
        min_rate: form.min_rate ? parseFloat(form.min_rate) : null,
        max_rate: form.max_rate ? parseFloat(form.max_rate) : null,
        priority: parseInt(form.priority) || 0,
        active: form.active,
      };
      if (tenantId) payload.tenant_id = tenantId;

      if (rule) {
        const { error } = await supabase.from('pricing_rules').update(payload).eq('id', rule.id);
        if (error) throw new Error(error.message);
        toast('success', 'Rule updated');
      } else {
        const { error } = await supabase.from('pricing_rules').insert(payload);
        if (error) throw new Error(error.message);
        toast('success', 'Pricing rule created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const showDateRange = ['seasonal', 'event', 'base_rate'].includes(form.type);
  const showOccupancy = form.type === 'occupancy';
  const showDaysBefore = ['last_minute', 'early_bird'].includes(form.type);
  const showDow = form.type === 'day_of_week';

  return (
    <Modal open={open} onClose={onClose} title={rule ? 'Edit Pricing Rule' : 'Add Pricing Rule'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
            <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
            <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as PricingRule['type'] }))}>
              {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
            <select className="input-field" value={form.room_type_id} onChange={e => setForm(f => ({ ...f, room_type_id: e.target.value }))}>
              <option value="">All Room Types</option>
              {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
        </div>

        {showDateRange && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input type="date" className="input-field" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input type="date" className="input-field" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
            </div>
          </div>
        )}

        {showOccupancy && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apply when occupancy exceeds (%)</label>
            <input type="number" min="0" max="100" className="input-field" value={form.occupancy_threshold_pct} onChange={e => setForm(f => ({ ...f, occupancy_threshold_pct: e.target.value }))} placeholder="e.g. 80" />
          </div>
        )}

        {showDaysBefore && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Days before arrival</label>
            <input type="number" min="0" className="input-field" value={form.days_before_arrival} onChange={e => setForm(f => ({ ...f, days_before_arrival: e.target.value }))} placeholder="e.g. 7" />
          </div>
        )}

        {showDow && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Apply on days</label>
            <div className="flex gap-2 flex-wrap">
              {DOW_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDow(idx)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    form.days_of_week.includes(idx)
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
            <select className="input-field" value={form.adjustment_type} onChange={e => setForm(f => ({ ...f, adjustment_type: e.target.value as PricingRule['adjustment_type'] }))}>
              {ADJUSTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.adjustment_value} onChange={e => setForm(f => ({ ...f, adjustment_value: e.target.value }))} required />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Rate ($)</label>
            <input type="number" min="0" className="input-field" value={form.min_rate} onChange={e => setForm(f => ({ ...f, min_rate: e.target.value }))} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Rate ($)</label>
            <input type="number" min="0" className="input-field" value={form.max_rate} onChange={e => setForm(f => ({ ...f, max_rate: e.target.value }))} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <input type="number" className="input-field" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded text-[#1e3a5f]" />
          <label htmlFor="active" className="text-sm text-gray-700">Rule is active</label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            {rule ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Saving...' : rule ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
