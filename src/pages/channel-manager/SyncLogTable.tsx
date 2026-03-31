import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

export interface SyncLog {
  id: string;
  channel_name: string;
  rooms_affected: number;
  dates_affected: number;
  status: 'success' | 'failed' | 'partial';
  error_message: string;
  created_at: string;
}

interface Props {
  logs: SyncLog[];
}

const STATUS_CONFIG = {
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Success' },
  failed:  { icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50',     label: 'Failed' },
  partial: { icon: AlertCircle,  color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Partial' },
};

export default function SyncLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
        <p className="font-medium">No sync logs yet</p>
        <p className="text-sm mt-1">Sync events will appear here after you sync a channel</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="table-header">Timestamp</th>
              <th className="table-header">Channel</th>
              <th className="table-header text-center">Rooms</th>
              <th className="table-header text-center">Dates</th>
              <th className="table-header">Status</th>
              <th className="table-header">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.success;
              const Icon = cfg.icon;
              return (
                <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="table-cell text-gray-500 text-xs font-mono whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  <td className="table-cell font-medium text-gray-900">{log.channel_name}</td>
                  <td className="table-cell text-center">
                    <span className="font-semibold text-gray-700">{log.rooms_affected}</span>
                  </td>
                  <td className="table-cell text-center">
                    <span className="font-semibold text-gray-700">{log.dates_affected ?? 0}</span>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500 text-xs">{log.error_message || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
