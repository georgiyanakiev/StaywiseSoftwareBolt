import { useState } from 'react';
import { FileText, Calculator } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useHotel } from '../../contexts/HotelContext';
import { useTenantId } from '../../hooks/useTenantQuery';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import type { PropertyOwner } from './types';

interface Props {
  open: boolean;
  owner: PropertyOwner | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Preview {
  gross_revenue: number;
  management_fee: number;
  expenses: number;
  net_payout: number;
  booking_count: number;
  occupancy_rate: number;
  avg_daily_rate: number;
}

export default function GenerateStatementModal({ open, owner, onClose, onSaved }: Props) {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notes, setNotes] = useState('');

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [periodStart, setPeriodStart] = useState(firstOfMonth);
  const [periodEnd, setPeriodEnd] = useState(lastOfMonth);

  const calculate = async () => {
    if (!currentHotel || !owner) return;
    setLoading(true);
    setPreview(null);
    try {
      const { data: ownerProps } = await supabase
        .from('owner_properties')
        .select('room_id, ownership_pct, monthly_expenses')
        .eq('owner_id', owner.id)
        .eq('hotel_id', currentHotel.id);

      if (!ownerProps || ownerProps.length === 0) {
        toast('warning', 'This owner has no rooms assigned');
        setLoading(false);
        return;
      }

      const roomIds = ownerProps.map(p => p.room_id).filter(Boolean);

      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, room_id, total_amount, check_in, check_out, status')
        .eq('hotel_id', currentHotel.id)
        .in('status', ['checked_in', 'checked_out', 'confirmed'])
        .gte('check_in', periodStart)
        .lte('check_out', periodEnd)
        .in('room_id', roomIds);

      const resv = reservations ?? [];
      let grossRevenue = 0;
      let totalNights = 0;

      for (const r of resv) {
        const prop = ownerProps.find(p => p.room_id === r.room_id);
        const pct = (prop?.ownership_pct ?? 100) / 100;
        grossRevenue += r.total_amount * pct;

        const ci = new Date(r.check_in);
        const co = new Date(r.check_out);
        const nights = Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000));
        totalNights += nights;
      }

      const managementFee = grossRevenue * (owner.commission_rate / 100);

      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      const daysInPeriod = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      const monthFraction = daysInPeriod / 30;

      const totalExpenses = ownerProps.reduce((sum, p) => sum + (p.monthly_expenses ?? 0) * monthFraction, 0);

      const netPayout = grossRevenue - managementFee - totalExpenses;
      const totalPossibleNights = roomIds.length * daysInPeriod;
      const occupancyRate = totalPossibleNights > 0 ? (totalNights / totalPossibleNights) * 100 : 0;
      const avgDailyRate = resv.length > 0 ? grossRevenue / Math.max(1, totalNights) : 0;

      setPreview({
        gross_revenue: Math.round(grossRevenue * 100) / 100,
        management_fee: Math.round(managementFee * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        net_payout: Math.round(netPayout * 100) / 100,
        booking_count: resv.length,
        occupancy_rate: Math.round(occupancyRate * 100) / 100,
        avg_daily_rate: Math.round(avgDailyRate * 100) / 100,
      });
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentHotel || !owner || !preview) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        hotel_id: currentHotel.id,
        owner_id: owner.id,
        period_start: periodStart,
        period_end: periodEnd,
        ...preview,
        notes,
        status: 'draft',
      };
      if (tenantId) payload.tenant_id = tenantId;

      const { error } = await supabase.from('owner_statements').insert(payload);
      if (error) throw new Error(error.message);
      toast('success', 'Statement generated');
      onSaved();
      onClose();
      setPreview(null);
      setNotes('');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save statement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Generate Statement — ${owner?.full_name ?? ''}`} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
            <input type="date" className="input-field" value={periodStart} onChange={e => { setPeriodStart(e.target.value); setPreview(null); }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
            <input type="date" className="input-field" value={periodEnd} onChange={e => { setPeriodEnd(e.target.value); setPreview(null); }} />
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={loading}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          {loading ? 'Calculating...' : 'Calculate'}
        </button>

        {preview && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
            {[
              { label: 'Gross Revenue', value: preview.gross_revenue, positive: true },
              { label: `Management Fee (${owner?.commission_rate}%)`, value: -preview.management_fee, display: preview.management_fee },
              { label: 'Expenses', value: -preview.expenses, display: preview.expenses },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className={`text-sm font-medium ${row.value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {row.value < 0 ? '−' : ''}{formatCurrency('display' in row ? row.display! : row.value)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-white rounded-b-xl">
              <span className="text-sm font-semibold text-gray-900">Net Payout</span>
              <span className={`text-base font-bold ${preview.net_payout >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(preview.net_payout)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-gray-500">Bookings</span>
              <span className="text-sm text-gray-700">{preview.booking_count}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-gray-500">Occupancy</span>
              <span className="text-sm text-gray-700">{preview.occupancy_rate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-gray-500">Avg Daily Rate</span>
              <span className="text-sm text-gray-700">{formatCurrency(preview.avg_daily_rate)}</span>
            </div>
          </div>
        )}

        {preview && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea className="input-field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          {preview && (
            <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
              <FileText className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Statement'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
