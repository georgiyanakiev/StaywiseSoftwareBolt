import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Search, Eye, Send, CheckCircle2, Printer, XCircle,
  AlertCircle, Clock, Loader2, ChevronLeft, ChevronRight, Copy,
  Ban, Settings, TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import InvoiceEditorModal from './InvoiceEditorModal';
import InvoicePrintView from './InvoicePrintView';
import { Link } from 'react-router-dom';

export interface InvoiceLine {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  discount_pct: number;
  line_total: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  guest_name: string;
  guest_email: string;
  guest_address: string;
  guest_city: string;
  guest_country: string;
  guest_vat_number: string;
  booking_reference: string;
  reservation_id: string | null;
  issue_date: string;
  due_date: string;
  service_date_from: string;
  service_date_to: string;
  status: string;
  currency: string;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  notes: string;
  internal_notes: string;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  lines?: InvoiceLine[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:          { label: 'Draft',     color: 'bg-gray-100 text-gray-600',      icon: FileText },
  sent:           { label: 'Sent',      color: 'bg-blue-50 text-blue-700',       icon: Send },
  paid:           { label: 'Paid',      color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  partially_paid: { label: 'Partial',   color: 'bg-amber-50 text-amber-700',     icon: TrendingUp },
  overdue:        { label: 'Overdue',   color: 'bg-red-50 text-red-700',         icon: AlertCircle },
  cancelled:      { label: 'Cancelled', color: 'bg-gray-100 text-gray-400',      icon: XCircle },
  void:           { label: 'Void',      color: 'bg-gray-100 text-gray-400',      icon: Ban },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  invoice:     { label: 'Invoice',     color: 'bg-blue-50 text-blue-700' },
  receipt:     { label: 'Receipt',     color: 'bg-emerald-50 text-emerald-700' },
  credit_note: { label: 'Credit Note', color: 'bg-orange-50 text-orange-700' },
  proforma:    { label: 'Proforma',    color: 'bg-gray-100 text-gray-600' },
};

const PAGE_SIZE = 15;

interface AggStats {
  invoicedThisMonth: number;
  collected: number;
  outstanding: number;
  overdueAmount: number;
  overdueCount: number;
}

export default function InvoicingPage() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [stats, setStats] = useState<AggStats>({ invoicedThisMonth: 0, collected: 0, outstanding: 0, overdueAmount: 0, overdueCount: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadStats = useCallback(async () => {
    if (!currentHotel) return;
    const { data: all } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, paid_amount, status, created_at')
      .eq('hotel_id', currentHotel.id)
      .not('status', 'in', '("cancelled","void")');

    if (!all) return;
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    let invoicedThisMonth = 0;
    let collected = 0;
    let outstanding = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    for (const i of all) {
      const d = new Date(i.created_at);
      if (d.getMonth() === m && d.getFullYear() === y) {
        invoicedThisMonth += Number(i.total_amount);
      }
      const paid = Math.max(Number(i.amount_paid), Number(i.paid_amount));
      if (i.status === 'paid') {
        collected += paid;
      } else if (i.status === 'overdue') {
        collected += paid;
        overdueAmount += Number(i.total_amount) - paid;
        overdueCount++;
      } else if (['sent', 'partially_paid'].includes(i.status)) {
        collected += paid;
        outstanding += Number(i.total_amount) - paid;
      }
    }
    setStats({ invoicedThisMonth, collected, outstanding, overdueAmount, overdueCount });
  }, [currentHotel]);

  const loadInvoices = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    let q = supabase
      .from('invoices')
      .select('*, lines:invoice_items(*)', { count: 'exact' })
      .eq('hotel_id', currentHotel.id)
      .order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    if (typeFilter) q = q.eq('type', typeFilter);
    if (debouncedSearch) q = q.ilike('guest_name', `%${debouncedSearch}%`);
    q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, count } = await q;
    setInvoices((data ?? []) as Invoice[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [currentHotel, page, statusFilter, typeFilter, debouncedSearch]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const reload = () => { loadInvoices(); loadStats(); };

  const markPaid = async (inv: Invoice) => {
    setActioning(inv.id);
    const remaining = Number(inv.total_amount) - Math.max(Number(inv.paid_amount), 0);
    await supabase.from('invoices').update({
      status: 'paid',
      amount_paid: inv.total_amount,
      paid_amount: inv.total_amount,
      paid_at: new Date().toISOString(),
    }).eq('id', inv.id);
    if (remaining > 0.01) {
      const { data: invRow } = await supabase.from('invoices').select('guest_id, hotel_id, tenant_id').eq('id', inv.id).maybeSingle();
      if (invRow) {
        await supabase.from('payments').insert({
          hotel_id: invRow.hotel_id,
          ...(invRow.tenant_id ? { tenant_id: invRow.tenant_id } : {}),
          invoice_id: inv.id,
          guest_id: invRow.guest_id,
          amount: remaining,
          payment_method: 'card',
          payment_date: new Date().toISOString(),
          notes: 'Marked as paid via invoicing',
          processed_by: 'Invoicing',
        });
      }
    }
    setActioning(null);
    reload();
    toast('success', 'Invoice marked as paid');
  };

  const sendInvoice = async (inv: Invoice) => {
    setActioning(inv.id);
    await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', inv.id);
    setActioning(null);
    reload();
    toast('success', 'Invoice marked as sent');
  };

  const voidInvoice = async (inv: Invoice) => {
    if (!confirm(`Void invoice ${inv.invoice_number}? This cannot be undone.`)) return;
    setActioning(inv.id);
    await supabase.from('invoices').update({ status: 'void' }).eq('id', inv.id);
    setActioning(null);
    reload();
    toast('success', 'Invoice voided');
  };

  const duplicateInvoice = async (inv: Invoice) => {
    setActioning(inv.id);
    const now = new Date();
    const num = `INV-${now.getFullYear()}-${String(now.getTime()).slice(-4)}`;
    const { data: newInv } = await supabase.from('invoices').insert({
      hotel_id: currentHotel!.id,
      invoice_number: num,
      type: inv.type,
      guest_name: inv.guest_name,
      guest_email: inv.guest_email,
      guest_address: inv.guest_address,
      guest_city: inv.guest_city,
      guest_country: inv.guest_country,
      guest_vat_number: inv.guest_vat_number,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      currency: inv.currency,
      discount_type: inv.discount_type,
      discount_value: inv.discount_value,
      discount_amount: inv.discount_amount,
      tax_rate: inv.tax_rate,
      subtotal: inv.subtotal,
      tax_amount: inv.tax_amount,
      total_amount: inv.total_amount,
      paid_amount: 0,
      notes: inv.notes,
      guest_id: null,
    }).select('id').single();

    if (newInv && inv.lines?.length) {
      await supabase.from('invoice_items').insert(
        inv.lines.map(l => ({
          hotel_id: currentHotel!.id,
          invoice_id: newInv.id,
          description: l.description,
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          total_price: l.line_total,
          tax_rate: l.tax_rate,
          discount_pct: l.discount_pct,
          line_total: l.line_total,
          sort_order: l.sort_order,
        }))
      );
    }
    setActioning(null);
    reload();
    toast('success', `Duplicated as ${num}`);
  };

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
        <div className="flex items-center gap-2">
          <Link to="/invoicing/settings" className="btn-secondary flex items-center gap-2 py-2">
            <Settings className="w-4 h-4" /> Settings
          </Link>
          <button onClick={() => { setEditingInvoice(null); setShowEditor(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Invoiced This Month', value: formatCurrency(stats.invoicedThisMonth), color: 'text-gray-900', bg: 'bg-blue-50', icon: FileText, iconColor: 'text-blue-600' },
          { label: 'Collected', value: formatCurrency(stats.collected), color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2, iconColor: 'text-emerald-600' },
          { label: 'Outstanding', value: formatCurrency(stats.outstanding), color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock, iconColor: 'text-amber-600' },
          { label: 'Overdue', value: stats.overdueCount > 0 ? `${stats.overdueCount} (${formatCurrency(stats.overdueAmount)})` : '0', color: 'text-red-700', bg: 'bg-red-50', icon: AlertCircle, iconColor: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2" placeholder="Search by guest name..." />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} className="input-field py-2 flex-1 sm:flex-none sm:w-36">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }} className="input-field py-2 flex-1 sm:flex-none sm:w-36">
            <option value="">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-header">Invoice #</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Guest</th>
                  <th className="table-header">Issue Date</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header text-right">Total</th>
                  <th className="table-header text-right">Paid</th>
                  <th className="table-header text-right">Balance</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const sCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
                  const tCfg = TYPE_CONFIG[inv.type] ?? TYPE_CONFIG.invoice;
                  const balance = Number(inv.total_amount) - Number(inv.paid_amount);
                  const isActioning = actioning === inv.id;
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                      <td className="table-cell font-mono text-xs font-semibold text-blue-700">{inv.invoice_number}</td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tCfg.color}`}>{tCfg.label}</span>
                      </td>
                      <td className="table-cell">
                        <p className="font-medium text-gray-900 text-sm">{inv.guest_name}</p>
                        {inv.guest_email && <p className="text-xs text-gray-400">{inv.guest_email}</p>}
                      </td>
                      <td className="table-cell text-gray-600 text-sm">{inv.issue_date ? formatDate(inv.issue_date) : '---'}</td>
                      <td className="table-cell text-gray-600 text-sm">{inv.due_date ? formatDate(inv.due_date) : '---'}</td>
                      <td className="table-cell text-right font-semibold text-gray-900">{formatCurrency(Number(inv.total_amount))}</td>
                      <td className="table-cell text-right text-gray-600">{Number(inv.paid_amount) > 0 ? formatCurrency(Number(inv.paid_amount)) : '---'}</td>
                      <td className={`table-cell text-right font-medium ${balance > 0 && inv.status !== 'paid' ? 'text-red-600' : 'text-gray-400'}`}>
                        {balance > 0 && inv.status !== 'paid' ? formatCurrency(balance) : '---'}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${sCfg.color}`}>
                          <sCfg.icon className="w-3 h-3" />
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-0.5">
                          {isActioning ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : (
                            <>
                              <Btn icon={Eye} title="View / Edit" onClick={() => { setEditingInvoice(inv); setShowEditor(true); }} />
                              <Btn icon={Printer} title="Print / PDF" onClick={() => setPrintInvoice(inv)} />
                              {inv.status === 'draft' && <Btn icon={Send} title="Mark as Sent" onClick={() => sendInvoice(inv)} hoverColor="hover:text-blue-600" />}
                              {['sent','overdue','partially_paid'].includes(inv.status) && <Btn icon={CheckCircle2} title="Mark as Paid" onClick={() => markPaid(inv)} hoverColor="hover:text-emerald-600" />}
                              <Btn icon={Copy} title="Duplicate" onClick={() => duplicateInvoice(inv)} />
                              {!['void','paid'].includes(inv.status) && <Btn icon={Ban} title="Void" onClick={() => voidInvoice(inv)} hoverColor="hover:text-red-500" />}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-gray-400">
                      <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No invoices found</p>
                      <p className="text-sm mt-1">Create your first invoice to get started</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="lg:hidden divide-y divide-gray-100">
            {invoices.map(inv => {
              const sCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
              const tCfg = TYPE_CONFIG[inv.type] ?? TYPE_CONFIG.invoice;
              const balance = Number(inv.total_amount) - Number(inv.paid_amount);
              const isActioning = actioning === inv.id;
              return (
                <div key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{inv.guest_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-blue-700">{inv.invoice_number}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tCfg.color}`}>{tCfg.label}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${sCfg.color}`}>
                      <sCfg.icon className="w-3 h-3" />
                      {sCfg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-gray-400">Issued</span>
                      <p className="font-medium text-gray-700 mt-0.5">{inv.issue_date ? formatDate(inv.issue_date, 'MMM d') : '---'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Due</span>
                      <p className="font-medium text-gray-700 mt-0.5">{inv.due_date ? formatDate(inv.due_date, 'MMM d') : '---'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400">Total</span>
                      <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(Number(inv.total_amount))}</p>
                    </div>
                  </div>

                  {balance > 0 && inv.status !== 'paid' && (
                    <div className="flex items-center justify-between text-xs mb-2 bg-red-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-red-600 font-medium">Balance due</span>
                      <span className="text-red-700 font-bold">{formatCurrency(balance)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 pt-2 border-t border-gray-50">
                    {isActioning ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        <Btn icon={Eye} title="View" onClick={() => { setEditingInvoice(inv); setShowEditor(true); }} />
                        <Btn icon={Printer} title="Print" onClick={() => setPrintInvoice(inv)} />
                        {inv.status === 'draft' && <Btn icon={Send} title="Send" onClick={() => sendInvoice(inv)} hoverColor="hover:text-blue-600" />}
                        {['sent','overdue','partially_paid'].includes(inv.status) && <Btn icon={CheckCircle2} title="Paid" onClick={() => markPaid(inv)} hoverColor="hover:text-emerald-600" />}
                        <Btn icon={Copy} title="Copy" onClick={() => duplicateInvoice(inv)} />
                        {!['void','paid'].includes(inv.status) && <Btn icon={Ban} title="Void" onClick={() => voidInvoice(inv)} hoverColor="hover:text-red-500" />}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {invoices.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No invoices found</p>
                <p className="text-sm mt-1">Create your first invoice to get started</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs sm:text-sm text-gray-500">
                <span className="hidden sm:inline">Showing {page * PAGE_SIZE + 1}--{Math.min((page + 1) * PAGE_SIZE, total)} of </span>
                {total} invoices
              </p>
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
          onSaved={() => { setShowEditor(false); reload(); toast('success', 'Invoice saved'); }}
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

function Btn({ icon: Icon, title, onClick, hoverColor = 'hover:text-gray-700' }: {
  icon: React.ElementType; title: string; onClick: () => void; hoverColor?: string;
}) {
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded text-gray-400 ${hoverColor} hover:bg-gray-100 transition-colors`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
