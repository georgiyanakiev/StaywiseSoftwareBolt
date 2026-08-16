import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, BookOpen, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../lib/utils';
import { useTenantId } from '../../hooks/useTenantQuery';
import type { Invoice, InvoiceLine } from './InvoicingPage';

interface Reservation {
  id: string;
  confirmation_code: string;
  check_in: string;
  check_out: string;
  guest?: { first_name: string; last_name: string; email: string };
  room_type?: { name: string; base_rate: number };
}

interface Props {
  hotelId: string;
  invoice: Invoice | null;
  onClose: () => void;
  onSaved: () => void;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'BGN'];
const CATEGORIES = ['accommodation','food_beverage','transport','spa','parking','meeting','service','other'];
const UNITS = ['night','day','person','item','hour','session','service'];

const emptyLine = (): InvoiceLine => ({
  id: crypto.randomUUID(),
  description: '',
  category: 'accommodation',
  quantity: 1,
  unit: 'night',
  unit_price: 0,
  tax_rate: 20,
  discount_pct: 0,
  line_total: 0,
  sort_order: 0,
});

type FormState = {
  invoice_number: string;
  type: string;
  guest_name: string;
  guest_email: string;
  guest_address: string;
  guest_city: string;
  guest_country: string;
  guest_vat_number: string;
  booking_reference: string;
  reservation_id: string;
  issue_date: string;
  due_date: string;
  service_date_from: string;
  service_date_to: string;
  status: string;
  currency: string;
  discount_type: string;
  discount_value: string;
  notes: string;
  internal_notes: string;
  tax_rate: string;
};

