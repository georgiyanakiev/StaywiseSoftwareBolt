import { useState, useEffect, useCallback } from 'react';
import { Globe, Copy, CheckCircle2, TrendingUp, Users, Calendar, Euro, Eye, XCircle, RefreshCw, Info, Hash, CreditCard, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { useLanguage } from '../../contexts/LanguageContext';
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
  children: number;
  total_amount: number;
  deposit_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  room_type?: { name: string };
}

interface Config {
  id: string;
  primary_color: string;
  welcome_message: string;
  cancellation_policy: string;
  check_in_time: string;
  check_out_time: string;
  currency: string;
  min_advance_days: number;
  max_advance_days: number;
  show_room_photos: boolean;
  require_deposit: boolean;
  deposit_percentage: number;
  active: boolean;
  stripe_enabled: boolean;
  payment_mode: string;
}

type Tab = 'overview' | 'config' | 'bookings' | 'embed';

const STATUS_COLORS: Record<string, string> = {
  confirmed:       'bg-emerald-50 text-emerald-700',
  pending:         'bg-amber-50 text-amber-700',
  pending_payment: 'bg-amber-50 text-amber-700',
  cancelled:       'bg-red-50 text-red-700',
  checked_in:      'bg-blue-50 text-blue-700',
  checked_out:     'bg-gray-100 text-gray-600',
  no_show:         'bg-orange-50 text-orange-700',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid:         'bg-emerald-50 text-emerald-700',
  pending:      'bg-amber-50 text-amber-700',
  failed:       'bg-red-50 text-red-700',
  refunded:     'bg-gray-100 text-gray-600',
  not_required: 'bg-gray-50 text-gray-500',
};

const DEFAULT_CONFIG: Partial<Config> = {
  primary_color: '#1a56db',
  welcome_message: 'Book directly for the best rates',
  cancellation_policy: 'Free cancellation up to 48 hours before check-in.',
  check_in_time: '15:00',
  check_out_time: '11:00',
  currency: 'EUR',
  min_advance_days: 0,
  max_advance_days: 365,
  show_room_photos: true,
  require_deposit: true,
  deposit_percentage: 30,
  active: true,
  stripe_enabled: false,
  payment_mode: 'deposit',
};

