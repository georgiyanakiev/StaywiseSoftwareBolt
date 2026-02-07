import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  DoorOpen,
  LogIn,
  LogOut,
  TrendingUp,
  DollarSign,
  Plus,
  UserCheck,
  LayoutGrid,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useHotel } from '../contexts/HotelContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils';
import type { Room, Reservation } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  occupancyRate: number;
  todayRevenue: number;
}

interface RoomStatusCount {
  name: string;
  value: number;
  color: string;
}

const ROOM_STATUS_COLORS: Record<string, string> = {
  available: '#10b981',
  occupied: '#2563eb',
  dirty: '#ef4444',
  clean: '#22c55e',
  maintenance: '#6b7280',
  out_of_service: '#9ca3af',
};

function generateRevenueData() {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: formatDate(date, 'MMM d'),
      revenue: Math.floor(Math.random() * 6000) + 2000,
    });
  }
  return data;
}

export default function DashboardPage() {
  const { currentHotel } = useHotel();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    availableRooms: 0,
    todayCheckIns: 0,
    todayCheckOuts: 0,
    occupancyRate: 0,
    todayRevenue: 0,
  });

  const revenueData = useMemo(() => generateRevenueData(), []);

  useEffect(() => {
    if (currentHotel) {
      fetchDashboardData();
    }
  }, [currentHotel]);

  async function fetchDashboardData() {
    if (!currentHotel) return;
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    const [roomsResult, reservationsResult, checkInsResult, checkOutsResult] = await Promise.all([
      supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', currentHotel.id),
      supabase
        .from('reservations')
        .select('*, guest:guests(*)')
        .eq('hotel_id', currentHotel.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('reservations')
        .select('id', { count: 'exact' })
        .eq('hotel_id', currentHotel.id)
        .eq('check_in', today)
        .in('status', ['confirmed', 'checked_in']),
      supabase
        .from('reservations')
        .select('id', { count: 'exact' })
        .eq('hotel_id', currentHotel.id)
        .eq('check_out', today)
        .in('status', ['checked_in', 'checked_out']),
    ]);

    const fetchedRooms = (roomsResult.data || []) as Room[];
    const fetchedReservations = (reservationsResult.data || []) as Reservation[];

    const totalRooms = fetchedRooms.length;
    const availableRooms = fetchedRooms.filter(r => r.status === 'available').length;
    const occupiedRooms = fetchedRooms.filter(r => r.status === 'occupied').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const todayRevenue = fetchedReservations
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);

    setRooms(fetchedRooms);
    setRecentReservations(fetchedReservations);
    setStats({
      totalRooms,
      availableRooms,
      todayCheckIns: checkInsResult.count || 0,
      todayCheckOuts: checkOutsResult.count || 0,
      occupancyRate,
      todayRevenue,
    });

    setLoading(false);
  }

  const roomStatusData = useMemo((): RoomStatusCount[] => {
    const counts: Record<string, number> = {};
    rooms.forEach(room => {
      counts[room.status] = (counts[room.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: getStatusLabel(name),
      value,
      color: ROOM_STATUS_COLORS[name] || '#6b7280',
    }));
  }, [rooms]);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  const statCards = [
    {
      label: 'Total Rooms',
      value: stats.totalRooms,
      icon: BedDouble,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Available Rooms',
      value: stats.availableRooms,
      icon: DoorOpen,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: "Today's Check-ins",
      value: stats.todayCheckIns,
      icon: LogIn,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: "Today's Check-outs",
      value: stats.todayCheckOuts,
      icon: LogOut,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Occupancy Rate',
      value: `${stats.occupancyRate}%`,
      icon: TrendingUp,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  const quickActions = [
    { label: 'New Reservation', icon: Plus, to: '/reservations?action=new', color: 'bg-brand-600 hover:bg-brand-700 text-white' },
    { label: 'Quick Check-in', icon: UserCheck, to: '/reservations?action=checkin', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { label: 'Room Status', icon: LayoutGrid, to: '/rooms', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
    { label: 'View Reports', icon: BarChart3, to: '/reports', color: 'bg-violet-600 hover:bg-violet-700 text-white' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back. Here is what is happening at {currentHotel?.name} today.
          </p>
        </div>
        <div className="text-sm text-gray-500">{formatDate(new Date(), 'EEEE, MMM d, yyyy')}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`${card.bg} ${card.color} p-2 rounded-lg`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {quickActions.map(action => (
          <Link
            key={action.label}
            to={action.to}
            className={`${action.color} inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm`}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue (Last 7 Days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value) => [formatCurrency(Number(value || 0)), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Status Overview</h2>
          {roomStatusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="h-72 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {roomStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(value) => [`${Number(value || 0)} rooms`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 min-w-[140px]">
                {roomStatusData.map(entry => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-gray-600">{entry.name}</span>
                    <span className="text-sm font-semibold text-gray-900 ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-72 text-gray-400 text-sm">
              No room data available
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reservations</h2>
          <Link to="/reservations" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>
        {recentReservations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Guest
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Confirmation
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Check-in
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Check-out
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentReservations.map(reservation => (
                  <tr key={reservation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.guest
                          ? `${reservation.guest.first_name} ${reservation.guest.last_name}`
                          : 'Unknown Guest'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {reservation.guest?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-600">
                        {reservation.confirmation_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(reservation.check_in)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(reservation.check_out)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${getStatusColor(reservation.status)}`}>
                        {getStatusLabel(reservation.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(reservation.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No reservations found. Create your first reservation to get started.
          </div>
        )}
      </div>
    </div>
  );
}
