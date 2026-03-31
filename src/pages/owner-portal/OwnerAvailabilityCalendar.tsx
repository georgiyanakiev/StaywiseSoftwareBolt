import { useMemo } from 'react';
import { addDays, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isToday } from 'date-fns';

interface Reservation {
  id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: string;
}

interface Room {
  id: string;
  number: string;
}

interface Props {
  rooms: Room[];
  reservations: Reservation[];
  startDate: Date;
}

function daysInRange(checkIn: string, checkOut: string): string[] {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const days: string[] = [];
  const cur = new Date(start);
  while (cur < end) {
    days.push(format(cur, 'yyyy-MM-dd'));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default function OwnerAvailabilityCalendar({ rooms, reservations, startDate }: Props) {
  const months = useMemo(() => {
    return [0, 1, 2].map(offset => {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + offset, 1);
      return {
        label: format(d, 'MMMM yyyy'),
        days: eachDayOfInterval({ start: startOfMonth(d), end: endOfMonth(d) }),
        monthDate: d,
      };
    });
  }, [startDate]);

  const bookedDays = useMemo(() => {
    const map = new Set<string>();
    for (const r of reservations) {
      if (['confirmed', 'checked_in', 'checked_out'].includes(r.status)) {
        daysInRange(r.check_in, r.check_out).forEach(d => map.add(`${r.room_id}:${d}`));
      }
    }
    return map;
  }, [reservations]);

  if (rooms.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No rooms assigned.</p>;
  }

  return (
    <div className="space-y-8 overflow-x-auto">
      {months.map(month => (
        <div key={month.label}>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">{month.label}</h4>
          <div className="min-w-max">
            <div className="flex">
              <div className="w-20 flex-shrink-0" />
              {month.days.map(day => (
                <div
                  key={day.toString()}
                  className={`w-8 text-center text-xs font-medium pb-1 ${
                    isToday(day) ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
            {rooms.map(room => (
              <div key={room.id} className="flex items-center mb-0.5">
                <div className="w-20 flex-shrink-0 text-xs font-medium text-gray-600 pr-2 text-right">
                  Rm {room.number}
                </div>
                {month.days.map(day => {
                  const key = `${room.id}:${format(day, 'yyyy-MM-dd')}`;
                  const booked = bookedDays.has(key);
                  const same = isSameMonth(day, month.monthDate);
                  return (
                    <div
                      key={day.toString()}
                      className={`w-8 h-6 border-r border-b transition-colors ${
                        !same ? 'bg-gray-50 border-gray-100' :
                        booked
                          ? 'bg-teal-400 border-teal-500'
                          : isToday(day)
                          ? 'bg-blue-50 border-blue-100'
                          : 'bg-white border-gray-100'
                      }`}
                      title={booked ? 'Booked' : 'Available'}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-teal-400" />
              <span className="text-xs text-gray-500">Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-white border border-gray-200" />
              <span className="text-xs text-gray-500">Available</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
