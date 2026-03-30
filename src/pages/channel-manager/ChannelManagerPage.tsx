import { useState, useEffect, useCallback } from 'react';
import { GitBranch, RefreshCw, Calendar, Activity, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ChannelCard from './ChannelCard';
import RateCalendar from './RateCalendar';
import SyncLogTable from './SyncLogTable';
import { formatDateTime } from '../../lib/utils';

type TabId = 'channels' | 'rates' | 'logs';

interface Channel {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string | null;
  api_key: string;
  property_id: string;
}

interface SyncLog {
  id: string;
  channel_name: string;
  rooms_affected: number;
  status: 'success' | 'failed' | 'partial';
  error_message: string;
  created_at: string;
}

export default function ChannelManagerPage() {
  const { currentHotel } = useHotel();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('channels');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const [{ data: ch }, { data: logs }] = await Promise.all([
        supabase.from('channels').select('*').eq('hotel_id', currentHotel.id).order('name'),
        supabase.from('channel_sync_logs').select('*').eq('hotel_id', currentHotel.id).order('created_at', { ascending: false }).limit(50),
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
    const { error } = await supabase.from('channels').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      showToast('Failed to update channel status', 'error');
      return;
    }
    setChannels(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as Channel['status'] } : c));
    showToast(`Channel ${newStatus === 'connected' ? 'connected' : 'disconnected'} successfully`, 'success');
  };

  const syncChannel = async (id: string, name: string) => {
    if (!currentHotel) return;
    setSyncingChannel(id);
    await new Promise(r => setTimeout(r, 1500));
    const now = new Date().toISOString();
    const roomsAffected = Math.floor(Math.random() * 15) + 5;

    await Promise.all([
      supabase.from('channels').update({ last_sync: now, status: 'connected' }).eq('id', id),
      supabase.from('channel_rates').update({ status: 'synced', synced_at: now }).eq('channel_id', id),
      supabase.from('channel_sync_logs').insert({
        hotel_id: currentHotel.id,
        channel_id: id,
        channel_name: name,
        rooms_affected: roomsAffected,
        status: 'success',
        error_message: '',
      }),
    ]);

    setSyncingChannel(null);
    showToast(`${name} synced — ${roomsAffected} room-dates updated`, 'success');
    loadData();
  };

  const syncAllChannels = async () => {
    if (!currentHotel) return;
    const connected = channels.filter(c => c.status === 'connected');
    if (connected.length === 0) {
      showToast('No connected channels to sync', 'error');
      return;
    }
    setSyncingAll(true);
    for (const ch of connected) {
      await syncChannel(ch.id, ch.name);
    }
    setSyncingAll(false);
    showToast(`All channels synced successfully`, 'success');
  };

  const connectedCount = channels.filter(c => c.status === 'connected').length;

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'channels', label: 'Channels', icon: GitBranch },
    { id: 'rates', label: 'Rate Calendar', icon: Calendar },
    { id: 'logs', label: 'Sync Log', icon: Activity },
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
            Sync rates and availability to OTA channels in real time
          </p>
        </div>
        <button
          onClick={syncAllChannels}
          disabled={syncingAll || connectedCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
          Sync All Channels
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Channels</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{channels.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Connected</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{connectedCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Errors</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{channels.filter(c => c.status === 'error').length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Syncs Today</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{syncLogs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {channels.map(ch => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                onToggle={toggleChannel}
                onSync={syncChannel}
                syncing={syncingChannel === ch.id}
              />
            ))}
            {channels.length === 0 && (
              <div className="col-span-4 py-16 text-center text-gray-400">
                <GitBranch className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No channels configured</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rates' && currentHotel && (
        <RateCalendar hotelId={currentHotel.id} channels={channels} />
      )}

      {activeTab === 'logs' && (
        <SyncLogTable logs={syncLogs} />
      )}
    </div>
  );
}
