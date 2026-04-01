import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Plus, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, RotateCcw, Trash2, Euro, TrendingDown, Calendar,
  ShieldAlert, Filter, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PaymentRuleModal from './PaymentRuleModal';
import RefundModal from './RefundModal';

interface PaymentRule {
  id: string;
  name: string;
  trigger: string;
  days_before: number | null;
  amount_type: string;
  amount_value: number;
  payment_type: string;
  applies_to: string;
  send_reminder: boolean;
  reminder_days_before: number;
  active: boolean;
}

interface Transaction {
  id: string;
  guest_name: string;
  booking_source: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  payment_method: string;
  card_last4: string;
  card_brand: string;
  notes: string;
  scheduled_date: string | null;
  processed_at: string | null;
  created_at: string;
}

type Tab = 'transactions' | 'rules' | 'scheduled';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending',    color: 'bg-amber-50 text-amber-700',     icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-50 text-blue-700',       icon: RefreshCw },
  captured:   { label: 'Captured',   color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  failed:     { label: 'Failed',     color: 'bg-red-50 text-red-700',         icon: XCircle },
  refunded:   { label: 'Refunded',   color: 'bg-gray-100 text-gray-600',      icon: RotateCcw },
  voided:     { label: 'Voided',     color: 'bg-gray-100 text-gray-500',      icon: XCircle },
};

const TYPE_COLORS: Record<string, string> = {
  deposit:    'bg-blue-50 text-blue-700',
  pre_auth:   'bg-sky-50 text-sky-700',
  charge:     'bg-gray-100 text-gray-700',
  refund:     'bg-rose-50 text-rose-700',
  adjustment: 'bg-orange-50 text-orange-700',
};

const TRIGGER_LABELS: Record<string, string> = {
  on_booking:          'On Booking',
  days_before_arrival: 'Days Before Arrival',
  on_checkin:          'On Check-in',
  on_checkout:         'On Check-out',
  manual:              'Manual',
};

