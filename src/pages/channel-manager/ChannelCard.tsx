import { useState } from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCw, Plug, PlugZap, Settings, Percent } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

export interface Channel {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string | null;
  api_key: string;
  property_id: string;
  commission_pct: number;
  sync_enabled: boolean;
  client_id: string;
  client_secret: string;
}

interface Props {
  channel: Channel;
  onToggle: (id: string, currentStatus: string) => Promise<void>;
  onSync: (id: string, name: string) => Promise<void>;
  onSettings: (channel: Channel) => void;
  syncing: boolean;
}

const CHANNEL_META: Record<string, { abbr: string; bg: string }> = {
  booking_com: { abbr: 'B.', bg: 'bg-blue-600' },
  airbnb:      { abbr: 'Ab', bg: 'bg-rose-500' },
  expedia:     { abbr: 'Ex', bg: 'bg-amber-500' },
  direct:      { abbr: 'Di', bg: 'bg-emerald-600' },
  other:       { abbr: '?',  bg: 'bg-gray-500'  },
};

function getChannelMeta(channel: Channel) {
  const byType = CHANNEL_META[channel.type];
  if (byType) return byType;
  const name = channel.name.toLowerCase();
  if (name.includes('booking')) return CHANNEL_META.booking_com;
  if (name.includes('airbnb'))  return CHANNEL_META.airbnb;
  if (name.includes('expedia')) return CHANNEL_META.expedia;
  if (name.includes('direct'))  return CHANNEL_META.direct;
  return CHANNEL_META.other;
}

export default function ChannelCard({ channel, onToggle, onSync, onSettings, syncing }: Props) {
  const [toggling, setToggling] = useState(false);
  const meta = getChannelMeta(channel);
  const isConnected = channel.status === 'connected';
  const isError = channel.status === 'error';

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(channel.id, channel.status);
    setToggling(false);
  };

  return (
    <div className={`bg-white rounded-xl border p-5 transition-all hover:shadow-md flex flex-col gap-4 ${isError ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
            {meta.abbr}
          </div>
          <div>
            <p className="font-semibold text-gray-900 leading-tight">{channel.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {isConnected && <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
              {isError && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              {!isConnected && !isError && <WifiOff className="w-3.5 h-3.5 text-gray-400" />}
              <span className={`text-xs font-medium ${isConnected ? 'text-emerald-600' : isError ? 'text-red-600' : 'text-gray-400'}`}>
                {isConnected ? 'Connected' : isError ? 'Error' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : isError ? 'bg-red-400' : 'bg-gray-300'}`} />
          <button
            onClick={() => onSettings(channel)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Channel settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Percent className="w-3 h-3" />
          <span>{channel.commission_pct ?? 0}% commission</span>
        </div>
        {channel.last_sync ? (
          <span>Synced {formatDateTime(channel.last_sync)}</span>
        ) : (
          <span>Never synced</span>
        )}
      </div>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            isConnected
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {toggling ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : isConnected ? (
            <Plug className="w-3.5 h-3.5" />
          ) : (
            <PlugZap className="w-3.5 h-3.5" />
          )}
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
        {isConnected && (
          <button
            onClick={() => onSync(channel.id, channel.name)}
            disabled={syncing}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        )}
      </div>
    </div>
  );
}
