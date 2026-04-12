import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LogIn, LogOut, Users, BedDouble, SprayCan, CheckCircle2,
  Clock, AlertTriangle, Euro, TrendingUp, RefreshCw,
  ArrowRight, ChevronDown, ChevronUp, UserCheck, Wrench,
  CalendarDays, Tag, Moon, Phone,
} from 'lucide-react';
import { useHotel } from '../contexts/HotelContext';
import { formatCurrency, formatDate } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useFrontDeskData } from './frontdesk/useFrontDeskData';
import type { ArrivalItem, DepartureItem, StayoverItem } from './frontdesk/useFrontDeskData';

type Tab = 'arrivals' | 'departures' | 'stayovers';

const TAB_COLORS: Record<string, { active: string; badge: string }> = {
  emerald: { active: 'border-emerald-600 text-emerald-700 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  amber: { active: 'border-amber-600 text-amber-700 bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
  blue: { active: 'border-blue-600 text-blue-700 bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
};

export default function FrontDeskPage() {
  const { currentHotel } = useHotel();
  const { loading, error, kpis, arrivals, departures, stayovers, lastUpdated, refresh } = useFrontDeskData(currentHotel);
  const [activeTab, setActiveTab] = useState<Tab>('arrivals');

  if (loading) return <LoadingSpinner size="lg" />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <p className="text-red-600 font-semibold">Failed to load front desk data</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <button onClick={refresh} className="btn-primary">Try Again</button>
      </div>
    );
  }

  if (!currentHotel) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-2">
        <p className="text-gray-600 text-lg font-medium">No hotel selected</p>
        <p className="text-gray-400 text-sm">Please select a property to view the front desk dashboard.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    {
      key: 'arrivals',
      label: 'Arrivals',
      count: arrivals.length,
      icon: <LogIn className="w-4 h-4" />,
      color: 'emerald',
    },
    {
      key: 'departures',
      label: 'Departures',
      count: departures.length,
      icon: <LogOut className="w-4 h-4" />,
      color: 'amber',
    },
    {
      key: 'stayovers',
      label: 'Stayovers',
      count: stayovers.length,
      icon: <Users className="w-4 h-4" />,
      color: 'blue',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Front Desk</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(new Date(), 'EEEE, MMMM d, yyyy')}
            {lastUpdated && (
              <span className="ml-2 text-gray-400 text-xs">
                Updated {formatDate(lastUpdated, 'HH:mm')}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/reservations"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1e3a5f] hover:bg-[#172e4c] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <CalendarDays className="w-3.5 h-3.5" /> New Booking
          </Link>
          <button
            onClick={refresh}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        <KpiCard
          label="Occupancy"
          value={`${kpis.occupancyRate}%`}
          sub={`${kpis.occupiedRooms}/${kpis.totalRooms}`}
          icon={<BedDouble className="w-4 h-4" />}
          colorClass={kpis.occupancyRate >= 90 ? 'bg-red-50 text-red-700 border-red-100' : kpis.occupancyRate >= 70 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}
          iconBg={kpis.occupancyRate >= 90 ? 'bg-red-100' : kpis.occupancyRate >= 70 ? 'bg-amber-100' : 'bg-blue-100'}
        />
        <KpiCard
          label="Arrivals"
          value={String(kpis.arrivalsExpected + kpis.arrivalsCheckedIn)}
          sub={`${kpis.arrivalsCheckedIn} in`}
          icon={<LogIn className="w-4 h-4" />}
          colorClass="bg-emerald-50 text-emerald-700 border-emerald-100"
          iconBg="bg-emerald-100"
        />
        <KpiCard
          label="Departures"
          value={String(kpis.departuresExpected + kpis.departuresCheckedOut)}
          sub={`${kpis.departuresCheckedOut} out`}
          icon={<LogOut className="w-4 h-4" />}
          colorClass="bg-amber-50 text-amber-700 border-amber-100"
          iconBg="bg-amber-100"
        />
        <KpiCard
          label="Stayovers"
          value={String(kpis.stayovers)}
          sub="in-house"
          icon={<Users className="w-4 h-4" />}
          colorClass="bg-blue-50 text-blue-700 border-blue-100"
          iconBg="bg-blue-100"
        />
        <KpiCard
          label="Available"
          value={String(kpis.availableRooms)}
          sub="free"
          icon={<CheckCircle2 className="w-4 h-4" />}
          colorClass="bg-emerald-50 text-emerald-700 border-emerald-100"
          iconBg="bg-emerald-100"
        />
        <KpiCard
          label="Dirty"
          value={String(kpis.dirtyRooms)}
          sub={`${kpis.cleanRooms} clean`}
          icon={<SprayCan className="w-4 h-4" />}
          colorClass="bg-orange-50 text-orange-700 border-orange-100"
          iconBg="bg-orange-100"
        />
        <KpiCard
          label="Maint."
          value={String(kpis.maintenanceRooms)}
          sub="OOS"
          icon={<Wrench className="w-4 h-4" />}
          colorClass="bg-gray-50 text-gray-700 border-gray-200"
          iconBg="bg-gray-100"
        />
        <KpiCard
          label="Revenue"
          value={formatCurrency(kpis.todayRevenue)}
          sub={`ADR ${formatCurrency(kpis.avgRoomRate)}`}
          icon={<Euro className="w-4 h-4" />}
          colorClass="bg-teal-50 text-teal-700 border-teal-100"
          iconBg="bg-teal-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 flex">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? TAB_COLORS[tab.color]?.active || 'border-blue-600 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                  activeTab === tab.key
                    ? TAB_COLORS[tab.color]?.badge || 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-0">
            {activeTab === 'arrivals' && <ArrivalsTable items={arrivals} />}
            {activeTab === 'departures' && <DeparturesTable items={departures} />}
            {activeTab === 'stayovers' && <StayoversTable items={stayovers} />}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Room Status</h3>
            <div className="space-y-2.5">
              <RoomStatusBar label="Occupied" value={kpis.occupiedRooms} total={kpis.totalRooms} color="bg-blue-500" textColor="text-blue-700" />
              <RoomStatusBar label="Available" value={kpis.availableRooms} total={kpis.totalRooms} color="bg-emerald-500" textColor="text-emerald-700" />
              <RoomStatusBar label="Dirty" value={kpis.dirtyRooms} total={kpis.totalRooms} color="bg-orange-400" textColor="text-orange-700" />
              <RoomStatusBar label="Clean" value={kpis.cleanRooms} total={kpis.totalRooms} color="bg-teal-400" textColor="text-teal-700" />
              <RoomStatusBar label="Maintenance" value={kpis.maintenanceRooms} total={kpis.totalRooms} color="bg-gray-400" textColor="text-gray-600" />
            </div>
            <Link to="/rooms" className="mt-4 flex items-center gap-1 text-xs text-[#1e3a5f] hover:text-[#172e4c] font-medium">
              Manage rooms <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Today's Summary</h3>
            <div className="space-y-2">
              <SummaryRow icon={<LogIn className="w-3.5 h-3.5 text-emerald-600" />} label="Expected Arrivals" value={kpis.arrivalsExpected} />
              <SummaryRow icon={<UserCheck className="w-3.5 h-3.5 text-emerald-600" />} label="Checked In" value={kpis.arrivalsCheckedIn} />
              <SummaryRow icon={<LogOut className="w-3.5 h-3.5 text-amber-600" />} label="Expected Departures" value={kpis.departuresExpected} />
              <SummaryRow icon={<CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />} label="Checked Out" value={kpis.departuresCheckedOut} />
              <SummaryRow icon={<Users className="w-3.5 h-3.5 text-blue-600" />} label="Stayovers" value={kpis.stayovers} />
              {kpis.noShows > 0 && (
                <SummaryRow icon={<AlertTriangle className="w-3.5 h-3.5 text-red-500" />} label="No Shows" value={kpis.noShows} valueColor="text-red-600" />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Walk-in Check-in', to: '/reservations', icon: UserCheck, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                { label: 'Housekeeping', to: '/housekeeping', icon: SprayCan, color: 'bg-amber-500 hover:bg-amber-600 text-white' },
                { label: 'Guest Directory', to: '/guests', icon: Users, color: 'bg-slate-600 hover:bg-slate-700 text-white' },
              ].map(a => (
                <Link
                  key={a.label}
                  to={a.to}
                  className={`${a.color} flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors`}
                >
                  <a.icon className="w-3.5 h-3.5" />
                  {a.label}
                  <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, colorClass, iconBg }: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  colorClass: string;
  iconBg: string;
}) {
  return (
    <div className={`bg-white rounded-xl border p-2.5 sm:p-3.5 hover:shadow-md transition-shadow ${colorClass}`}>
      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 ${iconBg}`}>
        {icon}
      </div>
      <div className="text-base sm:text-xl font-bold truncate">{value}</div>
      <div className="text-[10px] sm:text-xs font-medium mt-0.5 opacity-80 truncate">{label}</div>
      <div className="text-[10px] sm:text-xs opacity-60 mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function RoomStatusBar({ label, value, total, color, textColor }: {
  label: string; value: number; total: number; color: string; textColor: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className={`text-xs font-semibold ${textColor}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, value, valueColor = 'text-gray-800' }: {
  icon: React.ReactNode; label: string; value: number; valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-gray-600 flex-1">{label}</span>
      <span className={`text-sm font-bold ${valueColor}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: 'Expected', cls: 'bg-blue-100 text-blue-700' },
    checked_in: { label: 'Checked In', cls: 'bg-emerald-100 text-emerald-700' },
    checked_out: { label: 'Checked Out', cls: 'bg-gray-100 text-gray-600' },
    no_show: { label: 'No Show', cls: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function ArrivalsTable({ items }: { items: ArrivalItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <LogIn className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No arrivals scheduled for today</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Room</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nights</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guests</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-out</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{item.guestName}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {item.confirmationCode}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{item.roomNumber}</div>
                  <div className="text-xs text-gray-400">{item.roomType}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Moon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium">{item.nights}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {item.adults}A {item.children > 0 ? `${item.children}C` : ''}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDate(item.checkOut, 'MMM d')}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                  {formatCurrency(item.totalAmount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <Link to="/reservations" className="text-xs text-[#1e3a5f] hover:text-[#172e4c] font-medium whitespace-nowrap">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-100">
        {items.map(item => (
          <Link key={item.id} to="/reservations" className="block p-3.5 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{item.guestName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.confirmationCode}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Room</span>
                <p className="font-semibold text-gray-800">{item.roomNumber}</p>
              </div>
              <div>
                <span className="text-gray-400">Nights</span>
                <p className="font-medium text-gray-700">{item.nights}</p>
              </div>
              <div>
                <span className="text-gray-400">Out</span>
                <p className="font-medium text-gray-700">{formatDate(item.checkOut, 'MMM d')}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-400">Amount</span>
                <p className="font-semibold text-gray-800">{formatCurrency(item.totalAmount)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function DeparturesTable({ items }: { items: DepartureItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <LogOut className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No departures scheduled for today</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Room</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nights</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Checked In</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance Due</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{item.guestName}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {item.confirmationCode}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{item.roomNumber}</div>
                  <div className="text-xs text-gray-400">{item.roomType}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Moon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium">{item.nights}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDate(item.checkIn, 'MMM d')}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                  {formatCurrency(item.totalAmount)}
                </td>
                <td className="px-4 py-3 text-right">
                  {item.balance > 0 ? (
                    <span className="font-semibold text-red-600">{formatCurrency(item.balance)}</span>
                  ) : (
                    <span className="text-emerald-600 font-medium text-xs">Paid</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <Link to="/reservations" className="text-xs text-[#1e3a5f] hover:text-[#172e4c] font-medium whitespace-nowrap">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-100">
        {items.map(item => (
          <Link key={item.id} to="/reservations" className="block p-3.5 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{item.guestName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.confirmationCode}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Room</span>
                <p className="font-semibold text-gray-800">{item.roomNumber}</p>
              </div>
              <div>
                <span className="text-gray-400">Nights</span>
                <p className="font-medium text-gray-700">{item.nights}</p>
              </div>
              <div>
                <span className="text-gray-400">Amount</span>
                <p className="font-semibold text-gray-800">{formatCurrency(item.totalAmount)}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-400">Balance</span>
                {item.balance > 0 ? (
                  <p className="font-semibold text-red-600">{formatCurrency(item.balance)}</p>
                ) : (
                  <p className="font-medium text-emerald-600">Paid</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function StayoversTable({ items }: { items: StayoverItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Users className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No stayovers at this time</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Room</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-out</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nights Left</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{item.guestName}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {item.confirmationCode}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{item.roomNumber}</div>
                  <div className="text-xs text-gray-400">{item.roomType}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDate(item.checkIn, 'MMM d')}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDate(item.checkOut, 'MMM d')}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                    <Moon className="w-3 h-3" /> {item.nightsRemaining}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                  {formatCurrency(item.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <Link to="/reservations" className="text-xs text-[#1e3a5f] hover:text-[#172e4c] font-medium whitespace-nowrap">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-100">
        {items.map(item => (
          <Link key={item.id} to="/reservations" className="block p-3.5 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{item.guestName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.confirmationCode}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium flex-shrink-0">
                <Moon className="w-3 h-3" /> {item.nightsRemaining} left
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Room</span>
                <p className="font-semibold text-gray-800">{item.roomNumber}</p>
              </div>
              <div>
                <span className="text-gray-400">In</span>
                <p className="font-medium text-gray-700">{formatDate(item.checkIn, 'MMM d')}</p>
              </div>
              <div>
                <span className="text-gray-400">Out</span>
                <p className="font-medium text-gray-700">{formatDate(item.checkOut, 'MMM d')}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-400">Total</span>
                <p className="font-semibold text-gray-800">{formatCurrency(item.totalAmount)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
