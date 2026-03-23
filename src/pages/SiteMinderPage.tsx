import { useState, useEffect, useCallback } from 'react';
import {
  Link2, RefreshCw, ArrowDownToLine, ArrowUpFromLine, CheckCircle2,
  XCircle, AlertCircle, Clock, TrendingUp, Calendar, Users, Activity,
  ExternalLink, Settings2
} from 'lucide-react';
import { useHotel } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { SiteMinderSettings, SiteMinderSyncLog } from '../types';
import { useNavigate } from 'react-router-dom';

function StatusDot({ status }: { status: string }) {
  if (status === 'success') return <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />;
  if (status === 'failed') return <span className="flex h-2.5 w-2.5 rounded-full bg-red-500" />;
  if (status === 'partial') return <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />;
  if (status === 'running') return <span className="flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />;
  return <span className="flex h-2.5 w-2.5 rounded-full bg-gray-300" />;
}

function SyncLogRow({ log }: { log: SiteMinderSyncLog }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
      <StatusDot status={log.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {log.direction === 'inbound'
            ? <><ArrowDownToLine className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" /><span className="text-sm font-medium text-gray-800">Pulled reservations</span></>
            : <><ArrowUpFromLine className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" /><span className="text-sm font-medium text-gray-800">Pushed availability</span></>
          }
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            log.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
            log.status === 'failed' ? 'bg-red-50 text-red-700' :
            log.status === 'partial' ? 'bg-amber-50 text-amber-700' :
            log.status === 'running' ? 'bg-teal-50 text-teal-700' :
            'bg-gray-100 text-gray-600'
          }`}>{log.status}</span>
        </div>
        {log.error_message && (
          <p className="text-xs text-red-500 mt-0.5 truncate">{log.error_message}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900">{log.records_processed} records</p>
        <p className="text-xs text-gray-400">{new Date(log.started_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function SiteMinderPage() {
  const { currentHotel } = useHotel();
  const { staff } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<SiteMinderSettings | null>(null);
  const [syncLogs, setSyncLogs] = useState<SiteMinderSyncLog[]>([]);
  const [stats, setStats] = useState({
    totalSynced: 0,
    lastWeekReservations: 0,
    successRate: 0,
    pendingReservations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<'inbound' | 'outbound' | null>(null);

  const isAdmin = staff?.role === 'admin' || staff?.role === 'manager';

  const fetchData = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const [settingsRes, logsRes, reservationsRes] = await Promise.all([
        supabase.from('siteminder_settings').select('*').eq('hotel_id', currentHotel.id).maybeSingle(),
        supabase.from('siteminder_sync_logs').select('*').eq('hotel_id', currentHotel.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('reservations').select('id, status, created_at').eq('hotel_id', currentHotel.id).eq('booking_source', 'siteminder'),
      ]);

      setSettings(settingsRes.data as SiteMinderSettings | null);
      const logs = (logsRes.data || []) as SiteMinderSyncLog[];
      setSyncLogs(logs);

      const reservations = reservationsRes.data || [];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const lastWeek = reservations.filter(r => new Date(r.created_at) > oneWeekAgo);
      const successLogs = logs.filter(l => l.status === 'success');
      const successRate = logs.length > 0 ? Math.round((successLogs.length / logs.length) * 100) : 0;
      const pending = reservations.filter(r => r.status === 'confirmed' || r.status === 'pending').length;

      setStats({
        totalSynced: reservations.length,
        lastWeekReservations: lastWeek.length,
        successRate,
        pendingReservations: pending,
      });
    } finally {
      setLoading(false);
    }
  }, [currentHotel]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const triggerSync = async (direction: 'inbound' | 'outbound') => {
    if (!currentHotel || !settings) return;
    if (!settings.api_key) {
      toast('error', 'Configure API credentials in Settings first');
      return;
    }
    setSyncing(direction);
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
      toast('success', `Sync completed — ${result.records_processed} records processed`);
      await fetchData();
    } catch (err: unknown) {
      toast('error', (err as Error).message || 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isConfigured = !!(settings?.api_key && settings?.hotel_code);
  const isEnabled = settings?.is_enabled && isConfigured;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">SiteMinder Integration</h1>
            <p className="text-sm text-gray-500">Channel manager sync dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <StatusDot status={isEnabled ? (settings?.last_sync_status || 'never') : 'never'} />
            <span className={`text-sm font-medium ${isEnabled ? 'text-gray-700' : 'text-gray-400'}`}>
              {isEnabled ? 'Connected' : 'Not connected'}
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              Configure
            </button>
          )}
        </div>
      </div>

      {!isConfigured && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Integration not configured</p>
              <p className="text-sm text-amber-700 mt-1">
                To sync with SiteMinder you need a SiteMinder account with API access.
                Once you have your API key and hotel code, add them in <strong>Settings &gt; SiteMinder</strong>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="https://www.siteminder.com/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 underline hover:text-amber-900"
                >
                  Visit SiteMinder support <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className="text-amber-400">·</span>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-sm font-medium text-amber-800 underline hover:text-amber-900"
                >
                  Open Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isConfigured && !settings?.is_enabled && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Integration is disabled</p>
              <p className="text-sm text-gray-500">Enable in Settings &gt; SiteMinder to start syncing</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Enable now
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'SiteMinder Reservations', value: stats.totalSynced, icon: Calendar, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'This Week', value: stats.lastWeekReservations, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Bookings', value: stats.pendingReservations, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Sync Success Rate', value: `${stats.successRate}%`, icon: Activity, color: 'text-gray-700', bg: 'bg-gray-100' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Manual Sync Controls</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-4 p-4 rounded-lg border border-teal-100 bg-teal-50">
              <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <ArrowDownToLine className="h-5 w-5 text-teal-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-teal-900">Pull Reservations</p>
                <p className="text-xs text-teal-700 mt-0.5">Import new and updated bookings from SiteMinder</p>
                {settings?.last_sync_at && (
                  <p className="text-xs text-teal-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last sync: {new Date(settings.last_sync_at).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => triggerSync('inbound')}
                disabled={!!syncing || !isEnabled}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {syncing === 'inbound'
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Syncing...</>
                  : <><RefreshCw className="h-3.5 w-3.5" />Sync Now</>
                }
              </button>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border border-emerald-100 bg-emerald-50">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <ArrowUpFromLine className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-900">Push Availability & Rates</p>
                <p className="text-xs text-emerald-700 mt-0.5">Update room availability and pricing on SiteMinder</p>
                {settings?.sync_interval_minutes && (
                  <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Auto-syncs every {settings.sync_interval_minutes} min
                  </p>
                )}
              </div>
              <button
                onClick={() => triggerSync('outbound')}
                disabled={!!syncing || !isEnabled}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {syncing === 'outbound'
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Pushing...</>
                  : <><RefreshCw className="h-3.5 w-3.5" />Push Now</>
                }
              </button>
            </div>
          </div>

          {!isEnabled && isConfigured && (
            <p className="text-xs text-gray-400 mt-3 text-center">Enable the integration in Settings to run syncs</p>
          )}
          {!isConfigured && (
            <p className="text-xs text-gray-400 mt-3 text-center">Configure API credentials in Settings to enable syncing</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Connection Details</h2>
            {isConfigured && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {isEnabled
                  ? <><CheckCircle2 className="h-3 w-3" />Active</>
                  : <><XCircle className="h-3 w-3" />Inactive</>
                }
              </span>
            )}
          </div>
          <div className="space-y-3">
            {[
              { label: 'Property ID', value: settings?.property_id || '—' },
              { label: 'Hotel Code', value: settings?.hotel_code || '—' },
              { label: 'API Key', value: settings?.api_key ? `${settings.api_key.substring(0, 8)}...` : '—' },
              { label: 'Sync Interval', value: settings?.sync_interval_minutes ? `${settings.sync_interval_minutes} minutes` : '—' },
              { label: 'Rate Multiplier', value: settings?.rate_multiplier ? `${settings.rate_multiplier}x` : '—' },
              { label: 'Pull Reservations', value: settings?.sync_reservations ? 'Enabled' : 'Disabled' },
              { label: 'Push Availability', value: settings?.sync_availability ? 'Enabled' : 'Disabled' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs font-medium text-gray-500">{item.label}</span>
                <span className="text-xs font-semibold text-gray-800 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Sync Activity</h2>
          <button onClick={fetchData} className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        {syncLogs.length === 0 ? (
          <div className="text-center py-10">
            <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No sync activity yet</p>
            <p className="text-xs text-gray-400 mt-1">Run a sync to see results here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {syncLogs.slice(0, 15).map(log => <SyncLogRow key={log.id} log={log} />)}
          </div>
        )}
      </div>
    </div>
  );
}