export default function PaymentAutomationPage() {
  const { currentHotel } = useHotel();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>('transactions');
  const [rules, setRules] = useState<PaymentRule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargingId, setChargingId] = useState<string | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmtMin, setFilterAmtMin] = useState('');
  const [filterAmtMax, setFilterAmtMax] = useState('');

  const loadData = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from('payment_rules').select('*').eq('hotel_id', currentHotel.id).order('created_at'),
      supabase.from('payment_transactions').select('*').eq('hotel_id', currentHotel.id).order('created_at', { ascending: false }),
    ]);
    setRules((r ?? []) as PaymentRule[]);
    setTransactions((t ?? []) as Transaction[]);
    setLoading(false);
  }, [currentHotel]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleRule = async (id: string, active: boolean) => {
    await supabase.from('payment_rules').update({ active: !active }).eq('id', id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !active } : r));
    showToast(`Rule ${!active ? 'activated' : 'deactivated'}`, 'success');
  };

  const deleteRule = async (id: string) => {
    await supabase.from('payment_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
    setDeleteConfirm(null);
    showToast('Rule deleted', 'success');
  };

  const chargeNow = async (tx: Transaction) => {
    setChargingId(tx.id);
    await new Promise(r => setTimeout(r, 1500));
    await supabase.from('payment_transactions').update({
      status: 'captured',
      processed_at: new Date().toISOString(),
    }).eq('id', tx.id);
    setTransactions(prev => prev.map(t =>
      t.id === tx.id ? { ...t, status: 'captured', processed_at: new Date().toISOString() } : t
    ));
    setChargingId(null);
    showToast(`${formatCurrency(tx.amount)} charged successfully`, 'success');
  };

  const today = new Date().toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const overdue   = transactions.filter(t => t.status === 'pending' && t.scheduled_date && t.scheduled_date < today);
  const scheduled = transactions.filter(t =>
    t.status === 'pending' && t.scheduled_date && t.scheduled_date >= today && t.scheduled_date <= in30Days
  );

  const filtered = transactions.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterType && t.type !== filterType) return false;
    const refDate = t.scheduled_date ?? t.created_at?.split('T')[0];
    if (filterDateFrom && refDate && refDate < filterDateFrom) return false;
    if (filterDateTo && refDate && refDate > filterDateTo) return false;
    if (filterAmtMin && Number(t.amount) < Number(filterAmtMin)) return false;
    if (filterAmtMax && Number(t.amount) > Number(filterAmtMax)) return false;
    return true;
  });

  const collectedThisMonth = transactions.filter(t => {
    const d = new Date(t.created_at);
    const now = new Date();
    return t.status === 'captured' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, t) => s + Number(t.amount), 0);
  const pendingTotal = transactions.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0);
  const overdueTotal = overdue.reduce((s, t) => s + Number(t.amount), 0);
  const preAuthHeld  = transactions.filter(t => t.type === 'pre_auth' && t.status === 'captured').reduce((s, t) => s + Number(t.amount), 0);

  const hasFilters = filterStatus || filterType || filterDateFrom || filterDateTo || filterAmtMin || filterAmtMax;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'transactions', label: 'Transactions' },
    { id: 'rules',        label: 'Payment Rules' },
    { id: 'scheduled',    label: 'Scheduled', badge: overdue.length + scheduled.length },
  ];

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
          <CreditCard className="w-6 h-6 text-blue-600" />
          Payment Automation
        </h1>
        <p className="text-gray-500 text-sm mt-1">Automate deposits, pre-authorisations, and charges</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Collected This Month', value: formatCurrency(collectedThisMonth), icon: Euro,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending',              value: formatCurrency(pendingTotal),       icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Overdue',              value: formatCurrency(overdueTotal),       icon: ShieldAlert,  color: 'text-red-600',     bg: 'bg-red-50' },
          { label: 'Pre-auths Held',       value: formatCurrency(preAuthHeld),        icon: TrendingDown, color: 'text-gray-700',    bg: 'bg-gray-100' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xs text-gray-500 font-medium leading-tight">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Filters</span>
              {hasFilters && (
                <button
                  onClick={() => {
                    setFilterStatus(''); setFilterType('');
                    setFilterDateFrom(''); setFilterDateTo('');
                    setFilterAmtMin(''); setFilterAmtMax('');
                  }}
                  className="ml-auto text-xs text-blue-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field py-1.5 text-xs">
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field py-1.5 text-xs">
                <option value="">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="pre_auth">Pre-auth</option>
                <option value="charge">Charge</option>
                <option value="refund">Refund</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input-field py-1.5 text-xs" title="Date from" />
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input-field py-1.5 text-xs" title="Date to" />
              <input type="number" value={filterAmtMin} onChange={e => setFilterAmtMin(e.target.value)} className="input-field py-1.5 text-xs" placeholder="Min €" />
              <input type="number" value={filterAmtMax} onChange={e => setFilterAmtMax(e.target.value)} className="input-field py-1.5 text-xs" placeholder="Max €" />
            </div>
          </div>
          {hasFilters && (
            <p className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
          )}
          <TransactionTable
            transactions={filtered}
            today={today}
            chargingId={chargingId}
            onChargeNow={chargeNow}
            onRefund={setRefundTarget}
          />
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowRuleModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          </div>
          <div className="space-y-3">
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`bg-white rounded-xl border p-4 transition-all ${rule.active ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{rule.name}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                        {rule.trigger === 'days_before_arrival' && rule.days_before ? ` · ${rule.days_before}d` : ''}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[rule.payment_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {rule.payment_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {rule.amount_type === 'percentage'
                          ? `${rule.amount_value}%`
                          : rule.amount_type === 'fixed'
                          ? formatCurrency(rule.amount_value)
                          : rule.amount_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400">→ {rule.applies_to}</span>
                      {rule.send_reminder && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> reminder {rule.reminder_days_before}d before
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleRule(rule.id, rule.active)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${rule.active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    {deleteConfirm === rule.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteRule(rule.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded font-medium">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(rule.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No payment rules configured</p>
                <p className="text-sm mt-1">Add rules to automate deposit collection and charges</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="space-y-5">
          {overdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-red-600">Overdue ({overdue.length})</h3>
              </div>
              {overdue.map(tx => {
                const daysLate = Math.floor((Date.now() - new Date(tx.scheduled_date!).getTime()) / 86400000);
                return (
                  <div key={tx.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">{tx.guest_name || '—'}</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          {tx.type} · Due {formatDate(tx.scheduled_date!)} · {daysLate} day{daysLate !== 1 ? 's' : ''} overdue
                        </p>
                        {tx.booking_source && <p className="text-xs text-gray-400 capitalize">{tx.booking_source}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-red-600">{formatCurrency(Number(tx.amount))}</span>
                      <button
                        onClick={() => chargeNow(tx)}
                        disabled={chargingId === tx.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-70"
                      >
                        {chargingId === tx.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Charge Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-gray-700">Due in Next 30 Days ({scheduled.length})</h3>
            </div>
            {scheduled.length === 0 ? (
              <div className="py-10 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
                <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>No upcoming scheduled payments in the next 30 days</p>
              </div>
            ) : (
              [...scheduled]
                .sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''))
                .map(tx => (
                <div key={tx.id} className="bg-white border border-amber-100 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{tx.guest_name || '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className={`inline-block mr-2 px-1.5 py-0.5 rounded text-xs ${TYPE_COLORS[tx.type] ?? 'bg-gray-100 text-gray-600'}`}>{tx.type}</span>
                      Due {formatDate(tx.scheduled_date!)}
                      {tx.payment_method && ` · ${tx.payment_method}${tx.card_last4 ? ` ···${tx.card_last4}` : ''}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(Number(tx.amount))}</span>
                    <button
                      onClick={() => chargeNow(tx)}
                      disabled={chargingId === tx.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70"
                    >
                      {chargingId === tx.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Charge Now
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {overdue.length === 0 && scheduled.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
              <p className="font-medium">All clear — no overdue or upcoming payments</p>
            </div>
          )}
        </div>
      )}

      {showRuleModal && currentHotel && (
        <PaymentRuleModal
          hotelId={currentHotel.id}
          onClose={() => setShowRuleModal(false)}
          onSaved={() => { setShowRuleModal(false); loadData(); showToast('Payment rule added', 'success'); }}
        />
      )}

      {refundTarget && (
        <RefundModal
          transaction={refundTarget}
          hotelId={currentHotel?.id ?? ''}
          onClose={() => setRefundTarget(null)}
          onRefunded={(id, amount) => {
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'refunded' } : t));
            setRefundTarget(null);
            loadData();
            showToast(`Refund of ${formatCurrency(amount)} issued`, 'success');
          }}
        />
      )}
    </div>
  );
}

