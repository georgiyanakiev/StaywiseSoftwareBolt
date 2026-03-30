import { useState } from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCw, Plug, PlugZap } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

interface Channel {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string | null;
  api_key: string;
  property_id: string;
}

interface Props {
  channel: Channel;
  onToggle: (id: string, currentStatus: string) => Promise<void>;
  onSync: (id: string, name: string) => Promise<void>;
  syncing: boolean;
}

const CHANNEL_ICONS: Record<string, string> = {
  'Booking.com': 'B.',
  'Airbnb': 'Ab',
  'Expedia': 'Ex',
  'Direct': 'Di',
};

const CHANNEL_COLORS: Record<string, string> = {
  'Booking.com': 'bg-blue-600',
  'Airbnb': 'bg-rose-500',
  'Expedia': 'bg-amber-500',
  'Direct': 'bg-emerald-600',
};

export default function ChannelCard({ channel, onToggle, onSync, syncing }: Props) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(channel.id, channel.status);
    setToggling(false);
  };

  const isConnected = channel.status === 'connected';
  const isError = channel.status === 'error';

  return (
    <div className={`bg-white rounded-xl border p-5 transition-all hover:shadow-md ${isError ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${CHANNEL_COLORS[channel.name] ?? 'bg-gray-500'} flex items-center justify-center text-white text-sm font-bold`}>
            {CHANNEL_ICONS[channel.name] ?? channel.name.slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{channel.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isConnected && <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
              {isError && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              {!isConnected && !isError && <WifiOff className="w-3.5 h-3.5 text-gray-400" />}
              <span className={`text-xs font-medium ${isConnected ? 'text-emerald-600' : isError ? 'text-red-600' : 'text-gray-400'}`}>
                {isConnected ? 'Connected' : isError ? 'Error' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${isConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : isError ? 'bg-red-400' : 'bg-gray-300'}`} />
      </div>

      {channel.last_sync && (
        <p className="text-xs text-gray-400 mb-4">
          Last sync: {formatDateTime(channel.last_sync)}
        </p>
      )}
      {!channel.last_sync && (
        <p className="text-xs text-gray-400 mb-4">Never synced</p>
      )}

      <div className="flex gap-2">
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
