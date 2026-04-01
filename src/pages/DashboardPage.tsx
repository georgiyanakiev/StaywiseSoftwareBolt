import { Link } from 'react-router-dom';
import {
  BedDouble, LogIn, LogOut, Users, SprayCan, RefreshCw,
  CalendarDays, Euro, TrendingUp, BarChart3, Activity,
  CheckCircle2, AlertTriangle, Wrench, Baby,
  ArrowRightCircle, UserCheck, ClipboardList,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useHotel } from '../contexts/HotelContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency, formatDate } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useDashboardData } from './dashboard/useDashboardData';
import ActivityFeed from './dashboard/ActivityFeed';

export default function DashboardPage() {
  const { currentHotel } = useHotel();
  const { t } = useLanguage();
  const { loading, error, stats, revenueData, recentActivity, availabilityData, roomStatusData, refresh } = useDashboardData(currentHotel);

  if (loading) return <LoadingSpinner size="lg" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <p className="text-red-600 font-semibold">{t.dashboard.errorLoading}</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <button onClick={refresh} className="btn-primary">{t.dashboard.tryAgain}</button>
      </div>
    );
  }

  if (!currentHotel) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-2">
        <p className="text-gray-600 text-lg font-medium">{t.dashboard.noHotel}</p>
        <p className="text-gray-400 text-sm">{t.dashboard.noHotelSub}</p>
      </div>
    );
  }

  const occupiedCount = roomStatusData.find(r => r.key === 'occupied')?.value ?? stats.occupiedRooms;
  const availableCount = roomStatusData.find(r => r.key === 'available')?.value ?? stats.availableRooms;
  const dirtyCount = roomStatusData.find(r => r.key === 'dirty')?.value ?? 0;
  const cleanCount = roomStatusData.find(r => r.key === 'clean')?.value ?? 0;
  const maintenanceCount = roomStatusData.find(r => r.key === 'maintenance')?.value ?? 0;
  const outOfServiceCount = roomStatusData.find(r => r.key === 'out_of_service')?.value ?? 0;

  const today = availabilityData[0];
  const todayAvailable = today?.available ?? availableCount;
  const todayOccupied = today?.occupied ?? occupiedCount;

  const visibleRevenue = revenueData.slice(-7);

  const revenueCards = [
    { label: t.dashboard.today, value: stats.todayRevenue, icon: Euro, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: t.dashboard.thisWeek, value: stats.weekRevenue, icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: t.dashboard.thisMonth, value: stats.monthRevenue, icon: BarChart3, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: t.dashboard.yearToDate, value: stats.ytdRevenue, icon: Activity, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{currentHotel.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatDate(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/reservations" className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm">
            <LogIn className="w-3.5 h-3.5" /> {t.dashboard.quickCheckIn}
          </Link>
          <Link to="/reservations" className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-medium rounded-lg transition-colors shadow-sm">
            <CalendarDays className="w-3.5 h-3.5" /> {t.dashboard.newBooking}
          </Link>
          <button onClick={refresh} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OperaTile
          title={t.dashboard.roomStatus}
          accentColor="bg-slate-700"
          icon={<BedDouble className="w-5 h-5 text-white" />}
          link="/rooms"
          linkLabel={t.dashboard.viewDetails}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-1">
            <RoomStatusRow icon={<OccupiedIcon />} label={t.dashboard.occupied} value={occupiedCount} valueColor="text-blue-700" />
            <RoomStatusRow icon={<AvailableIcon />} label={t.dashboard.available} value={availableCount} valueColor="text-emerald-700" />
            <RoomStatusRow icon={<DirtyIcon />} label={t.dashboard.needsClean} value={dirtyCount} valueColor="text-amber-600" />
            <RoomStatusRow icon={<CleanIcon />} label={t.dashboard.clean} value={cleanCount} valueColor="text-emerald-600" />
            <RoomStatusRow icon={<WrenchIcon />} label={t.dashboard.maintenance} value={maintenanceCount} valueColor="text-red-600" />
            <RoomStatusRow icon={<OOSIcon />} label={t.dashboard.outOfSvc} value={outOfServiceCount} valueColor="text-gray-500" />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{t.dashboard.occupancy}</span>
              <span className="font-semibold text-gray-800">{stats.occupancyRate}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${stats.occupancyRate}%`,
                  background: stats.occupancyRate >= 90 ? '#ef4444' : stats.occupancyRate >= 70 ? '#f59e0b' : '#2563eb',
                }}
              />
            </div>
          </div>
        </OperaTile>

        <OperaTile
          title={t.dashboard.departures}
          accentColor="bg-amber-600"
          icon={<LogOut className="w-5 h-5 text-white" />}
          link="/reservations"
          linkLabel={t.dashboard.viewDetails}
        >
          <div className="flex flex-col gap-3 mt-2">
            <DepartureRow
              label={t.dashboard.expected}
              rooms={stats.pendingCheckOuts}
              adults={stats.pendingCheckOuts}
              children={0}
              color="text-amber-700"
              bg="bg-amber-50"
              adultsLabel={t.dashboard.adults}
              childrenLabel={t.dashboard.children}
            />
            <DepartureRow
              label={t.dashboard.checkedOut}
              rooms={stats.todayCheckOuts}
              adults={stats.todayCheckOuts}
              children={0}
              color="text-gray-600"
              bg="bg-gray-50"
              adultsLabel={t.dashboard.adults}
              childrenLabel={t.dashboard.children}
            />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{t.dashboard.scheduled}</span>
            <span className="text-lg font-bold text-gray-800">{stats.pendingCheckOuts + stats.todayCheckOuts}</span>
          </div>
        </OperaTile>

        <OperaTile
          title={t.dashboard.inHouse}
          accentColor="bg-blue-600"
          icon={<Users className="w-5 h-5 text-white" />}
          link="/reservations"
          linkLabel={t.dashboard.viewDetails}
        >
          <div className="flex flex-col items-center justify-center flex-1 gap-2 py-3">
            <div className="w-14 h-14 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-700">{todayOccupied}</span>
            </div>
            <span className="text-xs text-gray-500 font-medium">{t.dashboard.roomsOccupied}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <GuestCountBox icon={<AdultIcon />} label={t.dashboard.adults} value={todayOccupied} color="text-blue-700" bg="bg-blue-50" />
            <GuestCountBox icon={<Baby className="w-5 h-5" />} label={t.dashboard.children} value={0} color="text-purple-700" bg="bg-purple-50" />
          </div>
        </OperaTile>

        <OperaTile
          title={t.dashboard.arrivals}
          accentColor="bg-emerald-600"
          icon={<LogIn className="w-5 h-5 text-white" />}
          link="/reservations"
          linkLabel={t.dashboard.viewDetails}
        >
          <div className="flex flex-col gap-3 mt-2">
            <ArrivalRow
              label={t.dashboard.expected}
              rooms={stats.pendingCheckIns}
              color="text-emerald-700"
              bg="bg-emerald-50"
              guestsExpected={t.dashboard.guestsExpected}
            />
            <ArrivalRow
              label={t.dashboard.checkedIn}
              rooms={stats.todayCheckIns}
              color="text-gray-600"
              bg="bg-gray-50"
              guestsExpected={t.dashboard.guestsExpected}
            />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{t.dashboard.totalToday}</span>
            <span className="text-lg font-bold text-gray-800">{stats.pendingCheckIns + stats.todayCheckIns}</span>
          </div>
        </OperaTile>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {revenueCards.map(card => (
          <div key={card.label} className={`bg-white rounded-xl border ${card.border} p-4 hover:shadow-md transition-shadow`}>
            <div className={`${card.bg} ${card.color} w-8 h-8 rounded-lg flex items-center justify-center mb-3`}>
              <card.icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(card.value)}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">{t.dashboard.revenueLast7}</h2>
          </div>
          <div className="h-52">
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
                  tickFormatter={(v: number) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [formatCurrency(Number(v)), t.dashboard.revenue]} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">{t.dashboard.forecast14}</h2>
          </div>
          <div className="space-y-1.5">
            {availabilityData.slice(0, 10).map(day => {
              const pct = day.total > 0 ? Math.round((day.occupied / day.total) * 100) : 0;
              const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : pct >= 40 ? 'bg-blue-500' : 'bg-emerald-500';
              return (
                <div key={day.date} className="flex items-center gap-2">
                  <span className={`text-xs w-8 font-medium ${day.isToday ? 'text-blue-600' : 'text-gray-500'}`}>{day.label}</span>
                  <span className="text-xs text-gray-400 w-5">{day.dayNum}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{day.available} {t.dashboard.av}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> {t.dashboard.low}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> {t.dashboard.med}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> {t.dashboard.high}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {t.dashboard.full}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">{t.dashboard.recentActivity}</h2>
            <Link to="/reservations" className="text-xs font-medium text-blue-600 hover:text-blue-700">{t.dashboard.viewAll}</Link>
          </div>
          <ActivityFeed items={recentActivity} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{t.dashboard.quickActions}</h2>
          <div className="space-y-2">
            {[
              { label: t.dashboard.newReservation, to: '/reservations', icon: CalendarDays, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
              { label: t.dashboard.quickCheckIn, to: '/reservations', icon: UserCheck, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
              { label: t.nav.frontDesk, to: '/front-desk', icon: ClipboardList, color: 'bg-cyan-600 hover:bg-cyan-700 text-white' },
              { label: t.nav.housekeeping, to: '/housekeeping', icon: SprayCan, color: 'bg-amber-500 hover:bg-amber-600 text-white' },
              { label: t.dashboard.viewRooms, to: '/rooms', icon: BedDouble, color: 'bg-slate-700 hover:bg-slate-800 text-white' },
              { label: t.nav.reports, to: '/reports', icon: BarChart3, color: 'bg-gray-600 hover:bg-gray-700 text-white' },
            ].map(a => (
              <Link key={a.label} to={a.to}
                className={`${a.color} flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm`}>
                <a.icon className="w-4 h-4" />
                {a.label}
                <ArrowRightCircle className="w-4 h-4 ml-auto opacity-60" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OperaTile({
  title, accentColor, icon, children, link, linkLabel,
}: {
  title: string;
  accentColor: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  link: string;
  linkLabel: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className={`${accentColor} px-4 py-2.5 flex items-center justify-between`}>
        <span className="text-sm font-semibold text-white">{title}</span>
        <div className="opacity-80">{icon}</div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        {children}
      </div>
      <div className="px-4 pb-3">
        <Link to={link} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          {linkLabel} <ArrowRightCircle className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function RoomStatusRow({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: number; valueColor: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <span className="text-xs text-gray-600 flex-1 truncate">{label}</span>
      <span className={`text-sm font-bold ${valueColor}`}>{value}</span>
    </div>
  );
}

function DepartureRow({ label, rooms, adults, children, color, bg, adultsLabel, childrenLabel }: { label: string; rooms: number; adults: number; children: number; color: string; bg: string; adultsLabel: string; childrenLabel: string }) {
  return (
    <div className={`${bg} rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-lg font-bold ${color}`}>{rooms}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><AdultIcon />{adults} {adultsLabel}</span>
        <span className="flex items-center gap-1"><Baby className="w-3 h-3" />{children} {childrenLabel}</span>
      </div>
    </div>
  );
}

function ArrivalRow({ label, rooms, color, bg, guestsExpected }: { label: string; rooms: number; color: string; bg: string; guestsExpected: string }) {
  return (
    <div className={`${bg} rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-lg font-bold ${color}`}>{rooms}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <AdultIcon />{rooms} {guestsExpected}
      </div>
    </div>
  );
}

function GuestCountBox({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-lg p-2.5 flex flex-col items-center gap-1`}>
      <span className={`${color}`}>{icon}</span>
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function OccupiedIcon() { return <CheckCircle2 className="w-4 h-4 text-blue-500" />; }
function AvailableIcon() { return <BedDouble className="w-4 h-4 text-emerald-500" />; }
function DirtyIcon() { return <SprayCan className="w-4 h-4 text-amber-500" />; }
function CleanIcon() { return <CheckCircle2 className="w-4 h-4 text-emerald-400" />; }
function WrenchIcon() { return <Wrench className="w-4 h-4 text-red-400" />; }
function OOSIcon() { return <AlertTriangle className="w-4 h-4 text-gray-400" />; }
function AdultIcon() { return <Users className="w-3.5 h-3.5" />; }