function TransactionTable({
  transactions,
  today,
  chargingId,
  onChargeNow,
  onRefund,
}: {
  transactions: Transaction[];
  today: string;
  chargingId: string | null;
  onChargeNow: (tx: Transaction) => void;
  onRefund: (tx: Transaction) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
        <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p>No transactions found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="table-header">Guest</th>
              <th className="table-header">Source</th>
              <th className="table-header text-right">Amount</th>
              <th className="table-header">Type</th>
              <th className="table-header">Status</th>
              <th className="table-header">Method</th>
              <th className="table-header">Scheduled</th>
              <th className="table-header">Processed</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => {
              const statusCfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              const isOverdue = tx.status === 'pending' && tx.scheduled_date && tx.scheduled_date < today;
              return (
                <tr
                  key={tx.id}
                  className={`border-b border-gray-50 last:border-0 transition-colors ${
                    isOverdue ? 'bg-red-50 hover:bg-red-100/60' : 'hover:bg-gray-50/50'
                  }`}
                >
                  <td className="table-cell">
                    <p className="font-medium text-gray-900 text-sm">{tx.guest_name || '—'}</p>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs text-gray-500 capitalize">{tx.booking_source || '—'}</span>
                  </td>
                  <td className="table-cell text-right">
                    <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(Number(tx.amount))}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[tx.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500 text-xs capitalize">
                    {tx.payment_method ?? '—'}
                    {tx.card_last4 && <span className="text-gray-400"> ···{tx.card_last4}</span>}
                  </td>
                  <td className="table-cell text-xs">
                    {tx.scheduled_date ? (
                      <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                        {formatDate(tx.scheduled_date)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="table-cell text-gray-500 text-xs">
                    {tx.processed_at ? formatDate(tx.processed_at) : '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {tx.status === 'pending' && (
                        <button
                          onClick={() => onChargeNow(tx)}
                          disabled={chargingId === tx.id}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors disabled:opacity-70 ${
                            isOverdue
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          {chargingId === tx.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Charge
                        </button>
                      )}
                      {tx.status === 'captured' && (
                        <button
                          onClick={() => onRefund(tx)}
                          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
