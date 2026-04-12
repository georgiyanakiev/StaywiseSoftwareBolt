import { useState, useRef, useEffect } from 'react';
import {
  Wifi, WifiOff, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, RefreshCw, X,
} from 'lucide-react';
import { useWebhookStatus, type SyncStatus, type WebhookEvent } from '../../hooks/useWebhookStatus';
import { formatDate } from '../../lib/utils';

interface Props {
  hotelId: string | undefined;
}

const STATUS_CONFIG: Record<SyncStatus['overall'], {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: typeof Wifi;
  pulse: boolean;
}> = {
  healthy: {
    label: 'Sync Active',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    pulse: false,
  },
  degraded: {
    label: 'Sync Issues',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertTriangle,
    pulse: true,
  },
  failing: {
    label: 'Sync Failing',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: WifiOff,
    pulse: true,
  },
  unknown: {
    label: 'No Sync Data',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: Wifi,
    pulse: false,
  },
};

export default function SyncStatusIndicator({ hotelId }: Props) {
  const { status, loading, refresh } = useWebhookStatus(hotelId);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (loading && status.overall === 'unknown') return null;

  const config = STATUS_CONFIG[status.overall];
  const Icon = config.icon;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
          border transition-all
          ${config.bg} ${config.color} ${config.border}
          hover:shadow-sm
        `}
      >
        <span className="relative flex items-center">
          <Icon className="w-3.5 h-3.5" />
          {config.pulse && (
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
              status.overall === 'failing' ? 'bg-red-500' : 'bg-amber-500'
            } animate-pulse`} />
          )}
        </span>
        <span className="hidden sm:inline">{config.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className={`${config.bg} px-4 py-3 flex items-center justify-between border-b ${config.border}`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); refresh(); }}
                className="p-1 rounded hover:bg-white/50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-white/50 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Today" value={status.totalToday} sub="total" />
              <StatBox label="Success" value={status.successToday} sub="events" color="text-emerald-600" />
              <StatBox label="Failed" value={status.failedToday} sub="events" color="text-red-600" />
            </div>

            {status.retryingCount > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span className="text-xs text-amber-700 font-medium">
                  {status.retryingCount} event{status.retryingCount > 1 ? 's' : ''} retrying
                </span>
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              {status.lastSuccess && (
                <div className="flex items-center justify-between">
                  <span>Last successful sync</span>
                  <span className="text-emerald-600 font-medium">{timeAgo(status.lastSuccess)}</span>
                </div>
              )}
              {status.lastFailure && (
                <div className="flex items-center justify-between">
                  <span>Last failure</span>
                  <span className="text-red-600 font-medium">{timeAgo(status.lastFailure)}</span>
                </div>
              )}
            </div>

            {status.recentEvents.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Recent Events</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {status.recentEvents.map(event => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {status.recentEvents.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                No webhook events in the last 24 hours
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: number; sub: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <div className={`text-lg font-bold ${color || 'text-gray-800'}`}>{value}</div>
      <div className="text-[10px] text-gray-500 font-medium leading-tight">{label}</div>
    </div>
  );
}

function EventRow({ event }: { event: WebhookEvent }) {
  const statusColor = event.status === 'success'
    ? 'bg-emerald-500'
    : event.status === 'retrying'
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-gray-50 transition-colors">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${statusColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-700 truncate">
            {event.event_type.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(event.created_at)}</span>
        </div>
        {event.error_message && event.status === 'failed' && (
          <p className="text-[10px] text-red-500 truncate mt-0.5">{event.error_message}</p>
        )}
        {event.attempt > 1 && (
          <span className="text-[10px] text-gray-400">Attempt {event.attempt}/{event.max_attempts}</span>
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return formatDate(date, 'MMM d, HH:mm');
}
