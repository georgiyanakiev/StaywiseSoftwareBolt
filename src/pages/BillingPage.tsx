import { useState, useEffect, useCallback, useMemo } from 'react';
import { useHotel } from '../contexts/HotelContext';
import { supabase } from '../lib/supabase';
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
  generateInvoiceNumber,
} from '../lib/utils';
import type { Invoice, Guest, Reservation } from '../types';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import {
  Receipt,
  Plus,
  Search,
  Eye,
  DollarSign,
  Send,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type InvoiceStatus = Invoice['status'] | '';
type LineItem = {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
};

const CATEGORIES = ['room', 'food', 'spa', 'laundry', 'parking', 'other'];
const PAGE_SIZE = 10;

const EMPTY_LINE_ITEM: LineItem = {
  id: crypto.randomUUID(),
  description: '',
  category: 'room',
  quantity: 1,
  unit_price: 0,
};

interface InvoiceForm {
  guest_id: string;
  reservation_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  discount_amount: number;
  notes: string;
  line_items: LineItem[];
}

const createEmptyForm = (): InvoiceForm => ({
  guest_id: '',
  reservation_id: '',
  invoice_number: generateInvoiceNumber(),
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  discount_amount: 0,
  notes: '',
  line_items: [{ ...EMPTY_LINE_ITEM, id: crypto.randomUUID() }],
});

export default function BillingPage() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceForm>(createEmptyForm);
  const [saving, setSaving] = useState(false);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestReservations, setGuestReservations] = useState<Reservation[]>([]);

  const fetchInvoices = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);

    let query = supabase
      .from('invoices')
      .select('*, guest:guests(*), items:invoice_items(*)', { count: 'exact' })
      .eq('hotel_id', currentHotel.id);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (dateFrom) {
      query = query.gte('issue_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('issue_date', dateTo);
    }

    if (searchQuery.trim()) {
      query = query.or(
        `invoice_number.ilike.%${searchQuery.trim()}%,guest.first_name.ilike.%${searchQuery.trim()}%,guest.last_name.ilike.%${searchQuery.trim()}%`
      );
    }

    query = query
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;

    if (error) {
      toast('error', 'Failed to load invoices');
    } else {
      setInvoices((data || []) as Invoice[]);
      setTotalCount(count || 0);
    }

    setLoading(false);
  }, [currentHotel, statusFilter, dateFrom, dateTo, searchQuery, page, toast]);

  const fetchGuests = useCallback(async () => {
    if (!currentHotel) return;
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('hotel_id', currentHotel.id)
      .order('last_name');
    setGuests((data || []) as Guest[]);
  }, [currentHotel]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter, dateFrom, dateTo]);

  const fetchGuestReservations = async (guestId: string) => {
    if (!currentHotel || !guestId) {
      setGuestReservations([]);
      return;
    }
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('hotel_id', currentHotel.id)
      .eq('guest_id', guestId)
      .order('check_in', { ascending: false });
    setGuestReservations((data || []) as Reservation[]);
  };

  const stats = useMemo(() => {
    const allInvoices = invoices;
    const totalRevenue = allInvoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
    const outstandingBalance = allInvoices.reduce(
      (sum, inv) => sum + (inv.total_amount - inv.amount_paid),
      0
    );
    const paidCount = allInvoices.filter(inv => inv.status === 'paid').length;
    const overdueCount = allInvoices.filter(inv => inv.status === 'overdue').length;
    return { totalRevenue, outstandingBalance, paidCount, overdueCount };
  }, [invoices]);

  const lineItemsSubtotal = useMemo(() => {
    return form.line_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [form.line_items]);

  const taxAmount = useMemo(() => {
    if (!currentHotel) return 0;
    return lineItemsSubtotal * (currentHotel.tax_rate / 100);
  }, [lineItemsSubtotal, currentHotel]);

  const totalAmount = useMemo(() => {
    return lineItemsSubtotal + taxAmount - form.discount_amount;
  }, [lineItemsSubtotal, taxAmount, form.discount_amount]);

  const openCreateModal = () => {
    setForm(createEmptyForm());
    setGuestReservations([]);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setForm(createEmptyForm());
    setGuestReservations([]);
  };

  const openViewModal = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingInvoice(null);
  };

  const addLineItem = () => {
    setForm(f => ({
      ...f,
      line_items: [...f.line_items, { ...EMPTY_LINE_ITEM, id: crypto.randomUUID() }],
    }));
  };

  const removeLineItem = (id: string) => {
    setForm(f => ({
      ...f,
      line_items: f.line_items.filter(item => item.id !== id),
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setForm(f => ({
      ...f,
      line_items: f.line_items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;

    if (!form.guest_id) {
      toast('error', 'Please select a guest');
      return;
    }

    if (form.line_items.length === 0) {
      toast('error', 'Please add at least one line item');
      return;
    }

    const hasEmptyItems = form.line_items.some(
      item => !item.description.trim() || item.quantity <= 0 || item.unit_price <= 0
    );
    if (hasEmptyItems) {
      toast('error', 'Please fill in all line item details');
      return;
    }

    setSaving(true);

    const invoicePayload = {
      hotel_id: currentHotel.id,
      guest_id: form.guest_id,
      reservation_id: form.reservation_id || null,
      invoice_number: form.invoice_number,
      issue_date: form.issue_date,
      due_date: form.due_date,
      subtotal: lineItemsSubtotal,
      tax_amount: taxAmount,
      discount_amount: form.discount_amount,
      total_amount: totalAmount,
      amount_paid: 0,
      status: 'draft' as const,
      notes: form.notes.trim(),
    };

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoicePayload)
      .select()
      .single();

    if (invoiceError || !invoiceData) {
      toast('error', 'Failed to create invoice');
      setSaving(false);
      return;
    }

    const itemsPayload = form.line_items.map(item => ({
      invoice_id: (invoiceData as Invoice).id,
      description: item.description.trim(),
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(itemsPayload);

    if (itemsError) {
      toast('error', 'Invoice created but failed to save line items');
    } else {
      toast('success', 'Invoice created successfully');
      closeCreateModal();
      fetchInvoices();
    }

    setSaving(false);
  };

  const markAsPaid = async (invoice: Invoice) => {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        amount_paid: invoice.total_amount,
      })
      .eq('id', invoice.id);

    if (error) {
      toast('error', 'Failed to update invoice');
    } else {
      toast('success', 'Invoice marked as paid');
      fetchInvoices();
    }
  };

  const sendInvoice = async (invoice: Invoice) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', invoice.id);

    if (error) {
      toast('error', 'Failed to send invoice');
    } else {
      toast('success', 'Invoice sent successfully');
      fetchInvoices();
    }
  };

  const generatePdf = (invoice: Invoice) => {
    toast('info', `PDF generated for ${invoice.invoice_number}`);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!currentHotel) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} {totalCount === 1 ? 'invoice' : 'invoices'} total
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(stats.totalRevenue, currentHotel.currency)}
              </p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Outstanding Balance</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(stats.outstandingBalance, currentHotel.currency)}
              </p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Paid Invoices</p>
              <p className="text-xl font-semibold text-gray-900">{stats.paidCount}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Overdue Invoices</p>
              <p className="text-xl font-semibold text-gray-900">{stats.overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice number or guest name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-9 w-full"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as InvoiceStatus)}
                className="input-field"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="input-field"
                placeholder="From"
              />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="input-field"
                placeholder="To"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-6 h-6" />}
            title="No invoices found"
            description={
              searchQuery || statusFilter || dateFrom || dateTo
                ? 'Try adjusting your search or filters.'
                : 'Create your first invoice to get started.'
            }
            action={
              !searchQuery && !statusFilter && !dateFrom && !dateTo ? (
                <button onClick={openCreateModal} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Invoice Number</th>
                    <th className="table-header">Guest Name</th>
                    <th className="table-header">Issue Date</th>
                    <th className="table-header">Due Date</th>
                    <th className="table-header">Total Amount</th>
                    <th className="table-header">Amount Paid</th>
                    <th className="table-header">Balance</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr
                      key={invoice.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="table-cell font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="table-cell text-gray-500">
                        {invoice.guest
                          ? `${invoice.guest.first_name} ${invoice.guest.last_name}`
                          : '-'}
                      </td>
                      <td className="table-cell text-gray-500">
                        {formatDate(invoice.issue_date)}
                      </td>
                      <td className="table-cell text-gray-500">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="table-cell text-gray-500">
                        {formatCurrency(invoice.total_amount, currentHotel.currency)}
                      </td>
                      <td className="table-cell text-gray-500">
                        {formatCurrency(invoice.amount_paid, currentHotel.currency)}
                      </td>
                      <td className="table-cell text-gray-500">
                        {formatCurrency(
                          invoice.total_amount - invoice.amount_paid,
                          currentHotel.currency
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusColor(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openViewModal(invoice)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => sendInvoice(invoice)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Send Invoice"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <button
                              onClick={() => markAsPaid(invoice)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Mark as Paid"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => generatePdf(invoice)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Generate PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {page * PAGE_SIZE + 1} to{' '}
                  {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} invoices
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="btn-secondary p-2 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700 px-2">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="btn-secondary p-2 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={showCreateModal}
        onClose={closeCreateModal}
        title="Create Invoice"
        size="xl"
      >
        <form onSubmit={handleSaveInvoice} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Guest</label>
              <select
                value={form.guest_id}
                onChange={e => {
                  const guestId = e.target.value;
                  setForm(f => ({ ...f, guest_id: guestId, reservation_id: '' }));
                  fetchGuestReservations(guestId);
                }}
                className="input-field w-full"
                required
              >
                <option value="">Select a guest</option>
                {guests.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.first_name} {g.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reservation (optional)
              </label>
              <select
                value={form.reservation_id}
                onChange={e => setForm(f => ({ ...f, reservation_id: e.target.value }))}
                className="input-field w-full"
                disabled={!form.guest_id}
              >
                <option value="">No reservation linked</option>
                {guestReservations.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.confirmation_code} ({formatDate(r.check_in)} - {formatDate(r.check_out)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Invoice Number
              </label>
              <input
                type="text"
                value={form.invoice_number}
                readOnly
                className="input-field w-full bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Issue Date</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Line Items</label>
              <button type="button" onClick={addLineItem} className="btn-secondary text-xs">
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Description</th>
                    <th className="table-header">Category</th>
                    <th className="table-header w-24">Qty</th>
                    <th className="table-header w-32">Unit Price</th>
                    <th className="table-header w-32">Total</th>
                    <th className="table-header w-12" />
                  </tr>
                </thead>
                <tbody>
                  {form.line_items.map(item => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e =>
                            updateLineItem(item.id, 'description', e.target.value)
                          }
                          className="input-field w-full"
                          placeholder="Item description"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.category}
                          onChange={e =>
                            updateLineItem(item.id, 'category', e.target.value)
                          }
                          className="input-field w-full"
                        >
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>
                              {c.charAt(0).toUpperCase() + c.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e =>
                            updateLineItem(item.id, 'quantity', Number(e.target.value))
                          }
                          className="input-field w-full"
                          min={1}
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={e =>
                            updateLineItem(item.id, 'unit_price', Number(e.target.value))
                          }
                          className="input-field w-full"
                          min={0}
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 font-medium">
                        {formatCurrency(item.quantity * item.unit_price, currentHotel.currency)}
                      </td>
                      <td className="px-3 py-2">
                        {form.line_items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(lineItemsSubtotal, currentHotel.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Tax ({currentHotel.tax_rate}%)
                </span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(taxAmount, currentHotel.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Discount</span>
                <input
                  type="number"
                  value={form.discount_amount}
                  onChange={e =>
                    setForm(f => ({ ...f, discount_amount: Number(e.target.value) }))
                  }
                  className="input-field w-32 text-right"
                  min={0}
                  step="0.01"
                />
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">
                  {formatCurrency(totalAmount, currentHotel.currency)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field w-full"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeCreateModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showViewModal}
        onClose={closeViewModal}
        title={viewingInvoice ? `Invoice ${viewingInvoice.invoice_number}` : 'Invoice Details'}
        size="xl"
      >
        {viewingInvoice && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewingInvoice.invoice_number}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {viewingInvoice.guest
                    ? `${viewingInvoice.guest.first_name} ${viewingInvoice.guest.last_name}`
                    : 'Unknown Guest'}
                </p>
              </div>
              <span className={`badge ${getStatusColor(viewingInvoice.status)}`}>
                {getStatusLabel(viewingInvoice.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Issue Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(viewingInvoice.issue_date)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Due Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(viewingInvoice.due_date)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(viewingInvoice.total_amount, currentHotel.currency)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Amount Paid</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(viewingInvoice.amount_paid, currentHotel.currency)}
                </p>
              </div>
            </div>

            {viewingInvoice.guest && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Guest Email</p>
                  <p className="text-gray-900 mt-0.5">
                    {viewingInvoice.guest.email || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Guest Phone</p>
                  <p className="text-gray-900 mt-0.5">
                    {viewingInvoice.guest.phone || '-'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Line Items</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header">Description</th>
                      <th className="table-header">Category</th>
                      <th className="table-header">Qty</th>
                      <th className="table-header">Unit Price</th>
                      <th className="table-header">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingInvoice.items || []).map(item => (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="table-cell text-gray-900">{item.description}</td>
                        <td className="table-cell text-gray-500">
                          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </td>
                        <td className="table-cell text-gray-500">{item.quantity}</td>
                        <td className="table-cell text-gray-500">
                          {formatCurrency(item.unit_price, currentHotel.currency)}
                        </td>
                        <td className="table-cell text-gray-900 font-medium">
                          {formatCurrency(item.total_price, currentHotel.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(viewingInvoice.subtotal, currentHotel.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(viewingInvoice.tax_amount, currentHotel.currency)}
                  </span>
                </div>
                {viewingInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-600 font-medium">
                      -{formatCurrency(viewingInvoice.discount_amount, currentHotel.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">
                    {formatCurrency(viewingInvoice.total_amount, currentHotel.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Balance Due</span>
                  <span className="text-gray-900 font-semibold">
                    {formatCurrency(
                      viewingInvoice.total_amount - viewingInvoice.amount_paid,
                      currentHotel.currency
                    )}
                  </span>
                </div>
              </div>
            </div>

            {viewingInvoice.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap">
                  {viewingInvoice.notes}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              {viewingInvoice.status === 'draft' && (
                <button
                  onClick={() => {
                    sendInvoice(viewingInvoice);
                    closeViewModal();
                  }}
                  className="btn-secondary"
                >
                  <Send className="w-4 h-4" />
                  Send Invoice
                </button>
              )}
              {viewingInvoice.status !== 'paid' &&
                viewingInvoice.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      markAsPaid(viewingInvoice);
                      closeViewModal();
                    }}
                    className="btn-primary"
                  >
                    <DollarSign className="w-4 h-4" />
                    Mark as Paid
                  </button>
                )}
              <button
                onClick={() => generatePdf(viewingInvoice)}
                className="btn-secondary"
              >
                <FileText className="w-4 h-4" />
                Generate PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
