import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../lib/utils';

interface Transaction {
  id: string;
  guest_name: string;
  amount: number;
  currency: string;
}

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onRefunded: (id: string, amount: number) => void;
}

export default function RefundModal({ transaction, onClose, onRefunded }: Props) {
  const [amount, setAmount] = useState(transaction.amount);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleRefund = async () => {
    setSaving(true);
    await supabase.from('payment_transactions').update({
      status: 'refunded',
      notes: reason,
      processed_at: new Date().toISOString(),
    }).eq('id', transaction.id);
    setSaving(false);
    onRefunded(transaction.id, amount);
  };

  return (
    <Modal isOpen onClose={onClose} title="Issue Refund" size="sm">
      <div className="space-y-4 p-1">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Guest</p>
          <p className="font-medium text-gray-900">{transaction.guest_name}</p>
          <p className="text-sm text-gray-500 mt-2">Original charge</p>
          <p className="font-semibold text-gray-900">{formatCurrency(transaction.amount)}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Refund Amount</label>
          <input
            type="number"
            min={0.01}
            max={transaction.amount}
            step={0.01}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} className="input-field resize-none" rows={3} placeholder="Guest cancellation, booking error..." />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleRefund} disabled={saving || amount <= 0} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Issue Refund
          </button>
        </div>
      </div>
    </Modal>
  );
}
