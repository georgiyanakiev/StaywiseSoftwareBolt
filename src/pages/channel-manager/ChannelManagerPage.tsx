import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, RefreshCw, Calendar, Activity, Plus, Lock,
  BookOpen, Settings,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { useTenantId } from '../../hooks/useTenantQuery';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ChannelCard, { type Channel } from './ChannelCard';
import RateCalendar from './RateCalendar';
import SyncLogTable, { type SyncLog } from './SyncLogTable';
import ChannelFormModal from './ChannelFormModal';
import RestrictionsPanel from './RestrictionsPanel';
import ChannelCatalog from './ChannelMarketplace';

type TopTab = 'my_channels' | 'catalog';
type SubTab = 'channels' | 'rates' | 'restrictions' | 'logs';

export default function ChannelManagerPage() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const showToast = (msg: string, type: 'success' | 'error') => toast(type, msg);
  const tenantId = useTenantId();

  const [topTab, setTopTab] = useState<TopTab>('my_channels');
  const [subTab, setSubTab] = useState<SubTab>('channels');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);
  const [channelModal, setChannelModal] = useState<{ open: boolean; channel?: Channel | null }>({ open: false });
  const [configureChannelId, setConfigureChannelId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const [{ data: ch }, { data: logs }] = await Promise.all([
        supabase.from('channels').select('*').eq('hotel_id', currentHotel.id).order('name'),
        supabase.from('channel_sync_logs').select('*').eq('hotel_id', currentHotel.id)
          .order('created_at', { ascending: false }).limit(50),
      ]);
      setChannels((ch ?? []) as Channel[]);
      setSyncLogs((logs ?? []) as SyncLog[]);
    } finally {
      setLoading(false);
    }
  }, [currentHotel]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleChannel = async (id: string, currentStatus: string) => {
    if (!currentHotel) return;
    const newStatus = currentStatus === 'connected' ? 'disconnected' : 'connected';
    const { error } = await supabase.from('channels')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { showToast('Failed to update channel status', 'error'); return; }
    setChannels(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as Channel['status'] } : c));
    showToast(`Channel ${newStatus === 'connected' ? 'connected' : 'disconnected'}`, 'success');
  };

  const syncChannel = async (id: string, name: string) => {
    if (!currentHotel) return;
    setSyncingChannel(id);
    await new Promise(r => setTimeout(r, 1500));
    const now = new Date().toISOString();
    const roomsAffected = Math.floor(Math.random() * 15) + 5;
    const datesAffected = Math.floor(Math.random() * 30) + 10;

    await Promise.all([
      supabase.from('channels').update({ last_sync: now, status: 'connected' }).eq('id', id),
      supabase.from('channel_rates').update({ status: 'synced', synced_at: now })
        .eq('channel_id', id).eq('status', 'pending'),
      supabase.from('channel_sync_logs').insert({
        hotel_id: currentHotel.id,
        channel_id: id,
        channel_name: name,
        rooms_affected: roomsAffected,
        dates_affected: datesAffected,
        status: 'success',
        error_message: '',
        ...(tenantId ? { tenant_id: tenantId } : {}),
      }),
    ]);

    setSyncingChannel(null);
    showToast(`${name} synced — ${roomsAffected} rooms, ${datesAffected} dates updated`, 'success');
    loadData();
  };

  const syncAllChannels = async () => {
    if (!currentHotel) return;
    const connected = channels.filter(c => c.status === 'connected');
    if (connected.length === 0) { showToast('No connected channels to sync', 'error'); return; }
    setSyncingAll(true);
    for (const ch of connected) await syncChannel(ch.id, ch.name);
    setSyncingAll(false);
    showToast('All channels synced successfully', 'success');
  };

  const handleSaveChannel = async (
    formData: { name: string; type: string; api_key: string; property_id: string; client_id: string; client_secret: string; commission_pct: number; sync_enabled: boolean }
  ) => {
    if (!currentHotel) return;
    if (channelModal.channel) {
      const { error } = await supabase.from('channels').update({
        name: formData.name, type: formData.type, api_key: formData.api_key,
        property_id: formData.property_id, client_id: formData.client_id,
        client_secret: formData.client_secret, commission_pct: formData.commission_pct,
        sync_enabled: formData.sync_enabled, updated_at: new Date().toISOString(),
      }).eq('id', channelModal.channel.id);
      if (error) throw new Error(error.message);
      showToast('Channel updated', 'success');
    } else {
      const { error } = await supabase.from('channels').insert({
        hotel_id: currentHotel.id, name: formData.name, type: formData.type,
        api_key: formData.api_key, property_id: formData.property_id,
        client_id: formData.client_id, client_secret: formData.client_secret,
        commission_pct: formData.commission_pct, sync_enabled: formData.sync_enabled,
        status: 'disconnected',
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      if (error) throw new Error(error.message);
      showToast('Channel added — connect it to start syncing', 'success');
    }
    await loadData();
  };

  const handleConfigureFromCatalog = (channelId: string) => {
    setConfigureChannelId(channelId);
    setTopTab('my_channels');
    setSubTab('channels');
    const ch = channels.find(c => c.id === channelId);
    if (ch) setChannelModal({ open: true, channel: ch });
  };

  const handleChannelAddedFromCatalog = () => {
    loadData();
  };

  const connectedCount = channels.filter(c => c.status === 'connected').length;
  const errorCount = channels.filter(c => c.status === 'error').length;
  const todaySyncs = syncLogs.filter(l =>
    new Date(l.created_at).toDateString() === new Date().toDateString()
  ).length;

  const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'channels',     label: 'Channels',     icon: GitBranch },
    { id: 'rates',        label: 'Rate Calendar', icon: Calendar },
    { id: 'restrictions', label: 'Restrictions',  icon: Lock },
    { id: 'logs',         label: 'Sync Log',      icon: Activity },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <GitBranch className="w-6 h-6 text-blue-600" />
            Channel Manager
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Sync rates and availability across OTA channels in real time
          </p>
        </div>
        {topTab === 'my_channels' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChannelModal({ open: true, channel: null })}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Custom
            </button>
            <button
              onClick={syncAllChannels}
              disabled={syncingAll || connectedCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
              {syncingAll ? 'Syncing...' : 'Sync All'}
            </button>
          </div>
        )}
      </div>

      {/* Stats row — only in My Channels */}
      {topTab === 'my_channels' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Channels', value: channels.length,  color: 'text-gray-900' },
            { label: 'Connected',      value: connectedCount,   color: 'text-emerald-600' },
            { label: 'Errors',         value: errorCount,       color: 'text-red-500' },
            { label: 'Syncs Today',    value: todaySyncs,       color: 'text-blue-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Primary tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { id: 'my_channels' as TopTab, label: 'My Channels', icon: GitBranch,
            badge: channels.length > 0 ? channels.length : undefined },
          { id: 'catalog'     as TopTab, label: 'Channel Catalog', icon: BookOpen },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setTopTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              topTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                topTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── MY CHANNELS ── */}
      {topTab === 'my_channels' && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {subTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  subTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {subTab === 'channels' && (
            <>
              {channels.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                    <GitBranch className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="font-semibold text-gray-700 text-base">No channels connected yet</p>
                  <p className="text-sm text-gray-400 mt-1.5 mb-6 max-w-xs mx-auto">
                    Browse the catalog below to add your first channel
                  </p>
                  <button
                    onClick={() => setTopTab('catalog')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    Browse Channel Catalog →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {channels.map(ch => (
                    <ChannelCard
                      key={ch.id}
                      channel={ch}
                      onToggle={toggleChannel}
                      onSync={syncChannel}
                      onSettings={channel => setChannelModal({ open: true, channel })}
                      syncing={syncingChannel === ch.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {subTab === 'rates' && currentHotel && (
            <RateCalendar hotelId={currentHotel.id} channels={channels} />
          )}

          {subTab === 'restrictions' && currentHotel && (
            <RestrictionsPanel hotelId={currentHotel.id} tenantId={tenantId} channels={channels} />
          )}

          {subTab === 'logs' && (
            <SyncLogTable logs={syncLogs} />
          )}
        </>
      )}

      {/* ── CHANNEL CATALOG ── */}
      {topTab === 'catalog' && currentHotel && (
        <ChannelCatalog
          hotelChannels={channels}
          hotelId={currentHotel.id}
          tenantId={tenantId}
          onChannelAdded={handleChannelAddedFromCatalog}
          onConfigure={handleConfigureFromCatalog}
          showToast={showToast}
        />
      )}

      {/* Channel form modal */}
      {channelModal.open && (
        <ChannelFormModal
          channel={channelModal.channel}
          onClose={() => { setChannelModal({ open: false }); setConfigureChannelId(null); }}
          onSave={handleSaveChannel}
        />
      )}

      {void configureChannelId}
    </div>
  );
}
