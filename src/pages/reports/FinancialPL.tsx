import { Download, FlaskConical } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../lib/utils';
import type { PLRow } from './types';

const TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };

interface MonthlyBreakdownRow {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface Props {
  rows: PLRow[];
  grossMargin: number;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  monthlyBreakdown: MonthlyBreakdownRow[];
  currency: string;
  onExport: () => void;
}

export default function FinancialPL({ rows, grossMargin, totalRevenue, totalCosts, grossProfit, monthlyBreakdown, currency, onExport }: Props) {
  const { t } = useLanguage();
  const kpiCards = [
    { label: t.reports.totalRevenue, value: formatCurrency(totalRevenue, currency), color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t.reports.totalCosts, value: formatCurrency(totalCosts, currency), color: 'text-red-600', bg: 'bg-red-50' },
    { label: t.reports.grossProfit, value: formatCurrency(grossProfit, currency), color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t.reports.grossMargin, value: `${grossMargin.toFixed(1)}%`, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  const hasEstimatedRows = rows.some(r => r.isEstimated);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t.reports.financialPL}</h2>
        <button onClick={onExport} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> {t.reports.exportCsv}
        </button>
      </div>

      {hasEstimatedRows && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <FlaskConical className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800">
            <span className="font-semibold">{t.reports.estimatedPLDemoMode}</span>
            <span className="ml-1">{t.reports.estimatedPLWarning}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-xs font-semibold ${card.color} ${card.bg} inline-block px-2 py-0.5 rounded-full mb-2`}>{card.label}</div>
            <div className="text-xl font-bold text-gray-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{t.reports.plStatement}</h3>
        {totalRevenue === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm font-medium text-gray-500">No revenue data for this period</p>
            <p className="text-xs text-gray-400 mt-1">Adjust the date range or check back once reservations are recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 w-1/2">{t.reports.lineItem}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">{t.reports.currentPeriod}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">{t.reports.estPriorPeriod}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">{t.reports.change}</th>
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
                        {row.isEstimated && (
                          <span className="ml-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">(est.)</span>
                        )}
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
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{t.reports.monthByMonthBreakdown}</h3>
        <p className="text-xs text-gray-400 mb-4">{t.reports.currentYear} — {t.reports.monthsWithRecordings}</p>
        {monthlyBreakdown.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm font-medium text-gray-500">Insufficient data</p>
            <p className="text-xs text-gray-400 mt-1">Monthly breakdown will appear once reservations exist for the current year</p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBreakdown} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v || 0), currency), '']} />
                <Legend />
                <Bar dataKey="revenue" name={t.reports.revenue} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costs" name={t.reports.costs} fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name={t.reports.grossProfit} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
