import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../lib/utils';
import { useTenantId } from '../../hooks/useTenantQuery';

interface Transaction {
  id: string;
  guest_name: string;
  amount: number;
  currency: string;
  hotel_id?: string;
  booking_source?: string;
}

interface Props {
  transaction: Transaction;
  hotelId: string;
  onClose: () => void;
  onRefunded: (id: string, amount: number) => void;
}

const REFUND_REASONS = [
  'Guest cancellation',
  'Booking error / duplicate',
  'Overcharge correction',
  'Service not delivered',
  'Early departure',
  'Goodwill gesture',
  'Other',
];

export default function RefundModal({ transaction, hotelId, onClose, onRefunded }: Props) {
  const tenantId = useTenantId();
  const [amount, setAmount] = useState(transaction.amount);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isPartial = amount < transaction.amount;

  const handleRefund = async () => {
    if (amount <= 0 || amount > transaction.amount) {
      setError('Refund amount must be between €0.01 and the original charge.');
      return;
    }
    if (!reason) {
      setError('Please select a reason for the refund.');
      return;
    }

    setSaving(true);
    setError('');

    const refundNote = notes ? `${reason}: ${notes}` : reason;

    await supabase.from('payment_transactions').update({
      status: 'refunded',
      refund_reason: refundNote,
      processed_at: new Date().toISOString(),
    }).eq('id', transaction.id);

    await supabase.from('payment_transactions').insert({
      hotel_id: hotelId,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      guest_name: transaction.guest_name,
      booking_source: transaction.booking_source ?? 'direct',
      amount: amount,
      currency: transaction.currency ?? 'EUR',
      type: 'refund',
      status: 'captured',
      payment_method: 'card',
      notes: refundNote,
      processed_at: new Date().toISOString(),
    });

    setSaving(false);
    onRefunded(transaction.id, amount);
  };

  return (
    <Modal isOpen onClose={onClose} title="Issue Refund" size="sm">
      <div className="space-y-4 p-1">
        <div className="bg-gray-50 rounded-lg p-3.5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Guest</span>
            <span className="font-medium text-gray-900">{transaction.guest_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Original charge</span>
            <span className="font-semibold text-gray-900">{formatCurrency(transaction.amount)}</span>
          </div>
          {isPartial && (
            <div className="flex justify-between text-sm text-amber-600 border-t border-gray-200 pt-2">
              <span>Remaining after refund</span>
              <span className="font-semibold">{formatCurrency(transaction.amount - amount)}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Refund Amount
            {isPartial && <span className="ml-2 text-xs text-amber-600 font-normal">(Partial refund)</span>}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">€</span>
            <input
              type="number"
              min={0.01}
              max={transaction.amount}
              step={0.01}
              value={amount}
              onChange={e => { setAmount(Number(e.target.value)); setError(''); }}
              className="input-field pl-7"
            />
          </div>
          <button
            type="button"
            onClick={() => setAmount(transaction.amount)}
            className="text-xs text-blue-600 hover:underline mt-1"
          >
            Use full amount ({formatCurrency(transaction.amount)})
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
          <select
            value={reason}
            onChange={e => { setReason(e.target.value); setError(''); }}
            className="input-field"
          >
            <option value="">Select a reason...</option>
            {REFUND_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="input-field resize-none"
            rows={2}
            placeholder="Optional — any extra context for the refund"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5 border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleRefund}
            disabled={saving || amount <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Issue Refund · {formatCurrency(amount)}
          </button>
        </div>
      </div>
    </Modal>
  );
}
