import { DollarSign, TrendingUp, Building2, BarChart3, Download } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import type { RevenueKPIs, RevenueBySourceRow, DailyRevenue, RoomTypePerf } from './types';

const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };
const SOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f43f5e'];

interface Props {
  kpis: RevenueKPIs;
  revenueBySource: RevenueBySourceRow[];
  dailyRevenue: DailyRevenue[];
  roomTypePerf: RoomTypePerf[];
  currency: string;
  onExport: () => void;
  daysCount: number;
}

export default function RevenueReport({ kpis, revenueBySource, dailyRevenue, roomTypePerf, currency, onExport, daysCount }: Props) {
  const kpiCards = [
    { label: 'Total Revenue', value: formatCurrency(kpis.totalRevenue, currency), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Selected period' },
    { label: 'RevPAR', value: formatCurrency(kpis.revpar, currency), icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'Revenue per available room' },
    { label: 'ADR', value: formatCurrency(kpis.adr, currency), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Average daily rate' },
    { label: 'Occupancy', value: `${kpis.occupancyPct.toFixed(1)}%`, icon: Building2, color: 'text-cyan-600', bg: 'bg-cyan-50', sub: 'Room occupancy' },
    { label: 'GOP', value: formatCurrency(kpis.gop, currency), icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50', sub: `${kpis.gopMargin.toFixed(1)}% margin` },
  ];

  const trendInterval = Math.max(0, Math.floor(daysCount / 10) - 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Revenue Dashboard</h2>
        <button onClick={onExport} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-lg ${card.bg} ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs font-medium text-gray-700 mt-0.5">{card.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue by Source</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBySource} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="source" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v || 0), currency), 'Revenue']} />
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                  {revenueBySource.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {revenueBySource.map((row, i) => (
              <div key={row.source} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                <span className="text-xs text-gray-600 flex-1">{row.source}</span>
                <span className="text-xs font-semibold text-gray-900">{formatCurrency(row.revenue, currency)}</span>
                <span className="text-xs text-gray-400 w-10 text-right">{row.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Daily Revenue Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRevenue} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={trendInterval} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v || 0), currency), 'Revenue']} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Room Type Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Room Type', 'Nights Sold', 'Revenue', 'Occupancy', 'ADR', 'RevPAR'].map(h => (
                  <th key={h} className={`text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 ${h === 'Room Type' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {roomTypePerf.map(row => (
                <tr key={row.roomType} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 text-sm font-medium text-gray-900">{row.roomType}</td>
                  <td className="py-3 text-sm text-gray-600 text-right">{row.nightsSold.toLocaleString()}</td>
                  <td className="py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(row.revenue, currency)}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-14 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${row.occupancyPct}%` }} />
                      </div>
                      <span className="text-sm text-gray-700 w-10 text-right">{row.occupancyPct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-gray-700 text-right">{formatCurrency(row.adr, currency)}</td>
                  <td className="py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(row.revpar, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
