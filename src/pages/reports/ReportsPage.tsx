import { useState } from 'react';
import { Calendar, BarChart3, Building2, TrendingUp, Receipt } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useHotel } from '../../contexts/HotelContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { DATE_PRESETS, useReportsData } from './useReportsData';
import RevenueReport from './RevenueReport';
import OccupancyReport from './OccupancyReport';
import BookingAnalysis from './BookingAnalysis';
import FinancialPL from './FinancialPL';
import type { ReportTab, DateRange } from './types';

const TABS: { key: ReportTab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'revenue', label: 'Revenue Dashboard', icon: TrendingUp },
  { key: 'occupancy', label: 'Occupancy Report', icon: Building2 },
  { key: 'bookings', label: 'Booking Analysis', icon: BarChart3 },
  { key: 'financial', label: 'Financial P&L', icon: Receipt },
];

function buildCSV(tab: ReportTab, data: ReturnType<typeof useReportsData>, currency: string): { content: string; filename: string } {
  const d = data;
  let content = '';
  let filename = `${tab}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;

  if (tab === 'revenue') {
    content = 'Date,Revenue\n' + d.dailyRevenue.map(r => `${r.date},${r.revenue}`).join('\n');
    content += '\n\nRoom Type,Nights Sold,Revenue,Occupancy %,ADR,RevPAR\n';
    content += d.roomTypePerf.map(r => `${r.roomType},${r.nightsSold},${r.revenue},${r.occupancyPct.toFixed(1)},${r.adr.toFixed(2)},${r.revpar.toFixed(2)}`).join('\n');
  } else if (tab === 'occupancy') {
    content = 'Date,Occupancy %,Occupied Rooms,Available Rooms\n' + d.occupancyByDay.map(r => `${r.date},${r.occupancyPct.toFixed(1)},${r.occupied},${r.available}`).join('\n');
    content += '\n\nRoom Number,Room Type,Nights Occupied,Nights Available,Occupancy %,Revenue\n';
    content += d.roomPerf.map(r => `${r.roomNumber},${r.roomType},${r.nightsOccupied},${r.nightsAvailable},${r.occupancyPct.toFixed(1)},${r.revenue}`).join('\n');
  } else if (tab === 'bookings') {
    content = 'Lead Time Bucket,Bookings\n' + d.leadTimeBuckets.map(r => `${r.label},${r.count}`).join('\n');
    content += '\n\nSource,Share %\n' + d.bookingSourcePie.map(r => `${r.name},${r.value}`).join('\n');
    content += '\n\nMonth,Cancellation Rate %\n' + d.cancellationTrend.map(r => `${r.date},${r.rate}`).join('\n');
    content += '\n\nMonth,Avg Stay (nights)\n' + d.avgStayTrend.map(r => `${r.month},${r.avgNights}`).join('\n');
    if (d.nationalityBreakdown.length > 0) {
      content += '\n\nCountry,Guests,Share %\n' + d.nationalityBreakdown.map(r => `${r.country},${r.guests},${r.pct}`).join('\n');
    }
  } else if (tab === 'financial') {
    content = 'Line Item,Current Period,Prior Period\n' + d.plData.rows.map(r => `${r.label},${r.current.toFixed(2)},${r.prev.toFixed(2)}`).join('\n');
  }

  return { content, filename };
}

export default function ReportsPage() {
  const { currentHotel } = useHotel();
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
    label: 'Custom',
  });
  const [activePreset, setActivePreset] = useState<string>('Custom');
  const [customMode, setCustomMode] = useState(false);

  const data = useReportsData(currentHotel?.id, dateRange);
  const currency = currentHotel?.currency || 'USD';

  function applyPreset(preset: typeof DATE_PRESETS[0]) {
    if (preset.label === 'Custom') {
      setCustomMode(true);
      setActivePreset('Custom');
      return;
    }
    setCustomMode(false);
    setActivePreset(preset.label);
    setDateRange(preset.getValue());
  }

  function handleExport() {
    const { content, filename } = buildCSV(activeTab, data, currency);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports & Analytics</h1>
        <p className="text-sm text-gray-500">Performance insights for {currentHotel?.name}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePreset === preset.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          {(customMode || activePreset === 'Custom') && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="input-field text-sm py-1.5 w-36"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="input-field text-sm py-1.5 w-36"
              />
            </div>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {dateRange.start} — {dateRange.end}
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {data.loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <>
          {activeTab === 'revenue' && (
            <RevenueReport
              kpis={data.kpis}
              revenueBySource={data.revenueBySource}
              dailyRevenue={data.dailyRevenue}
              roomTypePerf={data.roomTypePerf}
              currency={currency}
              onExport={handleExport}
              daysCount={data.days.length}
            />
          )}
          {activeTab === 'occupancy' && (
            <OccupancyReport
              occupancyByDay={data.occupancyByDay}
              monthOccupancy={data.monthOccupancy}
              roomPerf={data.roomPerf}
              currency={currency}
              onExport={handleExport}
              daysCount={data.days.length}
            />
          )}
          {activeTab === 'bookings' && (
            <BookingAnalysis
              leadTimeBuckets={data.leadTimeBuckets}
              bookingSourcePie={data.bookingSourcePie}
              cancellationTrend={data.cancellationTrend}
              avgStayTrend={data.avgStayTrend}
              nationalityBreakdown={data.nationalityBreakdown}
              onExport={handleExport}
            />
          )}
          {activeTab === 'financial' && (
            <FinancialPL
              rows={data.plData.rows}
              grossMargin={data.plData.grossMargin}
              totalRevenue={data.plData.totalRevenue}
              totalCosts={data.plData.totalCosts}
              grossProfit={data.plData.grossProfit}
              currency={currency}
              onExport={handleExport}
            />
          )}
        </>
      )}
    </div>
  );
}
