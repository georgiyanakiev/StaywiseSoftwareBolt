import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
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
  active: boolean;
}

interface Transaction {
  id: string;
  guest_name: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  payment_method: string;
  card_last4: string;
  notes: string;
  scheduled_date: string | null;
  processed_at: string | null;
  created_at: string;
}

type Tab = 'transactions' | 'rules' | 'scheduled' | 'overdue';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700', icon: Clock },
  captured: { label: 'Captured', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-700', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-600', icon: RotateCcw },
};

const TYPE_COLORS: Record<string, string> = {
  deposit: 'bg-blue-50 text-blue-700',
  pre_auth: 'bg-violet-50 text-violet-700',
  charge: 'bg-gray-100 text-gray-700',
  refund: 'bg-rose-50 text-rose-700',
};

const TRIGGER_LABELS: Record<string, string> = {
  on_booking: 'On Booking',
  days_before_arrival: 'Days Before Arrival',
  on_checkin: 'On Check-in',
  on_checkout: 'On Check-out',
};

export default function PaymentAutomationPage() {
  const { currentHotel } = useHotel();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('transactions');
  const [rules, setRules] = useState<PaymentRule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

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
    showToast('Rule deleted', 'success');
  };

  const chargeNow = async (tx: Transaction) => {
    await supabase.from('payment_transactions').update({
      status: 'captured',
      processed_at: new Date().toISOString(),
    }).eq('id', tx.id);
    setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'captured', processed_at: new Date().toISOString() } : t));
    showToast(`${formatCurrency(tx.amount)} charged successfully`, 'success');
  };

  const today = new Date().toISOString().split('T')[0];
  const in14Days = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  const scheduled = transactions.filter(t =>
    t.status === 'pending' && t.scheduled_date && t.scheduled_date >= today && t.scheduled_date <= in14Days
  );
  const overdue = transactions.filter(t =>
    t.status === 'pending' && t.scheduled_date && t.scheduled_date < today
  );

  const filtered = transactions.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterType && t.type !== filterType) return false;
    return true;
  });

  const collectedThisMonth = transactions
    .filter(t => t.status === 'captured' && new Date(t.created_at).getMonth() === new Date().getMonth())
    .reduce((s, t) => s + t.amount, 0);
  const pendingTotal = transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0);
  const overdueTotal = overdue.reduce((s, t) => s + t.amount, 0);
  const preAuthHeld = transactions.filter(t => t.type === 'pre_auth' && t.status === 'captured').reduce((s, t) => s + t.amount, 0);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'transactions', label: 'All Transactions' },
    { id: 'rules', label: 'Payment Rules' },
    { id: 'scheduled', label: 'Scheduled', badge: scheduled.length },
    { id: 'overdue', label: 'Overdue', badge: overdue.length },
  ];

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Payment Automation
          </h1>
          <p className="text-gray-500 text-sm mt-1">Automate deposits, pre-authorisations, and charges</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Collected This Month', value: formatCurrency(collectedThisMonth), color: 'text-emerald-600' },
          { label: 'Pending', value: formatCurrency(pendingTotal), color: 'text-amber-600' },
          { label: 'Overdue', value: formatCurrency(overdueTotal), color: 'text-red-600' },
          { label: 'Pre-auths Held', value: formatCurrency(preAuthHeld), color: 'text-gray-700' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {t.badge ? <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field py-1.5 text-sm w-36">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field py-1.5 text-sm w-36">
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="pre_auth">Pre-auth</option>
              <option value="charge">Charge</option>
              <option value="refund">Refund</option>
            </select>
          </div>
          <TransactionTable transactions={filtered} onChargeNow={chargeNow} onRefund={setRefundTarget} />
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
              <div key={rule.id} className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-4 transition-all ${rule.active ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{rule.name}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">Trigger: <span className="font-medium text-gray-700">{TRIGGER_LABELS[rule.trigger] ?? rule.trigger}{rule.trigger === 'days_before_arrival' && rule.days_before ? ` (${rule.days_before} days)` : ''}</span></span>
                    <span className="text-xs text-gray-500">Amount: <span className="font-medium text-gray-700">{rule.amount_type === 'percentage' ? `${rule.amount_value}%` : rule.amount_type === 'fixed' ? formatCurrency(rule.amount_value) : rule.amount_type}</span></span>
                    <span className="text-xs text-gray-500">Type: <span className={`font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[rule.payment_type] ?? 'text-gray-700'}`}>{rule.payment_type}</span></span>
                    <span className="text-xs text-gray-400">Applies to: {rule.applies_to}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleRule(rule.id, rule.active)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${rule.active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
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
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Payments due in the next 14 days</p>
          {scheduled.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No scheduled payments due</p>
            </div>
          ) : (
            scheduled.map(tx => (
              <div key={tx.id} className="bg-white rounded-xl border border-amber-100 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{tx.guest_name}</p>
                  <p className="text-sm text-gray-500">
                    {tx.type} · Due {formatDate(tx.scheduled_date!)} · <span className="capitalize">{tx.payment_method}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(tx.amount)}</span>
                  <button onClick={() => chargeNow(tx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Charge Now
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'overdue' && (
        <div className="space-y-3">
          {overdue.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
              <p>No overdue payments — great!</p>
            </div>
          ) : (
            overdue.map(tx => (
              <div key={tx.id} className="bg-white rounded-xl border border-red-200 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{tx.guest_name}</p>
                    <p className="text-sm text-red-500">Due {formatDate(tx.scheduled_date!)} — {Math.floor((Date.now() - new Date(tx.scheduled_date!).getTime()) / 86400000)} days overdue</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-red-600">{formatCurrency(tx.amount)}</span>
                  <button onClick={() => chargeNow(tx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Charge Now
                  </button>
                </div>
              </div>
            ))
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
          onClose={() => setRefundTarget(null)}
          onRefunded={(id, amount) => {
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'refunded' } : t));
            setRefundTarget(null);
            showToast(`Refund of ${formatCurrency(amount)} issued`, 'success');
          }}
        />
      )}
    </div>
  );
}

function TransactionTable({ transactions, onChargeNow, onRefund }: {
  transactions: Transaction[];
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
    <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-100">
          <tr>
            <th className="table-header">Guest</th>
            <th className="table-header text-right">Amount</th>
            <th className="table-header">Type</th>
            <th className="table-header">Status</th>
            <th className="table-header">Method</th>
            <th className="table-header">Date</th>
            <th className="table-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => {
            const statusCfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            return (
              <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="table-cell font-medium text-gray-900">{tx.guest_name || '—'}</td>
                <td className="table-cell text-right font-semibold text-gray-900">{formatCurrency(tx.amount)}</td>
                <td className="table-cell">
                  <span className={`badge ${TYPE_COLORS[tx.type] ?? 'bg-gray-100 text-gray-600'}`}>{tx.type}</span>
                </td>
                <td className="table-cell">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </span>
                </td>
                <td className="table-cell text-gray-500 capitalize">
                  {tx.payment_method}{tx.card_last4 ? ` ···${tx.card_last4}` : ''}
                </td>
                <td className="table-cell text-gray-500 text-xs">{tx.scheduled_date ? formatDate(tx.scheduled_date) : tx.processed_at ? formatDate(tx.processed_at) : '—'}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    {tx.status === 'pending' && (
                      <button onClick={() => onChargeNow(tx)} className="text-xs text-blue-600 hover:underline font-medium">
                        Charge
                      </button>
                    )}
                    {tx.status === 'captured' && (
                      <button onClick={() => onRefund(tx)} className="text-xs text-red-600 hover:underline font-medium">
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
  );
}
