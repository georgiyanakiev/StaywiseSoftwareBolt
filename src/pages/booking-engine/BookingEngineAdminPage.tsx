import { useState, useEffect, useCallback } from 'react';
import { Globe, Copy, CheckCircle2, TrendingUp, Users, Calendar, DollarSign, Eye, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { useTenantId } from '../../hooks/useTenantQuery';
import { formatDate, formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface DirectBooking {
  id: string;
  confirmation_number: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  adults: number;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Config {
  id: string;
  primary_color: string;
  welcome_message: string;
  cancellation_policy: string;
  check_in_time: string;
  check_out_time: string;
  currency: string;
  active: boolean;
}

type Tab = 'overview' | 'config' | 'bookings' | 'embed';

export default function BookingEngineAdminPage() {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [bookings, setBookings] = useState<DirectBooking[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<Partial<Config>>({});

  const loadData = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const [{ data: bk }, { data: cfg }] = await Promise.all([
        supabase.from('direct_bookings').select('*').eq('hotel_id', currentHotel.id).order('created_at', { ascending: false }),
        supabase.from('booking_engine_config').select('*').eq('hotel_id', currentHotel.id).maybeSingle(),
      ]);
      setBookings(bk ?? []);
      if (cfg) {
        setConfig(cfg as Config);
        setForm(cfg as Config);
      }
    } finally {
      setLoading(false);
    }
  }, [currentHotel]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveConfig = async () => {
    if (!currentHotel) return;
    setSaving(true);
    const payload = { ...form, hotel_id: currentHotel.id, updated_at: new Date().toISOString(), ...(tenantId ? { tenant_id: tenantId } : {}) };
    const { error } = config
      ? await supabase.from('booking_engine_config').update(payload).eq('id', config.id)
      : await supabase.from('booking_engine_config').insert(payload);
    setSaving(false);
    if (error) { showToast('Failed to save config', 'error'); return; }
    showToast('Booking engine config saved', 'success');
    loadData();
  };

  const copyEmbed = (type: 'script' | 'iframe') => {
    const base = window.location.origin;
    const code = type === 'iframe'
      ? `<iframe src="${base}/booking-engine/widget?hotel=${currentHotel?.id}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`
      : `<script src="${base}/booking-widget.js" data-hotel="${currentHotel?.id}"></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast('Embed code copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('direct_bookings').update({ status }).eq('id', id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    showToast('Booking updated', 'success');
  };

  const thisMonth = bookings.filter(b => {
    const d = new Date(b.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthRevenue = thisMonth.reduce((s, b) => s + Number(b.total_amount), 0);
  const avgStay = bookings.length > 0
    ? bookings.reduce((s, b) => {
        const nights = Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000);
        return s + nights;
      }, 0) / bookings.length
    : 0;

  const STATUS_COLORS: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-700',
    checked_in: 'bg-blue-50 text-blue-700',
    checked_out: 'bg-gray-100 text-gray-600',
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'config', label: 'Configuration' },
    { id: 'bookings', label: `Bookings (${bookings.length})` },
    { id: 'embed', label: 'Embed Code' },
  ];

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-blue-600" />
            Booking Engine
          </h1>
          <p className="text-gray-500 text-sm mt-1">Commission-free direct bookings from your website</p>
        </div>
        <a href="/booking-engine/widget" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Eye className="w-4 h-4" />
          Preview Widget
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Bookings This Month', value: thisMonth.length, icon: Calendar, color: 'text-blue-600' },
          { label: 'Revenue This Month', value: formatCurrency(monthRevenue), icon: DollarSign, color: 'text-emerald-600' },
          { label: 'Average Stay', value: `${avgStay.toFixed(1)} nights`, icon: TrendingUp, color: 'text-amber-600' },
          { label: 'Total Guests', value: bookings.reduce((s, b) => s + b.adults, 0), icon: Users, color: 'text-gray-700' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Direct Bookings</h3>
            {bookings.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.guest_name}</p>
                  <p className="text-xs text-gray-400">{b.confirmation_number} · {formatDate(b.check_in)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(b.total_amount))}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                </div>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No direct bookings yet</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Booking Engine Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Widget Status</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config?.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {config?.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Currency</span>
                <span className="text-sm font-medium text-gray-900">{config?.currency ?? 'EUR'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Check-in Time</span>
                <span className="text-sm font-medium text-gray-900">{config?.check_in_time ?? '15:00'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Check-out Time</span>
                <span className="text-sm font-medium text-gray-900">{config?.check_out_time ?? '11:00'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-5">Widget Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Welcome Message</label>
              <input type="text" value={form.welcome_message ?? ''} onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cancellation Policy</label>
              <textarea value={form.cancellation_policy ?? ''} onChange={e => setForm(f => ({ ...f, cancellation_policy: e.target.value }))} className="input-field min-h-[80px] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-in Time</label>
                <input type="time" value={form.check_in_time ?? '15:00'} onChange={e => setForm(f => ({ ...f, check_in_time: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-out Time</label>
                <input type="time" value={form.check_out_time ?? '11:00'} onChange={e => setForm(f => ({ ...f, check_out_time: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                <select value={form.currency ?? 'EUR'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="input-field">
                  {['EUR', 'USD', 'GBP', 'BGN', 'CHF', 'CAD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primary_color ?? '#1a56db'} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-0.5" />
                  <input type="text" value={form.primary_color ?? '#1a56db'} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="input-field flex-1" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="active" checked={form.active ?? true} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">Widget is active</label>
            </div>
          </div>
          <button onClick={saveConfig} disabled={saving} className="btn-primary mt-6 flex items-center gap-2">
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            Save Configuration
          </button>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Confirmation</th>
                <th className="table-header">Guest</th>
                <th className="table-header">Dates</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="table-cell font-mono text-xs font-semibold text-blue-600">{b.confirmation_number}</td>
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{b.guest_name}</p>
                    <p className="text-xs text-gray-400">{b.guest_email}</p>
                  </td>
                  <td className="table-cell text-sm text-gray-600">
                    {formatDate(b.check_in)} → {formatDate(b.check_out)}
                  </td>
                  <td className="table-cell text-right font-semibold text-gray-900">{formatCurrency(Number(b.total_amount))}</td>
                  <td className="table-cell">
                    <span className={`badge ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                  </td>
                  <td className="table-cell">
                    {b.status === 'confirmed' && (
                      <button onClick={() => updateStatus(b.id, 'cancelled')} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">No direct bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'embed' && (
        <div className="space-y-4 max-w-2xl">
          {(['iframe', 'script'] as const).map(type => (
            <div key={type} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 capitalize">{type === 'iframe' ? 'iFrame Embed' : 'Script Tag'}</h4>
                <button onClick={() => copyEmbed(type)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-all">
                {type === 'iframe'
                  ? `<iframe\n  src="${window.location.origin}/booking-engine/widget?hotel=${currentHotel?.id}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border:none;border-radius:12px;"\n></iframe>`
                  : `<script\n  src="${window.location.origin}/booking-widget.js"\n  data-hotel="${currentHotel?.id}"\n></script>`
                }
              </pre>
            </div>
          ))}
          <p className="text-xs text-gray-400">Paste either snippet into your hotel website's HTML where you want the booking widget to appear.</p>
        </div>
      )}
    </div>
  );
}
