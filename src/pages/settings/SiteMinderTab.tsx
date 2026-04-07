import { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, Link2, Eye, EyeOff, AlertCircle, CheckCircle2, XCircle, Clock, ArrowDownToLine, ArrowUpFromLine, ExternalLink } from 'lucide-react';
import { useHotel } from '../../contexts/HotelContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type { SiteMinderSettings, SiteMinderSyncLog, SiteMinderRoomMapping, RoomType } from '../../types';

const SYNC_INTERVALS = [
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
  { value: 120, label: 'Every 2 hours' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'never') return <span className="badge badge-neutral">Never synced</span>;
  if (status === 'success') return <span className="badge badge-success"><CheckCircle2 className="h-3 w-3 mr-1" />Success</span>;
  if (status === 'failed') return <span className="badge badge-danger"><XCircle className="h-3 w-3 mr-1" />Failed</span>;
  if (status === 'partial') return <span className="badge badge-warning"><AlertCircle className="h-3 w-3 mr-1" />Partial</span>;
  if (status === 'running') return <span className="badge badge-info"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Running</span>;
  return <span className="badge badge-neutral">{status}</span>;
}

export default function SiteMinderTab() {
  const { currentHotel } = useHotel();
  const { staff } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<SiteMinderSettings | null>(null);
  const [syncLogs, setSyncLogs] = useState<SiteMinderSyncLog[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomMappings, setRoomMappings] = useState<SiteMinderRoomMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [savedSecrets, setSavedSecrets] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<'credentials' | 'sync' | 'rooms' | 'logs'>('credentials');

  const [form, setForm] = useState({
    property_id: '',
    api_key: '',
    api_secret: '',
    hotel_code: '',
    is_enabled: false,
    sync_reservations: true,
    sync_availability: true,
    sync_interval_minutes: 15,
    rate_multiplier: 1.0,
    min_advance_days: 0,
    max_advance_days: 365,
  });

  const isAdmin = staff?.role === 'admin' || staff?.role === 'manager';

  const fetchData = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const [settingsRes, logsRes, roomTypesRes, mappingsRes] = await Promise.all([
        supabase.from('siteminder_settings').select('*').eq('hotel_id', currentHotel.id).maybeSingle(),
        supabase.from('siteminder_sync_logs').select('*').eq('hotel_id', currentHotel.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('room_types').select('*').eq('hotel_id', currentHotel.id).order('name'),
        supabase.from('siteminder_room_mappings').select('*').eq('hotel_id', currentHotel.id),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data as SiteMinderSettings);
        setSavedSecrets({ api_key: !!(settingsRes.data.api_key), api_secret: !!(settingsRes.data.api_secret) });
        setForm({
          property_id: settingsRes.data.property_id || '',
          api_key: '',
          api_secret: '',
          hotel_code: settingsRes.data.hotel_code || '',
          is_enabled: settingsRes.data.is_enabled || false,
          sync_reservations: settingsRes.data.sync_reservations ?? true,
          sync_availability: settingsRes.data.sync_availability ?? true,
          sync_interval_minutes: settingsRes.data.sync_interval_minutes || 15,
          rate_multiplier: settingsRes.data.rate_multiplier || 1.0,
          min_advance_days: settingsRes.data.min_advance_days || 0,
          max_advance_days: settingsRes.data.max_advance_days || 365,
        });
      }

      setSyncLogs((logsRes.data || []) as SiteMinderSyncLog[]);
      setRoomTypes((roomTypesRes.data || []) as RoomType[]);
      setRoomMappings((mappingsRes.data || []) as SiteMinderRoomMapping[]);
    } finally {
      setLoading(false);
    }
  }, [currentHotel]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : (name === 'sync_interval_minutes' || name === 'min_advance_days' || name === 'max_advance_days')
          ? Number(value)
          : name === 'rate_multiplier'
            ? parseFloat(value)
            : value,
    }));
  };

  const handleToggle = (field: keyof typeof form) => {
    setForm(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    if (!currentHotel) return;
    setSaving(true);
    try {
      const secretFields = ['api_key', 'api_secret'] as const;
      const formPayload = { ...form } as Record<string, unknown>;
      secretFields.forEach(f => { if (!formPayload[f]) delete formPayload[f]; });
      if (settings) {
        const { error } = await supabase
          .from('siteminder_settings')
          .update({ ...formPayload, updated_at: new Date().toISOString() })
          .eq('hotel_id', currentHotel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('siteminder_settings')
          .insert({ hotel_id: currentHotel.id, ...formPayload });
        if (error) throw error;
      }
      await fetchData();
      toast('success', 'SiteMinder settings saved');
    } catch (err: unknown) {
      toast('error', (err as Error).message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMappingChange = async (roomTypeId: string, field: 'siteminder_room_type_id' | 'siteminder_rate_plan_id', value: string) => {
    if (!currentHotel) return;
    const existing = roomMappings.find(m => m.room_type_id === roomTypeId);
    if (existing) {
      await supabase
        .from('siteminder_room_mappings')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('siteminder_room_mappings').insert({
        hotel_id: currentHotel.id,
        room_type_id: roomTypeId,
        siteminder_room_type_id: field === 'siteminder_room_type_id' ? value : '',
        siteminder_rate_plan_id: field === 'siteminder_rate_plan_id' ? value : '',
      });
    }
    const { data } = await supabase.from('siteminder_room_mappings').select('*').eq('hotel_id', currentHotel.id);
    setRoomMappings((data || []) as SiteMinderRoomMapping[]);
  };

  const triggerSync = async (direction: 'inbound' | 'outbound') => {
    if (!currentHotel || !settings) return;
    if (!settings.api_key) {
      toast('error', 'Please configure your SiteMinder API key first');
      return;
    }
    setSyncing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/siteminder-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ hotel_id: currentHotel.id, direction }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sync failed');
      toast('success', `${direction === 'inbound' ? 'Reservation' : 'Availability'} sync completed: ${result.records_processed} records`);
      await fetchData();
    } catch (err: unknown) {
      toast('error', (err as Error).message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  };

  if (loading) return <LoadingSpinner />;

  const hasCredentials = (form.api_key || savedSecrets.api_key) && form.hotel_code;
  const credentialsMissing = !hasCredentials;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0">
            <Link2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">SiteMinder Channel Manager</h3>
            <p className="text-sm text-gray-500 mt-0.5">Sync reservations and push availability to your SiteMinder property</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {settings && <StatusBadge status={settings.last_sync_status || 'never'} />}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{form.is_enabled ? 'Enabled' : 'Disabled'}</span>
            <button
              type="button"
              onClick={() => isAdmin && handleToggle('is_enabled')}
              disabled={!isAdmin || credentialsMissing}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_enabled ? 'bg-teal-600' : 'bg-gray-300'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {credentialsMissing && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">API credentials required</p>
            <p className="text-sm text-amber-700 mt-1">
              To use this integration you need a SiteMinder account with API access enabled.{' '}
              <a href="https://www.siteminder.com/support" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-1">
                Visit SiteMinder support <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {(['credentials', 'sync', 'rooms', 'logs'] as const).map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`border-b-2 px-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                activeSection === section
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {section === 'credentials' ? 'API Credentials' : section === 'sync' ? 'Sync Settings' : section === 'rooms' ? 'Room Mapping' : 'Sync Logs'}
            </button>
          ))}
        </nav>
      </div>

      {activeSection === 'credentials' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Property ID</label>
              <input
                type="text"
                name="property_id"
                value={form.property_id}
                onChange={handleChange}
                disabled={!isAdmin}
                className="input-field font-mono"
                placeholder="e.g. SM-12345"
              />
              <p className="text-xs text-gray-500 mt-1">Your SiteMinder property identifier (optional, may be the same as Hotel Code)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Code</label>
              <input
                type="text"
                name="hotel_code"
                value={form.hotel_code}
                onChange={handleChange}
                disabled={!isAdmin}
                className="input-field font-mono"
                placeholder="e.g. MYHOTEL"
              />
              <p className="text-xs text-gray-500 mt-1">The hotel code assigned in SiteMinder, used in API requests</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="text"
                name="api_key"
                value={form.api_key}
                onChange={handleChange}
                disabled={!isAdmin}
                className="input-field font-mono"
                placeholder={savedSecrets.api_key ? 'Saved — enter new value to update' : 'SiteMinder API key'}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  name="api_secret"
                  value={form.api_secret}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  className="input-field font-mono pr-10"
                  placeholder={savedSecrets.api_secret ? 'Saved — enter new value to update' : 'SiteMinder API secret'}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Where to find your credentials</p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Log in to your <strong>SiteMinder platform</strong></li>
              <li>Navigate to <strong>Apps &amp; Integrations &gt; API Access</strong></li>
              <li>Generate or copy your API Key and Secret</li>
              <li>Find your Hotel Code under <strong>Property Settings</strong></li>
              <li>Paste all values above and click Save Settings</li>
            </ol>
          </div>

          {settings?.last_sync_at && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              Last synced: {formatTimestamp(settings.last_sync_at)}
            </div>
          )}
        </div>
      )}

      {activeSection === 'sync' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Sync Direction</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => isAdmin && handleToggle('sync_reservations')}
                  disabled={!isAdmin}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${form.sync_reservations ? 'bg-teal-600' : 'bg-gray-300'} disabled:opacity-40`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.sync_reservations ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="h-4 w-4 text-teal-600" />
                    <p className="text-sm font-medium text-gray-700">Pull Reservations (Inbound)</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Automatically import new and updated bookings from SiteMinder into StayWise</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => isAdmin && handleToggle('sync_availability')}
                  disabled={!isAdmin}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${form.sync_availability ? 'bg-teal-600' : 'bg-gray-300'} disabled:opacity-40`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.sync_availability ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ArrowUpFromLine className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-medium text-gray-700">Push Availability & Rates (Outbound)</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Automatically update room availability and rates on SiteMinder when changes are made in StayWise</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Sync Frequency</h4>
            <select
              name="sync_interval_minutes"
              value={form.sync_interval_minutes}
              onChange={handleChange}
              disabled={!isAdmin}
              className="input-field max-w-xs"
            >
              {SYNC_INTERVALS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Rate Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Multiplier</label>
                <input
                  type="number"
                  name="rate_multiplier"
                  value={form.rate_multiplier}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  min={0.1}
                  max={10}
                  step={0.01}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">e.g. 1.0 = same rate, 1.15 = 15% markup</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Advance Days</label>
                <input
                  type="number"
                  name="min_advance_days"
                  value={form.min_advance_days}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  min={0}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum days before arrival</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Advance Days</label>
                <input
                  type="number"
                  name="max_advance_days"
                  value={form.max_advance_days}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  min={1}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">How far ahead to publish availability</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Manual Sync</h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => triggerSync('inbound')}
                disabled={syncing || !form.is_enabled || credentialsMissing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownToLine className="h-4 w-4" />
                {syncing ? 'Syncing...' : 'Pull Reservations Now'}
              </button>
              <button
                onClick={() => triggerSync('outbound')}
                disabled={syncing || !form.is_enabled || credentialsMissing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUpFromLine className="h-4 w-4" />
                {syncing ? 'Syncing...' : 'Push Availability Now'}
              </button>
            </div>
            {credentialsMissing && (
              <p className="text-xs text-gray-500 mt-2">Configure API credentials and enable the integration to run manual syncs</p>
            )}
          </div>
        </div>
      )}

      {activeSection === 'rooms' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Map each of your room types to their corresponding SiteMinder room type IDs.
            These IDs are found in your SiteMinder dashboard under <strong>Rooms &amp; Rates</strong>.
          </p>
          {roomTypes.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No room types configured. Add room types in the Room Types tab first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="table-header">Room Type</th>
                    <th className="table-header">Base Rate</th>
                    <th className="table-header">SiteMinder Room Type ID</th>
                    <th className="table-header">Rate Plan ID</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {roomTypes.map(rt => {
                    const mapping = roomMappings.find(m => m.room_type_id === rt.id);
                    const isMapped = !!(mapping?.siteminder_room_type_id);
                    return (
                      <tr key={rt.id} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">{rt.name}</td>
                        <td className="table-cell">€{rt.base_rate.toFixed(2)}/night</td>
                        <td className="table-cell">
                          <input
                            type="text"
                            value={mapping?.siteminder_room_type_id || ''}
                            onChange={e => handleMappingChange(rt.id, 'siteminder_room_type_id', e.target.value)}
                            disabled={!isAdmin}
                            className="input-field text-sm py-1.5 font-mono"
                            placeholder="e.g. RT-001"
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            type="text"
                            value={mapping?.siteminder_rate_plan_id || ''}
                            onChange={e => handleMappingChange(rt.id, 'siteminder_rate_plan_id', e.target.value)}
                            disabled={!isAdmin}
                            className="input-field text-sm py-1.5 font-mono"
                            placeholder="e.g. BAR"
                          />
                        </td>
                        <td className="table-cell">
                          {isMapped
                            ? <span className="badge badge-success"><CheckCircle2 className="h-3 w-3 mr-1" />Mapped</span>
                            : <span className="badge badge-neutral">Not mapped</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSection === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Last 20 sync attempts for this property</p>
            <button onClick={fetchData} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">No sync logs yet. Run a sync to see results here.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="table-header">Time</th>
                    <th className="table-header">Direction</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Records</th>
                    <th className="table-header">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {syncLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="table-cell text-xs text-gray-500 whitespace-nowrap">{formatTimestamp(log.started_at)}</td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1 text-xs font-medium">
                          {log.direction === 'inbound'
                            ? <><ArrowDownToLine className="h-3 w-3 text-teal-500" />Inbound</>
                            : <><ArrowUpFromLine className="h-3 w-3 text-emerald-500" />Outbound</>
                          }
                        </span>
                      </td>
                      <td className="table-cell"><StatusBadge status={log.status} /></td>
                      <td className="table-cell">{log.records_processed}</td>
                      <td className="table-cell text-xs text-red-600 max-w-xs truncate">{log.error_message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
