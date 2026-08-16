import { useState } from 'react';
import { Lock, CalendarRange, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import type { Channel } from './ChannelCard';

interface Props {
  hotelId: string;
  tenantId: string | null;
  channels: Channel[];
}

interface RestrictionForm {
  from_date: string;
  to_date: string;
  channel_id: string;
  min_stay: string;
  max_stay: string;
  stop_sell: boolean;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function eachDay(from: string, to: string): string[] {
  const dates: string[] = [];
  let cur = from;
  while (cur <= to) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

export default function RestrictionsPanel({ hotelId, tenantId, channels }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<RestrictionForm>({
    from_date: today(),
    to_date: addDays(today(), 6),
    channel_id: 'all',
    min_stay: '',
    max_stay: '',
    stop_sell: false,
    closed_to_arrival: false,
    closed_to_departure: false,
  });
  const [saving, setSaving] = useState(false);

  const connectedChannels = channels.filter(c => c.status === 'connected');

  const applyRestrictions = async () => {
    if (form.from_date > form.to_date) {
      toast('error', 'From date must be before To date');
      return;
    }

    const hasAnyRestriction =
      form.min_stay || form.max_stay || form.stop_sell ||
      form.closed_to_arrival || form.closed_to_departure;

    if (!hasAnyRestriction) {
      toast('error', 'Please set at least one restriction');
      return;
    }

    setSaving(true);
    try {
      const dates = eachDay(form.from_date, form.to_date);
      const targetChannels = form.channel_id === 'all'
        ? connectedChannels.map(c => c.id)
        : [form.channel_id];

      const updates: Record<string, unknown> = {};
      if (form.min_stay)          updates.min_stay = parseInt(form.min_stay);
      if (form.max_stay)          updates.max_stay = parseInt(form.max_stay);
      if (form.stop_sell)         updates.stop_sell = true;
      if (form.closed_to_arrival) updates.closed_to_arrival = true;
      if (form.closed_to_departure) updates.closed_to_departure = true;
      updates.status = 'pending';

      let totalUpdated = 0;

      for (const channelId of targetChannels) {
        const { data: existing } = await supabase
          .from('channel_rates')
          .select('id, date')
          .eq('hotel_id', hotelId)
          .eq('channel_id', channelId)
          .in('date', dates);

        if (existing && existing.length > 0) {
          const ids = existing.map(r => r.id);
          await supabase
            .from('channel_rates')
            .update(updates)
            .in('id', ids);
          totalUpdated += ids.length;
        }

        const existingDates = new Set((existing ?? []).map(r => r.date));
        const missingDates = dates.filter(d => !existingDates.has(d));

        if (missingDates.length > 0) {
          const { data: roomTypes } = await supabase
            .from('room_types')
            .select('id, base_rate')
            .eq('hotel_id', hotelId);

          const inserts = (roomTypes ?? []).flatMap(rt =>
            missingDates.map(d => ({
              hotel_id: hotelId,
              channel_id: channelId,
              room_type_id: rt.id,
              tenant_id: tenantId,
              date: d,
              rate: rt.base_rate,
              availability: 0,
              ...updates,
            }))
          );

          if (inserts.length > 0) {
            await supabase.from('channel_rates').insert(inserts);
            totalUpdated += inserts.length;
          }
        }
      }

      toast('success', `Restrictions applied to ${totalUpdated} rate records — pending sync`);
    } catch {
      toast('error', 'Failed to apply restrictions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Rate Restrictions</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From Date</label>
          <div className="relative">
            <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={form.from_date}
              onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To Date</label>
          <div className="relative">
            <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={form.to_date}
              onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Apply To Channel</label>
          <select
            value={form.channel_id}
            onChange={e => setForm(f => ({ ...f, channel_id: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96] bg-white"
          >
            <option value="all">All connected channels</option>
            {connectedChannels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Min Stay (nights)</label>
          <input
            type="number"
            min="1"
            value={form.min_stay}
            onChange={e => setForm(f => ({ ...f, min_stay: e.target.value }))}
            placeholder="e.g. 2"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Max Stay (nights)</label>
          <input
            type="number"
            min="1"
            value={form.max_stay}
            onChange={e => setForm(f => ({ ...f, max_stay: e.target.value }))}
            placeholder="e.g. 14"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96]"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-1">
        {[
          { key: 'stop_sell',            label: 'Stop Sell' },
          { key: 'closed_to_arrival',    label: 'Closed to Arrival' },
          { key: 'closed_to_departure',  label: 'Closed to Departure' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form[key as keyof RestrictionForm] as boolean}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
              className="w-4 h-4 rounded text-[#1e3a5f] focus:ring-[#2d6b96]"
            />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Changes are staged as "pending" until the next sync
        </p>
        <button
          onClick={applyRestrictions}
          disabled={saving || connectedChannels.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#172e4c] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Applying...' : 'Apply Restrictions'}
        </button>
      </div>
    </div>
  );
}
