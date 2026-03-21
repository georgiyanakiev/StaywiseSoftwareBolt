import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble, DoorOpen, LogIn, LogOut, TrendingUp, DollarSign, Plus, UserCheck,
  LayoutGrid, BarChart3, SprayCan, RefreshCw, CalendarDays, Activity,
  ChevronUp, ChevronDown, Minus,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useHotel } from '../contexts/HotelContext';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import OccupancyGauge from './dashboard/OccupancyGauge';
import ActivityFeed from './dashboard/ActivityFeed';
import AvailabilityCalendar from './dashboard/AvailabilityCalendar';
import { useDashboardData } from './dashboard/useDashboardData';

type RevenueRange = '7d' | '14d';

const ROOM_STATUS_COLORS: Record<string, string> = {
  available: '#10b981', occupied: '#2563eb', dirty: '#f59e0b',
  clean: '#22c55e', maintenance: '#6b7280', out_of_service: '#9ca3af',
};

const RESERVATION_STATUS_COLORS: Record<string, string> = {
  confirmed: '#2563eb', checked_in: '#10b981', checked_out: '#6b7280',
  pending: '#f59e0b', cancelled: '#ef4444',
};

function TrendBadge({ value, prev }: { value: number; prev?: number }) {
  if (prev == null) return null;
  const diff = value - prev;
  if (diff === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-gray-400"><Minus className="w-3 h-3" />0%</span>;
  const pct = prev > 0 ? Math.round(Math.abs(diff / prev) * 100) : 100;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      {pct}%
    </span>
  );
}

export default function DashboardPage() {
  const { currentHotel } = useHotel();
  const { loading, error, stats, revenueData, recentActivity, availabilityData, roomStatusData, refresh } = useDashboardData(currentHotel);
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('14d');

  const visibleRevenue = revenueRange === '7d' ? revenueData.slice(-7) : revenueData;

  if (loading) return <LoadingSpinner size="lg" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <p className="text-red-600 font-semibold">Error loading dashboard</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <button onClick={refresh} className="btn-primary">Try Again</button>
      </div>
    );
  }

  if (!currentHotel) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-2">
        <p className="text-gray-600 text-lg font-medium">No hotel selected</p>
        <p className="text-gray-400 text-sm">Go to Settings to configure your property</p>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total Rooms', value: stats.totalRooms, icon: BedDouble,
      color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
    },
    {
      label: 'Available Now', value: stats.availableRooms, icon: DoorOpen,
      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
    },
    {
      label: 'Pending Check-ins', value: stats.pendingCheckIns, icon: LogIn,
      color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100',
    },
    {
      label: 'Pending Check-outs', value: stats.pendingCheckOuts, icon: LogOut,
      color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
    },
    {
      label: 'Rooms Needing Clean', value: stats.dirtyRooms, icon: SprayCan,
      color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100',
    },
    {
      label: 'Active Reservations', value: stats.activeReservations, icon: CalendarDays,
      color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100',
    },
  ];

  const revenueCards = [
    { label: "Today's Revenue", value: stats.todayRevenue, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: "This Week", value: stats.weekRevenue, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: "This Month", value: stats.monthRevenue, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: "Year to Date", value: stats.ytdRevenue, icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const quickActions = [
    { label: 'New Reservation', icon: Plus, to: '/reservations', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { label: 'Quick Check-in', icon: UserCheck, to: '/reservations', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { label: 'Room Status', icon: LayoutGrid, to: '/rooms', color: 'bg-gray-800 hover:bg-gray-900 text-white' },
    { label: 'Housekeeping', icon: SprayCan, to: '/housekeeping', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
    { label: 'View Reports', icon: BarChart3, to: '/reports', color: 'bg-teal-600 hover:bg-teal-700 text-white' },
  ];

  const reservationStatusData = Object.entries(stats.statusBreakdown)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: getStatusLabel(key),
      value,
      color: RESERVATION_STATUS_COLORS[key] || '#6b7280',
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentHotel.name} &middot; {formatDate(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {quickActions.map(a => (
              <Link key={a.label} to={a.to}
                className={`${a.color} hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm`}>
                <a.icon className="w-3.5 h-3.5" />
                {a.label}
              </Link>
            ))}
          </div>
          <button onClick={refresh}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(card => (
          <div key={card.label} className={`bg-white rounded-xl border ${card.border} p-4 hover:shadow-md transition-shadow`}>
            <div className={`${card.bg} ${card.color} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}>
              <card.icon className="w-4.5 h-4.5 w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {revenueCards.map((card, i) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className={`${card.bg} ${card.color} w-8 h-8 rounded-lg flex items-center justify-center`}>
                <card.icon className="w-4 h-4" />
              </div>
              {i > 0 && <TrendBadge value={card.value} prev={revenueCards[i - 1].value} />}
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(card.value)}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Revenue Trend</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['7d', '14d'] as RevenueRange[]).map(r => (
                <button key={r} onClick={() => setRevenueRange(r)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${revenueRange === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {r === '7d' ? '7 Days' : '14 Days'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibleRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [formatCurrency(Number(v)), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Occupancy</h2>
          <OccupancyGauge rate={stats.occupancyRate} occupied={stats.occupiedRooms} total={stats.totalRooms} />
          <div className="mt-3 space-y-2 flex-1">
            {roomStatusData.map(item => (
              <div key={item.key} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-xs text-gray-600 flex-1">{item.name}</span>
                <span className="text-xs font-semibold text-gray-800">{item.value}</span>
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${stats.totalRooms > 0 ? (item.value / stats.totalRooms) * 100 : 0}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">14-Day Availability</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Available</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" /> High occ.</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Near full</span>
            </div>
          </div>
          <AvailabilityCalendar days={availabilityData} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Reservation Status</h2>
          {reservationStatusData.length > 0 ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reservationStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {reservationStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`${Number(v)} reservations`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {reservationStatusData.map(entry => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-xs text-gray-600 flex-1">{entry.name}</span>
                    <span className="text-xs font-semibold text-gray-800">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-44 text-sm text-gray-400">No reservation data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
            <Link to="/reservations" className="text-xs font-medium text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <ActivityFeed items={recentActivity} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Check-ins / Check-outs</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { label: 'Check-ins', completed: stats.todayCheckIns, pending: stats.pendingCheckIns },
                { label: 'Check-outs', completed: stats.todayCheckOuts, pending: stats.pendingCheckOuts },
              ]} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{stats.todayCheckIns + stats.pendingCheckIns}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Today Check-ins</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{stats.todayCheckOuts + stats.pendingCheckOuts}</p>
              <p className="text-xs text-amber-600 mt-0.5">Today Check-outs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sm:hidden grid grid-cols-2 gap-2">
        {quickActions.map(a => (
          <Link key={a.label} to={a.to}
            className={`${a.color} flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors shadow-sm`}>
            <a.icon className="w-4 h-4" />
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