export default function InvoiceEditorModal({ hotelId, invoice, onClose, onSaved }: Props) {
  const tenantId = useTenantId();
  const now = new Date();
  const [form, setForm] = useState<FormState>({
    invoice_number: `INV-${now.getFullYear()}-${String(now.getTime()).slice(-4)}`,
    type: 'invoice',
    guest_name: '',
    guest_email: '',
    guest_address: '',
    guest_city: '',
    guest_country: '',
    guest_vat_number: '',
    booking_reference: '',
    reservation_id: '',
    issue_date: now.toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    service_date_from: '',
    service_date_to: '',
    status: 'draft',
    currency: 'EUR',
    discount_type: 'fixed',
    discount_value: '0',
    notes: '',
    internal_notes: '',
    tax_rate: '20',
  });
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (invoice) {
      setForm({
        invoice_number: invoice.invoice_number,
        type: invoice.type || 'invoice',
        guest_name: invoice.guest_name,
        guest_email: invoice.guest_email || '',
        guest_address: invoice.guest_address || '',
        guest_city: invoice.guest_city || '',
        guest_country: invoice.guest_country || '',
        guest_vat_number: invoice.guest_vat_number || '',
        booking_reference: invoice.booking_reference || '',
        reservation_id: invoice.reservation_id || '',
        issue_date: invoice.issue_date,
        due_date: invoice.due_date || '',
        service_date_from: invoice.service_date_from || '',
        service_date_to: invoice.service_date_to || '',
        status: invoice.status,
        currency: invoice.currency || 'EUR',
        discount_type: invoice.discount_type || 'fixed',
        discount_value: String(invoice.discount_value ?? 0),
        notes: invoice.notes || '',
        internal_notes: invoice.internal_notes || '',
        tax_rate: String(invoice.tax_rate ?? 20),
      });
      setLines(invoice.lines?.length ? invoice.lines : [emptyLine()]);
    }
  }, [invoice]);

  const loadReservations = useCallback(async () => {
    const { data } = await supabase
      .from('reservations')
      .select('id, confirmation_code, check_in, check_out, guest:guests(first_name,last_name,email), room_type:room_types(name,base_rate)')
      .eq('hotel_id', hotelId)
      .in('status', ['confirmed','checked_in','checked_out'])
      .order('check_in', { ascending: false })
      .limit(50);
    setReservations((data ?? []) as Reservation[]);
  }, [hotelId]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  const importFromBooking = (resId: string) => {
    const res = reservations.find(r => r.id === resId);
    if (!res) return;
    const checkIn = new Date(res.check_in);
    const checkOut = new Date(res.check_out);
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
    const baseRate = res.room_type?.base_rate ?? 100;

    setForm(f => ({
      ...f,
      reservation_id: res.id,
      booking_reference: res.confirmation_code,
      guest_name: res.guest ? `${res.guest.first_name} ${res.guest.last_name}` : f.guest_name,
      guest_email: res.guest?.email ?? f.guest_email,
      service_date_from: res.check_in,
      service_date_to: res.check_out,
    }));

    setLines([{
      id: crypto.randomUUID(),
      description: `${res.room_type?.name ?? 'Accommodation'} — ${nights} night${nights !== 1 ? 's' : ''}`,
      category: 'accommodation',
      quantity: nights,
      unit: 'night',
      unit_price: baseRate,
      tax_rate: Number(form.tax_rate),
      discount_pct: 0,
      line_total: nights * baseRate,
      sort_order: 0,
    }]);
  };

  const setF = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const updateLine = (id: string, key: keyof InvoiceLine, value: string | number) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [key]: value };
      const pre = updated.quantity * updated.unit_price;
      updated.line_total = pre * (1 - updated.discount_pct / 100);
      return updated;
    }));
  };

  const subtotal = lines.reduce((s, l) => s + Number(l.line_total), 0);
  const taxTotal = lines.reduce((s, l) => s + (Number(l.line_total) * Number(l.tax_rate) / 100), 0);
  const discountAmt = form.discount_type === 'percentage'
    ? subtotal * (Number(form.discount_value) / 100)
    : Number(form.discount_value);
  const grandTotal = subtotal + taxTotal - discountAmt;

  const handleSave = async (status: string) => {
    if (!form.guest_name.trim()) return;
    setSaving(true);
    const payload = {
      hotel_id: hotelId,
      invoice_number: form.invoice_number,
      type: form.type,
      guest_name: form.guest_name,
      guest_email: form.guest_email,
      guest_address: form.guest_address,
      guest_city: form.guest_city,
      guest_country: form.guest_country,
      guest_vat_number: form.guest_vat_number,
      booking_reference: form.booking_reference,
      reservation_id: form.reservation_id || null,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      service_date_from: form.service_date_from || null,
      service_date_to: form.service_date_to || null,
      status,
      currency: form.currency,
      discount_type: form.discount_type || null,
      discount_value: Number(form.discount_value),
      discount_amount: discountAmt,
      tax_rate: Number(form.tax_rate),
      subtotal,
      tax_amount: taxTotal,
      total_amount: grandTotal,
      amount_paid: invoice ? Math.max(Number(invoice.paid_amount), 0) : 0,
      paid_amount: invoice ? Math.max(Number(invoice.paid_amount), 0) : 0,
      notes: form.notes,
      internal_notes: form.internal_notes,
      updated_at: new Date().toISOString(),
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
    };

    let invoiceId = invoice?.id;
    if (invoiceId) {
      await supabase.from('invoices').update(payload).eq('id', invoiceId);
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
    } else {
      const { data } = await supabase.from('invoices').insert({ ...payload, guest_id: null }).select('id').single();
      invoiceId = data?.id;
    }

    if (invoiceId && lines.length) {
      await supabase.from('invoice_items').insert(
        lines.map((l, i) => ({
          hotel_id: hotelId,
          invoice_id: invoiceId,
          description: l.description,
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          total_price: l.line_total,
          tax_rate: l.tax_rate,
          discount_pct: l.discount_pct,
          line_total: l.line_total,
          sort_order: i,
          ...(tenantId ? { tenant_id: tenantId } : {}),
        }))
      );
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={invoice ? `Edit ${invoice.invoice_number}` : 'New Invoice'} size="xl">
      <div className="space-y-5 p-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Guest Information</h4>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Import from Booking</label>
                <div className="flex gap-2">
                  <select
                    className="input-field text-sm"
                    onChange={e => importFromBooking(e.target.value)}
                    defaultValue=""
                  >
                    <option value="">Select booking...</option>
                    {reservations.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.confirmation_code} — {r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : '(unknown)'}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Guest Name *</label>
              <input value={form.guest_name} onChange={e => setF('guest_name', e.target.value)} className="input-field" placeholder="Full name or company" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={form.guest_email} onChange={e => setF('guest_email', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <input value={form.guest_address} onChange={e => setF('guest_address', e.target.value)} className="input-field" placeholder="Street address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input value={form.guest_city} onChange={e => setF('guest_city', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <input value={form.guest_country} onChange={e => setF('guest_country', e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">VAT Number</label>
              <input value={form.guest_vat_number} onChange={e => setF('guest_vat_number', e.target.value)} className="input-field" placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Invoice Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Number</label>
                <input value={form.invoice_number} onChange={e => setF('invoice_number', e.target.value)} className="input-field font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select value={form.type} onChange={e => setF('type', e.target.value)} className="input-field">
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="credit_note">Credit Note</option>
                  <option value="proforma">Proforma</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Issue Date</label>
                <input type="date" value={form.issue_date} onChange={e => setF('issue_date', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Service From</label>
                <input type="date" value={form.service_date_from} onChange={e => setF('service_date_from', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Service To</label>
                <input type="date" value={form.service_date_to} onChange={e => setF('service_date_to', e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                <select value={form.currency} onChange={e => setF('currency', e.target.value)} className="input-field">
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking Ref</label>
                <input value={form.booking_reference} onChange={e => setF('booking_reference', e.target.value)} className="input-field font-mono text-sm" placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (shown on invoice)</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} className="input-field resize-none text-sm" rows={2} placeholder="Payment instructions, thank you note..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Internal Notes</label>
              <textarea value={form.internal_notes} onChange={e => setF('internal_notes', e.target.value)} className="input-field resize-none text-sm" rows={2} placeholder="For staff only, not shown on invoice..." />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Line Items</h4>
            <button onClick={() => setLines(l => [...l, emptyLine()])} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header text-left w-8"></th>
                  <th className="table-header text-left">Description</th>
                  <th className="table-header text-left w-28">Category</th>
                  <th className="table-header text-center w-16">Qty</th>
                  <th className="table-header text-left w-20">Unit</th>
                  <th className="table-header text-right w-24">Unit Price</th>
                  <th className="table-header text-center w-16">Tax %</th>
                  <th className="table-header text-center w-16">Disc %</th>
                  <th className="table-header text-right w-24">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map(line => (
                  <tr key={line.id} className="border-b border-gray-50 group">
                    <td className="py-2 pr-1 text-gray-300">
                      <GripVertical className="w-4 h-4" />
                    </td>
                    <td className="py-2 pr-2">
                      <input value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)} className="input-field py-1.5 text-sm" placeholder="Room accommodation..." />
                    </td>
                    <td className="py-2 px-1">
                      <select value={line.category} onChange={e => updateLine(line.id, 'category', e.target.value)} className="input-field py-1.5 text-sm">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" min={0.001} step={0.001} value={line.quantity} onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))} className="input-field py-1.5 text-sm text-center w-full" />
                    </td>
                    <td className="py-2 px-1">
                      <select value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)} className="input-field py-1.5 text-sm">
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" min={0} step={0.01} value={line.unit_price} onChange={e => updateLine(line.id, 'unit_price', Number(e.target.value))} className="input-field py-1.5 text-sm text-right w-full" />
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" min={0} max={100} value={line.tax_rate} onChange={e => updateLine(line.id, 'tax_rate', Number(e.target.value))} className="input-field py-1.5 text-sm text-center w-full" />
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" min={0} max={100} value={line.discount_pct} onChange={e => updateLine(line.id, 'discount_pct', Number(e.target.value))} className="input-field py-1.5 text-sm text-center w-full" />
                    </td>
                    <td className="py-2 px-1 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(line.line_total)}
                    </td>
                    <td className="py-2 pl-1">
                      <button onClick={() => setLines(l => l.filter(ll => ll.id !== line.id))} disabled={lines.length === 1} className="text-gray-300 hover:text-red-500 transition-colors disabled:cursor-not-allowed opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount Type</label>
                  <select value={form.discount_type} onChange={e => setF('discount_type', e.target.value)} className="input-field text-sm">
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage %</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {form.discount_type === 'percentage' ? 'Discount %' : 'Discount Amount'}
                  </label>
                  <input type="number" min={0} step={0.01} value={form.discount_value} onChange={e => setF('discount_value', e.target.value)} className="input-field text-sm" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount {form.discount_type === 'percentage' ? `(${form.discount_value}%)` : ''}</span>
                  <span>−{formatCurrency(discountAmt)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax</span><span className="font-medium">{formatCurrency(taxTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-lg border-t border-gray-200 pt-2 mt-1">
                <span>Total</span><span className="text-blue-700">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => handleSave('draft')} disabled={saving || !form.guest_name.trim()} className="btn-secondary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save as Draft
          </button>
          <button onClick={() => handleSave('sent')} disabled={saving || !form.guest_name.trim()} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save & Mark Sent
          </button>
        </div>
      </div>
    </Modal>
  );
}
