import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/ui/Modal';
import { useTenantId } from '../../hooks/useTenantQuery';

interface Props {
  hotelId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function PaymentRuleModal({ hotelId, onClose, onSaved }: Props) {
  const tenantId = useTenantId();
  const [form, setForm] = useState({
    name: '',
    trigger: 'on_booking',
    days_before: 7,
    amount_type: 'percentage',
    amount_value: 30,
    payment_type: 'deposit',
    applies_to: 'all',
    send_reminder: true,
    reminder_days_before: 3,
    active: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('payment_rules').insert({
      hotel_id: hotelId,
      ...form,
      days_before: form.trigger === 'days_before_arrival' ? form.days_before : null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    });
    setSaving(false);
    onSaved();
  };

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Modal isOpen onClose={onClose} title="Add Payment Rule" size="md">
      <div className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Rule Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="input-field"
            placeholder="e.g. 30% deposit on booking"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Trigger</label>
          <select value={form.trigger} onChange={e => set('trigger', e.target.value)} className="input-field">
            <option value="on_booking">On Booking</option>
            <option value="days_before_arrival">Days Before Arrival</option>
            <option value="on_checkin">On Check-in</option>
            <option value="on_checkout">On Check-out</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {form.trigger === 'days_before_arrival' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Days Before Arrival</label>
            <input
              type="number"
              min={1}
              value={form.days_before}
              onChange={e => set('days_before', Number(e.target.value))}
              className="input-field"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount Type</label>
            <select value={form.amount_type} onChange={e => set('amount_type', e.target.value)} className="input-field">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
              <option value="first_night">First Night Rate</option>
              <option value="full_balance">Full Balance</option>
            </select>
          </div>
          {(form.amount_type === 'percentage' || form.amount_type === 'fixed') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {form.amount_type === 'percentage' ? 'Percentage (%)' : 'Amount (€)'}
              </label>
              <input
                type="number"
                min={0}
                value={form.amount_value}
                onChange={e => set('amount_value', Number(e.target.value))}
                className="input-field"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Type</label>
            <select value={form.payment_type} onChange={e => set('payment_type', e.target.value)} className="input-field">
              <option value="deposit">Deposit</option>
              <option value="charge">Charge</option>
              <option value="pre_authorisation">Pre-authorisation</option>
              <option value="refund">Refund</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Applies To</label>
            <select value={form.applies_to} onChange={e => set('applies_to', e.target.value)} className="input-field">
              <option value="all">All Bookings</option>
              <option value="direct">Direct Only</option>
              <option value="ota">OTA Only</option>
              <option value="walk_in">Walk-in Only</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.send_reminder}
              onChange={e => set('send_reminder', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Send payment reminder email</span>
          </label>
          {form.send_reminder && (
            <div className="ml-7">
              <label className="block text-xs text-gray-500 mb-1">Send reminder N days before scheduled date</label>
              <input
                type="number"
                min={1}
                max={30}
                value={form.reminder_days_before}
                onChange={e => set('reminder_days_before', Number(e.target.value))}
                className="input-field py-1.5 text-sm w-24"
              />
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={e => set('active', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">Rule is active</span>
        </label>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Rule
          </button>
        </div>
      </div>
    </Modal>
  );
}
