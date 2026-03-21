import type { AvailabilityDay } from './useDashboardData';

interface Props {
  days: AvailabilityDay[];
}

export default function AvailabilityCalendar({ days }: Props) {
  if (days.length === 0) {
    return <div className="h-32 flex items-center justify-center text-sm text-gray-400">No availability data</div>;
  }

  return (
    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
      {days.map(day => {
        const pct = day.total > 0 ? (day.occupied / day.total) * 100 : 0;
        const fillColor =
          day.isPast ? '#e5e7eb'
          : pct >= 90 ? '#ef4444'
          : pct >= 70 ? '#f59e0b'
          : pct >= 40 ? '#2563eb'
          : '#10b981';

        return (
          <div key={day.date} className="flex flex-col items-center gap-1 group relative">
            <span className={`text-[10px] font-medium ${day.isToday ? 'text-blue-600' : 'text-gray-400'}`}>
              {day.label}
            </span>
            <div className="relative w-full">
              <div
                className={`w-full rounded-md overflow-hidden ${day.isPast ? 'opacity-40' : ''}`}
                style={{ height: 48, background: '#f1f5f9' }}
              >
                <div
                  className="w-full absolute bottom-0 rounded-md transition-all duration-500"
                  style={{ height: `${Math.max(4, pct)}%`, background: fillColor }}
                />
              </div>
              {day.isToday && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600" />
              )}
            </div>
            <span className={`text-[11px] font-semibold ${day.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
              {day.dayNum}
            </span>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              {day.available} avail / {day.occupied} occ
            </div>
          </div>
        );
      })}
    </div>
  );
}
