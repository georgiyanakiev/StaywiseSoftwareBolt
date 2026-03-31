import { Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../lib/utils';
import type { OccupancyDay, MonthOccupancy, RoomPerf } from './types';

const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };

function getHeatColor(pct: number): string {
  if (pct >= 90) return '#059669';
  if (pct >= 75) return '#10b981';
  if (pct >= 60) return '#34d399';
  if (pct >= 45) return '#fbbf24';
  if (pct >= 30) return '#f59e0b';
  return '#f87171';
}

interface Props {
  occupancyByDay: OccupancyDay[];
  monthOccupancy: MonthOccupancy[];
  roomPerf: RoomPerf[];
  currency: string;
  onExport: () => void;
  daysCount: number;
}

export default function OccupancyReport({ occupancyByDay, monthOccupancy, roomPerf, currency, onExport, daysCount }: Props) {
  const avgOccupancy = occupancyByDay.length > 0
    ? occupancyByDay.reduce((s, d) => s + d.occupancyPct, 0) / occupancyByDay.length
    : 0;

  const trendInterval = Math.max(0, Math.floor(daysCount / 10) - 1);

  const calendarRows: OccupancyDay[][] = [];
  for (let i = 0; i < occupancyByDay.length; i += 7) {
    calendarRows.push(occupancyByDay.slice(i, i + 7));
  }

  const trendData = occupancyByDay.map(d => ({
    date: d.date.slice(5),
    occupancy: Math.round(d.occupancyPct),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Occupancy Report</h2>
        <button onClick={onExport} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Occupancy Heatmap</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Low</span>
            {['#f87171', '#f59e0b', '#fbbf24', '#34d399', '#10b981', '#059669'].map(c => (
              <div key={c} className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
            ))}
            <span>High</span>
          </div>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
          {occupancyByDay.map(day => (
            <div
              key={day.date}
              className="aspect-square rounded-md flex flex-col items-center justify-center cursor-default group relative"
              style={{ backgroundColor: getHeatColor(day.occupancyPct) }}
              title={`${day.date}: ${day.occupancyPct.toFixed(0)}% (${day.occupied}/${day.available} rooms)`}
            >
              <span className="text-white text-[10px] font-bold leading-none">{day.occupancyPct.toFixed(0)}%</span>
              <span className="text-white text-[9px] opacity-80 leading-none mt-0.5">{day.date.slice(8)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Avg: {avgOccupancy.toFixed(1)}%</span>
          <span className="text-gray-400">across {occupancyByDay.length} days</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Occupancy Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={trendInterval} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v || 0)}%`, 'Occupancy']} />
              <Line type="monotone" dataKey="occupancy" name="Occupancy" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Month-by-Month Comparison</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthOccupancy} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v || 0)}%`, '']} />
              <Legend />
              <Bar dataKey="occupancyPct" name="This Year" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prevOccupancyPct" name="Last Year" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Room Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Room', 'Type', 'Nights Occupied', 'Nights Available', 'Occupancy', 'Revenue'].map(h => (
                  <th key={h} className={`text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 ${h === 'Room' || h === 'Type' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {roomPerf.slice(0, 20).map(row => (
                <tr key={row.roomNumber} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 text-sm font-medium text-gray-900">{row.roomNumber}</td>
                  <td className="py-3 text-sm text-gray-600">{row.roomType}</td>
                  <td className="py-3 text-sm text-gray-700 text-right">{row.nightsOccupied}</td>
                  <td className="py-3 text-sm text-gray-500 text-right">{row.nightsAvailable}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-14 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${row.occupancyPct}%`, backgroundColor: getHeatColor(row.occupancyPct) }} />
                      </div>
                      <span className="text-sm text-gray-700 w-10 text-right">{row.occupancyPct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(row.revenue, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
