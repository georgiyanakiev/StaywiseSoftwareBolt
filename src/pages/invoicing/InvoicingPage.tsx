import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, Eye, Send, CheckCircle2, Printer, Download, XCircle, DollarSign, TrendingUp, AlertCircle, Clock, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatCurrency, generateInvoiceNumber } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import InvoiceEditorModal from './InvoiceEditorModal';
import InvoicePrintView from './InvoicePrintView';

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  guest_name: string;
  guest_email: string;
  guest_address: string;
  guest_vat_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  notes: string;
  created_at: string;
  lines?: InvoiceLine[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-50 text-blue-700', icon: Send },
  paid: { label: 'Paid', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'bg-red-50 text-red-700', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-400', icon: XCircle },
};

const PAGE_SIZE = 10;

export default function InvoicingPage() {
  const { currentHotel } = useHotel();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const loadInvoices = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    let q = supabase
      .from('invoices_v2')
      .select('*, lines:invoice_lines(*)', { count: 'exact' })
      .eq('hotel_id', currentHotel.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (statusFilter) q = q.eq('status', statusFilter);
    if (search) q = q.ilike('guest_name', `%${search}%`);
    const { data, count } = await q;
    setInvoices((data ?? []) as Invoice[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [currentHotel, page, statusFilter, search]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const markPaid = async (id: string, total: number) => {
    await supabase.from('invoices_v2').update({ status: 'paid', paid_amount: total }).eq('id', id);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'paid', paid_amount: total } : inv));
    showToast('Invoice marked as paid', 'success');
  };

  const sendInvoice = async (id: string) => {
    await supabase.from('invoices_v2').update({ status: 'sent' }).eq('id', id);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'sent' } : inv));
    showToast('Invoice marked as sent', 'success');
  };

  const deleteInvoice = async (id: string) => {
    await supabase.from('invoices_v2').delete().eq('id', id);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    showToast('Invoice deleted', 'success');
  };

  const thisMonth = invoices.filter(i => {
    const d = new Date(i.created_at);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });

  const totalInvoiced = thisMonth.reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPaid = thisMonth.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0);
  const totalOutstanding = thisMonth.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (Number(i.total_amount) - Number(i.paid_amount)), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            Invoicing
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create, send, and manage invoices and receipts</p>
        </div>
        <button onClick={() => { setEditingInvoice(null); setShowEditor(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Invoiced This Month', value: formatCurrency(totalInvoiced), color: 'text-gray-900', icon: FileText },
          { label: 'Paid', value: formatCurrency(totalPaid), color: 'text-emerald-600', icon: CheckCircle2 },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), color: 'text-amber-600', icon: Clock },
          { label: 'Overdue', value: overdueCount, color: 'text-red-600', icon: AlertCircle },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="input-field pl-9 py-2" placeholder="Search by guest name..." />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} className="input-field py-2 w-36">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Invoice #</th>
                <th className="table-header">Guest</th>
                <th className="table-header">Issue Date</th>
                <th className="table-header">Due Date</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
                const StatusIcon = cfg.icon;
                return (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell font-mono text-xs font-semibold text-blue-700">{inv.invoice_number}</td>
                    <td className="table-cell">
                      <p className="font-medium text-gray-900">{inv.guest_name}</p>
                      <p className="text-xs text-gray-400">{inv.guest_email}</p>
                    </td>
                    <td className="table-cell text-gray-600 text-sm">{formatDate(inv.issue_date)}</td>
                    <td className="table-cell text-gray-600 text-sm">{formatDate(inv.due_date)}</td>
                    <td className="table-cell text-right font-semibold text-gray-900">{formatCurrency(Number(inv.total_amount))}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPrintInvoice(inv)} className="text-gray-400 hover:text-gray-700 transition-colors p-1" title="Print">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingInvoice(inv); setShowEditor(true); }} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit">
                          <Eye className="w-4 h-4" />
                        </button>
                        {inv.status === 'draft' && (
                          <button onClick={() => sendInvoice(inv.id)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Send">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {inv.status === 'sent' && (
                          <button onClick={() => markPaid(inv.id, Number(inv.total_amount))} className="text-gray-400 hover:text-emerald-600 transition-colors p-1" title="Mark Paid">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {inv.status === 'draft' && (
                          <button onClick={() => deleteInvoice(inv.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No invoices found</p>
                    <p className="text-sm mt-1">Create your first invoice to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showEditor && currentHotel && (
        <InvoiceEditorModal
          hotelId={currentHotel.id}
          invoice={editingInvoice}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); loadInvoices(); showToast('Invoice saved', 'success'); }}
        />
      )}

      {printInvoice && currentHotel && (
        <InvoicePrintView
          invoice={printInvoice}
          hotel={currentHotel}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </div>
  );
}