export default function BookingEngineAdminPage() {
  const { currentHotel } = useHotel();
  const { t } = useLanguage();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [bookings, setBookings] = useState<DirectBooking[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Config>>(DEFAULT_CONFIG);

  const loadData = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const [{ data: bk }, { data: cfg }] = await Promise.all([
        supabase.from('direct_bookings')
          .select('*, room_type:room_types(name)')
          .eq('hotel_id', currentHotel.id)
          .order('created_at', { ascending: false }),
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
    const payload = {
      hotel_id: currentHotel.id,
      primary_color: form.primary_color ?? '#1a56db',
      welcome_message: form.welcome_message ?? '',
      cancellation_policy: form.cancellation_policy ?? '',
      check_in_time: form.check_in_time ?? '15:00',
      check_out_time: form.check_out_time ?? '11:00',
      currency: form.currency ?? 'EUR',
      min_advance_days: form.min_advance_days ?? 0,
      max_advance_days: form.max_advance_days ?? 365,
      show_room_photos: form.show_room_photos ?? true,
      require_deposit: form.require_deposit ?? true,
      deposit_percentage: form.deposit_percentage ?? 30,
      active: form.active ?? true,
      stripe_enabled: form.stripe_enabled ?? false,
      payment_mode: form.payment_mode ?? 'deposit',
      updated_at: new Date().toISOString(),
      ...(tenantId ? { tenant_id: tenantId } : {}),
    };
    const { error } = config
      ? await supabase.from('booking_engine_config').update(payload).eq('id', config.id)
      : await supabase.from('booking_engine_config').insert(payload);
    setSaving(false);
    if (error) {
      console.error('Save config error:', error);
      toast('error', 'Failed to save changes');
      return;
    }
    toast('success', 'Booking engine config saved');
    loadData();
  };

  const copyEmbed = (type: 'script' | 'iframe') => {
    const base = window.location.origin;
    const param = `hotel=${currentHotel?.id}`;
    const code = type === 'iframe'
      ? `<iframe\n  src="${base}/booking-engine/widget?${param}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border:none;border-radius:12px;"\n></iframe>`
      : `<script\n  src="${base}/booking-widget.js"\n  data-hotel="${currentHotel?.id}"\n></script>`;
    navigator.clipboard.writeText(code);
    setCopiedType(type);
    toast('success', 'Embed code copied!');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('direct_bookings').update({ status }).eq('id', id);
    if (error) { toast('error', 'Failed to update booking'); return; }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    toast('success', 'Booking updated');
  };

  const getNights = (checkIn: string, checkOut: string) =>
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);

  const thisMonth = bookings.filter(b => {
    const d = new Date(b.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const confirmedThisMonth = thisMonth.filter(b => b.status !== 'cancelled' && b.status !== 'no_show');
  const monthRevenue = confirmedThisMonth.reduce((s, b) => s + Number(b.total_amount ?? 0), 0);
  const confirmedBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'no_show');
  const avgStay = confirmedBookings.length > 0
    ? confirmedBookings.reduce((s, b) => s + getNights(b.check_in, b.check_out), 0) / confirmedBookings.length
    : 0;
  const avgValue = confirmedBookings.length > 0
    ? confirmedBookings.reduce((s, b) => s + Number(b.total_amount ?? 0), 0) / confirmedBookings.length
    : 0;
  const currency = config?.currency ?? form.currency ?? 'EUR';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: t.bookingEngine.overview },
    { id: 'config',    label: t.bookingEngine.configuration },
    { id: 'bookings',  label: `${t.bookingEngine.bookings} (${bookings.length})` },
    { id: 'embed',     label: t.bookingEngine.embedCode },
  ];

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-blue-600" />
            {t.bookingEngine.title}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t.bookingEngine.subtitle}</p>
        </div>
        <a
          href={`/booking-engine/widget?hotel=${currentHotel?.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          {t.bookingEngine.previewWidget}
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t.bookingEngine.bookingsThisMonth, value: confirmedThisMonth.length,             icon: Calendar,  color: 'text-blue-600' },
          { label: t.bookingEngine.revenueThisMonth,  value: formatCurrency(monthRevenue, currency), icon: Euro, color: 'text-emerald-600' },
          { label: t.bookingEngine.avgStayLength,     value: `${avgStay.toFixed(1)} ${t.bookingEngine.nights}`, icon: TrendingUp, color: 'text-amber-600' },
          { label: t.bookingEngine.avgBookingValue,   value: formatCurrency(avgValue, currency),     icon: Users,      color: 'text-gray-700' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.id ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t.bookingEngine.recentDirectBookings}</h3>
            {bookings.slice(0, 6).map(b => (
              <div key={b.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.guest_name}</p>
                  <p className="text-xs text-gray-400">{b.confirmation_number} · {formatDate(b.check_in)} · {getNights(b.check_in, b.check_out)}n</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(b.total_amount), currency)}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-gray-400 text-sm text-center py-6">{t.bookingEngine.noDirectBookings}</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t.bookingEngine.bookingEngineStatus}</h3>
            <div className="space-y-3">
              {[
                { label: t.bookingEngine.widgetStatus,    value: config?.active ? t.bookingEngine.active : t.bookingEngine.inactive, badge: true, active: config?.active },
                { label: t.bookingEngine.currency,         value: config?.currency ?? 'EUR' },
                { label: t.bookingEngine.checkInTime,    value: config?.check_in_time ?? '15:00' },
                { label: t.bookingEngine.checkOutTime,   value: config?.check_out_time ?? '11:00' },
                { label: t.bookingEngine.stripePayments,  value: config?.stripe_enabled ? t.bookingEngine.enabled : t.bookingEngine.disabled, badge: true, active: config?.stripe_enabled },
                { label: t.bookingEngine.paymentMode,     value: config?.stripe_enabled ? (config.payment_mode === 'full' ? t.bookingEngine.fullAmount : t.bookingEngine.depositOnly) : '—' },
                { label: t.bookingEngine.depositRequired, value: config?.require_deposit ? `Yes — ${config.deposit_percentage ?? 30}%` : 'No' },
                { label: t.bookingEngine.advanceBooking,  value: `${config?.min_advance_days ?? 0}–${config?.max_advance_days ?? 365} ${t.bookingEngine.days}` },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  {item.badge ? (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.value}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-5">{t.bookingEngine.widgetConfiguration}</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.welcomeMessage}</label>
              <input
                type="text"
                value={form.welcome_message ?? ''}
                onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.cancellationPolicy}</label>
              <textarea
                value={form.cancellation_policy ?? ''}
                onChange={e => setForm(f => ({ ...f, cancellation_policy: e.target.value }))}
                className="input-field min-h-[80px] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.checkInTime}</label>
                <input type="time" value={form.check_in_time ?? '15:00'} onChange={e => setForm(f => ({ ...f, check_in_time: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.checkOutTime}</label>
                <input type="time" value={form.check_out_time ?? '11:00'} onChange={e => setForm(f => ({ ...f, check_out_time: e.target.value }))} className="input-field" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.currency}</label>
                <select value={form.currency ?? 'EUR'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="input-field">
                  {['EUR', 'USD', 'GBP', 'BGN', 'CHF', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.brandColor}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color ?? '#1a56db'}
                    onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                    className="w-10 h-10 rounded border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={form.primary_color ?? '#1a56db'}
                    onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                    className="input-field flex-1 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.minAdvanceDays}</label>
                <input
                  type="number" min="0" max="365"
                  value={form.min_advance_days ?? 0}
                  onChange={e => setForm(f => ({ ...f, min_advance_days: Number(e.target.value) }))}
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">{t.bookingEngine.howManyDaysAdvance}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.maxAdvanceDays}</label>
                <input
                  type="number" min="1" max="730"
                  value={form.max_advance_days ?? 365}
                  onChange={e => setForm(f => ({ ...f, max_advance_days: Number(e.target.value) }))}
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">{t.bookingEngine.howFarAdvance}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.depositPercentage}</label>
                <div className="relative">
                  <input
                    type="number" min="0" max="100" step="5"
                    value={form.deposit_percentage ?? 30}
                    onChange={e => setForm(f => ({ ...f, deposit_percentage: Number(e.target.value) }))}
                    className="input-field pr-8"
                    disabled={!form.require_deposit}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { key: 'active',           label: t.bookingEngine.widgetIsActive },
                { key: 'show_room_photos', label: t.bookingEngine.showRoomPhotos },
                { key: 'require_deposit',  label: t.bookingEngine.requireDeposit },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(form[key as keyof typeof form])}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f]"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-5 mt-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-[#1e3a5f]" />
                <h4 className="font-semibold text-gray-900">{t.bookingEngine.stripePaymentProcessing}</h4>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.stripe_enabled}
                    onChange={e => setForm(f => ({ ...f, stripe_enabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">{t.bookingEngine.enableStripePayments}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{t.bookingEngine.guestsPaySecurely}</p>
                  </div>
                </label>
              </div>

              {form.stripe_enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.bookingEngine.paymentMode}</label>
                    <select
                      value={form.payment_mode ?? 'deposit'}
                      onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}
                      className="input-field"
                    >
                      <option value="deposit">{t.bookingEngine.chargeDepositOnly} ({form.deposit_percentage ?? 30}% of total)</option>
                      <option value="full">{t.bookingEngine.chargeFull}</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {form.payment_mode === 'full'
                        ? t.bookingEngine.fullBookingTotal
                        : t.bookingEngine.depositWillBeCharged
                      }
                    </p>
                  </div>

                  <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700 leading-relaxed">
                      <p className="font-medium mb-1">{t.bookingEngine.howStripeWorks}</p>
                      <ul className="space-y-0.5 text-blue-600">
                        <li>{t.bookingEngine.stripeStep1}</li>
                        <li>{t.bookingEngine.stripeStep2}</li>
                        <li>{t.bookingEngine.stripeStep3}</li>
                        <li>{t.bookingEngine.stripeStep4}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={saving}
            className="btn-primary mt-6 flex items-center gap-2"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {t.bookingEngine.saveConfiguration}
          </button>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-header">{t.bookingEngine.confirmation}</th>
                  <th className="table-header">{t.bookingEngine.guest}</th>
                  <th className="table-header">{t.bookingEngine.roomType}</th>
                  <th className="table-header">{t.bookingEngine.checkIn}</th>
                  <th className="table-header">{t.bookingEngine.checkOut}</th>
                  <th className="table-header text-center">{t.bookingEngine.nights}</th>
                  <th className="table-header text-right">{t.bookingEngine.total}</th>
                  <th className="table-header text-right">{t.bookingEngine.depositPaid}</th>
                  <th className="table-header">{t.bookingEngine.status}</th>
                  <th className="table-header">{t.bookingEngine.payment}</th>
                  <th className="table-header">{t.bookingEngine.actions}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const nights = getNights(b.check_in, b.check_out);
                  return (
                    <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3 h-3 text-blue-400" />
                          <span className="font-mono text-xs font-semibold text-[#1e3a5f]">{b.confirmation_number}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <p className="font-medium text-gray-900 text-sm">{b.guest_name}</p>
                        <p className="text-xs text-gray-400">{b.guest_email}</p>
                      </td>
                      <td className="table-cell text-sm text-gray-600">
                        {b.room_type?.name ?? '—'}
                      </td>
                      <td className="table-cell text-sm text-gray-600 whitespace-nowrap">{formatDate(b.check_in)}</td>
                      <td className="table-cell text-sm text-gray-600 whitespace-nowrap">{formatDate(b.check_out)}</td>
                      <td className="table-cell text-center">
                        <span className="text-sm font-semibold text-gray-700">{nights}</span>
                      </td>
                      <td className="table-cell text-right font-semibold text-gray-900">{formatCurrency(Number(b.total_amount), currency)}</td>
                      <td className="table-cell text-right text-sm text-gray-600">
                        {Number(b.deposit_amount) > 0 ? formatCurrency(Number(b.deposit_amount), currency) : '—'}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell">
                        {b.payment_status && b.payment_status !== 'not_required' ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[b.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {b.payment_status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                            {b.payment_status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => updateStatus(b.id, 'cancelled')}
                              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
                            >
                              <XCircle className="w-3.5 h-3.5" /> {t.bookingEngine.cancel}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400">
                      <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      {t.bookingEngine.noDirectBookings}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'embed' && (
        <div className="space-y-4 max-w-2xl">
          {(['iframe', 'script'] as const).map(type => (
            <div key={type} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{type === 'iframe' ? t.bookingEngine.iFrameEmbed : t.bookingEngine.scriptTag}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {type === 'iframe' ? t.bookingEngine.recommended : t.bookingEngine.forAdvanced}
                  </p>
                </div>
                <button
                  onClick={() => copyEmbed(type)}
                  className="flex items-center gap-1.5 text-sm text-[#1e3a5f] hover:text-[#172e4c] font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {copiedType === type ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copiedType === type ? t.bookingEngine.copied : t.bookingEngine.copy}
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
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              {t.bookingEngine.pasteSnippet}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
