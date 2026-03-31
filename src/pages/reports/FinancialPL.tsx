import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../lib/utils';
import type { PLRow } from './types';

const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface Props {
  rows: PLRow[];
  grossMargin: number;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  currency: string;
  onExport: () => void;
}

export default function FinancialPL({ rows, grossMargin, totalRevenue, totalCosts, grossProfit, currency, onExport }: Props) {
  const monthlyComparison = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => {
    const seasonal = i >= 5 && i <= 8 ? 1.3 : i >= 10 || i <= 1 ? 1.15 : 1.0;
    const base = (totalRevenue / 12) * seasonal;
    const rev = Math.round(base + seededRandom(i * 41 + 19) * (base * 0.15) - (base * 0.075));
    const cost = Math.round(rev * (totalCosts / (totalRevenue || 1)));
    return { month, revenue: rev, costs: cost, profit: rev - cost };
  });

  const kpiCards = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue, currency), color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+8.2%', up: true },
    { label: 'Total Costs', value: formatCurrency(totalCosts, currency), color: 'text-red-600', bg: 'bg-red-50', trend: '+3.1%', up: false },
    { label: 'Gross Profit', value: formatCurrency(grossProfit, currency), color: 'text-blue-600', bg: 'bg-blue-50', trend: '+11.4%', up: true },
    { label: 'Gross Margin', value: `${grossMargin.toFixed(1)}%`, color: 'text-teal-600', bg: 'bg-teal-50', trend: '+1.8pp', up: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Financial P&L</h2>
        <button onClick={onExport} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-xs font-semibold ${card.color} ${card.bg} inline-block px-2 py-0.5 rounded-full mb-2`}>{card.label}</div>
            <div className="text-xl font-bold text-gray-900">{card.value}</div>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${card.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {card.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {card.trend} vs prior period
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">P&L Statement</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 w-1/2">Line Item</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Current Period</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Prior Period</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const change = row.prev > 0 ? ((row.current - row.prev) / row.prev) * 100 : 0;
                const isPositiveChange = row.isNegative ? change <= 0 : change >= 0;
                return (
                  <tr
                    key={i}
                    className={`border-b transition-colors ${row.isTotal ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'} ${row.isProfit ? 'bg-emerald-50' : ''}`}
                  >
                    <td className={`py-3 text-sm ${row.isTotal || row.isProfit ? 'font-semibold text-gray-900' : 'text-gray-700'} ${!row.isTotal && !row.isProfit ? 'pl-4' : ''}`}>
                      {row.label}
                    </td>
                    <td className={`py-3 text-sm text-right font-${row.isTotal || row.isProfit ? 'semibold' : 'normal'} ${row.isNegative && !row.isTotal ? 'text-red-600' : row.isProfit ? 'text-emerald-700 font-bold' : 'text-gray-900'}`}>
                      {row.isNegative && !row.isTotal ? `(${formatCurrency(row.current, currency)})` : formatCurrency(row.current, currency)}
                    </td>
                    <td className="py-3 text-sm text-right text-gray-500">
                      {row.isNegative && !row.isTotal ? `(${formatCurrency(row.prev, currency)})` : formatCurrency(row.prev, currency)}
                    </td>
                    <td className={`py-3 text-sm text-right font-medium ${isPositiveChange ? 'text-emerald-600' : 'text-red-500'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Month-by-Month Comparison</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyComparison} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v || 0), currency), '']} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" name="Costs" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Gross Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
