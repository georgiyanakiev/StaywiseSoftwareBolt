import { LogIn, LogOut, CalendarPlus, XCircle } from 'lucide-react';
import { formatDateTime, formatCurrency } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ActivityItem } from './useDashboardData';

interface Props {
  items: ActivityItem[];
}

export default function ActivityFeed({ items }: Props) {
  const { t } = useLanguage();

  const TYPE_CONFIG = {
    checkin: { icon: LogIn, color: 'text-emerald-600', bg: 'bg-emerald-50', label: t.activity.checkin },
    checkout: { icon: LogOut, color: 'text-blue-600', bg: 'bg-blue-50', label: t.activity.checkout },
    booking: { icon: CalendarPlus, color: 'text-amber-600', bg: 'bg-amber-50', label: t.activity.booking },
    cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: t.activity.cancelled },
  };

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        {t.activity.noActivity}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {items.map(item => {
        const cfg = TYPE_CONFIG[item.type];
        const Icon = cfg.icon;
        return (
          <div key={item.id} className="flex items-start gap-3 py-3 px-1 hover:bg-gray-50/60 rounded-lg transition-colors">
            <div className={`${cfg.bg} ${cfg.color} p-1.5 rounded-lg flex-shrink-0 mt-0.5`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{item.guestName}</p>
                {item.amount != null && item.amount > 0 && (
                  <span className="text-xs font-semibold text-gray-700 flex-shrink-0">{formatCurrency(item.amount)}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className={`${cfg.color} font-medium`}>{cfg.label}</span>
                {item.roomNumber !== '—' && <span className="text-gray-400"> &middot; {t.activity.room} {item.roomNumber}</span>}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{formatDateTime(item.time).split(',')[1]?.trim() || ''}</span>
          </div>
        );
      })}
    </div>
  );
}
