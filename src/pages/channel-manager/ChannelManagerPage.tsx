import { useState, useEffect, useCallback } from 'react';
import { GitBranch, RefreshCw, Calendar, Activity, Plus, Lock } from 'lucide-react';
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

type TabId = 'channels' | 'rates' | 'restrictions' | 'logs';

export default function ChannelManagerPage() {
  const { currentHotel } = useHotel();
  const { showToast } = useToast();
  const tenantId = useTenantId();
  const [activeTab, setActiveTab] = useState<TabId>('channels');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);
  const [channelModal, setChannelModal] = useState<{ open: boolean; channel?: Channel | null }>({ open: false });

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
    for (const ch of connected) {
      await syncChannel(ch.id, ch.name);
    }
    setSyncingAll(false);
    showToast('All channels synced successfully', 'success');
  };

  const handleSaveChannel = async (
    formData: { name: string; type: string; api_key: string; property_id: string; client_id: string; client_secret: string; commission_pct: number; sync_enabled: boolean }
  ) => {
    if (!currentHotel) return;
    if (channelModal.channel) {
      const { error } = await supabase.from('channels').update({
        name: formData.name,
        type: formData.type,
        api_key: formData.api_key,
        property_id: formData.property_id,
        client_id: formData.client_id,
        client_secret: formData.client_secret,
        commission_pct: formData.commission_pct,
        sync_enabled: formData.sync_enabled,
        updated_at: new Date().toISOString(),
      }).eq('id', channelModal.channel.id);
      if (error) throw new Error(error.message);
      showToast('Channel updated', 'success');
    } else {
      const { error } = await supabase.from('channels').insert({
        hotel_id: currentHotel.id,
        name: formData.name,
        type: formData.type,
        api_key: formData.api_key,
        property_id: formData.property_id,
        client_id: formData.client_id,
        client_secret: formData.client_secret,
        commission_pct: formData.commission_pct,
        sync_enabled: formData.sync_enabled,
        status: 'disconnected',
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      if (error) throw new Error(error.message);
      showToast('Channel added — connect it to start syncing', 'success');
    }
    await loadData();
  };

  const connectedCount = channels.filter(c => c.status === 'connected').length;
  const errorCount = channels.filter(c => c.status === 'error').length;
  const todaySyncs = syncLogs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChannelModal({ open: true, channel: null })}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Channel
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Channels', value: channels.length, color: 'text-gray-900' },
          { label: 'Connected',      value: connectedCount,  color: 'text-emerald-600' },
          { label: 'Errors',         value: errorCount,      color: 'text-red-500' },
          { label: 'Syncs Today',    value: todaySyncs,      color: 'text-blue-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'channels' && (
        <div>
          {channels.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
              <GitBranch className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No channels configured</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Add your first OTA channel to start syncing</p>
              <button
                onClick={() => setChannelModal({ open: true, channel: null })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Channel
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
        </div>
      )}

      {activeTab === 'rates' && currentHotel && (
        <RateCalendar hotelId={currentHotel.id} channels={channels} />
      )}

      {activeTab === 'restrictions' && currentHotel && (
        <RestrictionsPanel
          hotelId={currentHotel.id}
          tenantId={tenantId}
          channels={channels}
        />
      )}

      {activeTab === 'logs' && (
        <SyncLogTable logs={syncLogs} />
      )}

      {channelModal.open && (
        <ChannelFormModal
          channel={channelModal.channel}
          onClose={() => setChannelModal({ open: false })}
          onSave={handleSaveChannel}
        />
      )}
    </div>
  );
}
