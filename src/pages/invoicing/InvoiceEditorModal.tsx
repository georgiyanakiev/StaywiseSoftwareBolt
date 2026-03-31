import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/ui/Modal';
import { formatCurrency, generateInvoiceNumber } from '../../lib/utils';
import { useTenantId } from '../../hooks/useTenantQuery';

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

interface Invoice {
  id?: string;
  invoice_number: string;
  guest_name: string;
  guest_email: string;
  guest_address: string;
  guest_vat_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  currency: string;
  tax_rate: number;
  discount_amount: number;
  notes: string;
  lines?: InvoiceLine[];
}

interface Props {
  hotelId: string;
  invoice: Invoice | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyLine = (): InvoiceLine => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 20,
  line_total: 0,
});

const CURRENCIES = ['EUR', 'USD', 'GBP', 'BGN', 'CHF', 'CAD'];

export default function InvoiceEditorModal({ hotelId, invoice, onClose, onSaved }: Props) {
  const tenantId = useTenantId();
  const [form, setForm] = useState<Invoice>({
    invoice_number: generateInvoiceNumber(),
    guest_name: '',
    guest_email: '',
    guest_address: '',
    guest_vat_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'draft',
    currency: 'EUR',
    tax_rate: 20,
    discount_amount: 0,
    notes: '',
  });
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoice) {
      setForm({ ...invoice });
      setLines(invoice.lines && invoice.lines.length > 0 ? invoice.lines : [emptyLine()]);
    }
  }, [invoice]);

  const updateLine = (id: string, key: keyof InvoiceLine, value: string | number) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [key]: value };
      updated.line_total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const taxTotal = lines.reduce((s, l) => s + (l.line_total * l.tax_rate / 100), 0);
  const discount = Number(form.discount_amount) || 0;
  const grandTotal = subtotal + taxTotal - discount;

  const handleSave = async (asDraft: boolean) => {
    setSaving(true);
    const status = asDraft ? 'draft' : 'sent';
    const payload = {
      hotel_id: hotelId,
      ...form,
      status,
      subtotal,
      tax_amount: taxTotal,
      total_amount: grandTotal,
      updated_at: new Date().toISOString(),
      ...(tenantId ? { tenant_id: tenantId } : {}),
    };

    let invoiceId = invoice?.id;
    if (invoiceId) {
      await supabase.from('invoices_v2').update(payload).eq('id', invoiceId);
      await supabase.from('invoice_lines').delete().eq('invoice_id', invoiceId);
    } else {
      const { data } = await supabase.from('invoices_v2').insert(payload).select('id').single();
      invoiceId = data?.id;
    }

    if (invoiceId) {
      await supabase.from('invoice_lines').insert(
        lines.map(l => ({
          invoice_id: invoiceId,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          line_total: l.line_total,
          ...(tenantId ? { tenant_id: tenantId } : {}),
        }))
      );
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Modal isOpen onClose={onClose} title={invoice ? `Edit ${invoice.invoice_number}` : 'New Invoice'} size="xl">
      <div className="space-y-5 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Guest Information</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Guest Name *</label>
              <input value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} className="input-field" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={form.guest_email} onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <textarea value={form.guest_address} onChange={e => setForm(f => ({ ...f, guest_address: e.target.value }))} className="input-field resize-none" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">VAT Number</label>
              <input value={form.guest_vat_number} onChange={e => setForm(f => ({ ...f, guest_vat_number: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Invoice Details</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Number</label>
              <input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} className="input-field font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Issue Date</label>
                <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="input-field">
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount</label>
                <input type="number" min={0} value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: Number(e.target.value) }))} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field resize-none" rows={2} placeholder="Payment instructions, thank you notes..." />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Line Items</h4>
            <button onClick={() => setLines(l => [...l, emptyLine()])} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header text-left">Description</th>
                  <th className="table-header text-center w-20">Qty</th>
                  <th className="table-header text-right w-28">Unit Price</th>
                  <th className="table-header text-center w-20">Tax %</th>
                  <th className="table-header text-right w-28">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map(line => (
                  <tr key={line.id} className="border-b border-gray-50">
                    <td className="py-2 pr-2">
                      <input value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)} className="input-field py-1.5 text-sm" placeholder="Room accommodation..." />
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" min={1} value={line.quantity} onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))} className="input-field py-1.5 text-sm text-center w-full" />
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" min={0} step={0.01} value={line.unit_price} onChange={e => updateLine(line.id, 'unit_price', Number(e.target.value))} className="input-field py-1.5 text-sm text-right w-full" />
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" min={0} max={100} value={line.tax_rate} onChange={e => updateLine(line.id, 'tax_rate', Number(e.target.value))} className="input-field py-1.5 text-sm text-center w-full" />
                    </td>
                    <td className="py-2 px-1 text-right font-medium text-gray-900">
                      {formatCurrency(line.line_total)}
                    </td>
                    <td className="py-2 pl-1">
                      <button onClick={() => setLines(l => l.filter(ll => ll.id !== line.id))} disabled={lines.length === 1} className="text-gray-300 hover:text-red-500 transition-colors disabled:cursor-not-allowed">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-1.5 max-w-xs ml-auto text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span><span>{formatCurrency(taxTotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span><span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-1.5">
              <span>Total</span><span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => handleSave(true)} disabled={saving || !form.guest_name} className="btn-secondary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save as Draft
          </button>
          <button onClick={() => handleSave(false)} disabled={saving || !form.guest_name} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save & Send
          </button>
        </div>
      </div>
    </Modal>
  );
}
