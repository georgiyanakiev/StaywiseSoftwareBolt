import { useState, useEffect, useCallback } from 'react';
import {
  SprayCan, LayoutGrid, Grid3x3, Wrench, Users, UserPlus,
  CheckCircle2, Clock, Eye, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHotel } from '../contexts/HotelContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTenantId } from '../hooks/useTenantQuery';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import KanbanBoard from './housekeeping/KanbanBoard';
import RoomGrid from './housekeeping/RoomGrid';
import MaintenanceTab from './housekeeping/MaintenanceTab';
import StaffTab, { StaffModal } from './housekeeping/StaffTab';
import { HKTask, HKStaff } from './housekeeping/types';
import type { MaintenanceRequest } from '../types';

type Tab = 'kanban' | 'rooms' | 'maintenance' | 'staff';

interface Room {
  id: string;
  number: string;
  floor: number;
  status: string;
  room_type?: { name: string };
}

export default function HousekeepingPage() {
  const { currentHotel } = useHotel();
  const { t } = useLanguage();
  const tenantId = useTenantId();
  const [tab, setTab] = useState<Tab>('kanban');
  const [tasks, setTasks] = useState<HKTask[]>([]);
  const [issues, setIssues] = useState<MaintenanceRequest[]>([]);
  const [staff, setStaff] = useState<HKStaff[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [upsellByRoom, setUpsellByRoom] = useState<Record<string, string[]>>({});
  const [showAddStaff, setShowAddStaff] = useState(false);

  const load = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    await supabase.rpc('sync_room_statuses', { p_hotel_id: currentHotel.id });
    const [
      { data: t },
      { data: i },
      { data: s },
      { data: r },
    ] = await Promise.all([
      supabase.from('housekeeping_tasks').select('*')
        .eq('hotel_id', currentHotel.id)
        .eq('scheduled_date', today)
        .order('room_number'),
      supabase.from('maintenance_requests').select('*, room:rooms(id, number)')
        .eq('hotel_id', currentHotel.id)
        .order('created_at', { ascending: false }),
      supabase.from('staff_members')
        .select('id, first_name, last_name, email, phone, role, is_active, department, created_at')
        .eq('hotel_id', currentHotel.id)
        .order('first_name'),
      supabase.from('rooms').select('id, number, floor, status, room_type:room_types(name)')
        .eq('hotel_id', currentHotel.id)
        .order('floor').order('number'),
    ]);
    setTasks((t ?? []) as HKTask[]);
    setIssues((i ?? []) as MaintenanceRequest[]);
    setStaff((s ?? []) as HKStaff[]);
    setRooms((r ?? []) as unknown as Room[]);

    const { data: upsellOrders } = await supabase
      .from('upsell_orders')
      .select('booking_id, item_name, status')
      .eq('hotel_id', currentHotel.id)
      .in('status', ['confirmed', 'delivered']);

    if (upsellOrders && upsellOrders.length > 0) {
      const bookingIds = [...new Set(upsellOrders.map(o => o.booking_id).filter(Boolean))];
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, room_id')
        .in('id', bookingIds as string[]);

      const roomMap: Record<string, string[]> = {};
      for (const order of upsellOrders) {
        if (!order.booking_id) continue;
        const resv = (reservations ?? []).find(rv => rv.id === order.booking_id);
        if (!resv) continue;
        if (!roomMap[resv.room_id]) roomMap[resv.room_id] = [];
        roomMap[resv.room_id].push(order.item_name);
      }
      setUpsellByRoom(roomMap);
    } else {
      setUpsellByRoom({});
    }

    setLoading(false);
  }, [currentHotel]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.scheduled_date === today);

  const stats = {
    cleaned:    todayTasks.filter(t => t.status === 'done' || t.status === 'completed').length,
    pending:    todayTasks.filter(t => t.status === 'pending').length,
    inProgress: todayTasks.filter(t => t.status === 'in_progress').length,
    inspected:  todayTasks.filter(t => t.status === 'inspected').length,
    maintOpen:  issues.filter(i => i.status !== 'completed').length,
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'kanban',      label: t.housekeeping.kanbanBoard,  icon: LayoutGrid },
    { id: 'rooms',       label: t.housekeeping.roomGrid,     icon: Grid3x3 },
    { id: 'maintenance', label: t.housekeeping.maintenance,   icon: Wrench,  badge: stats.maintOpen },
    { id: 'staff',       label: t.housekeeping.staff,         icon: Users },
  ];

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <SprayCan className="w-6 h-6 text-blue-600" />
            {t.housekeeping.title}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t.housekeeping.manageClean}</p>
        </div>
        <button
          onClick={() => setShowAddStaff(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#1e3a5f] border border-[#1e3a5f]/30 rounded-lg hover:bg-[#1e3a5f]/5 transition-colors flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.housekeeping.addStaff}</span>
        </button>
      </div>

      {showAddStaff && (
        <StaffModal
          existing={null}
          hotelId={currentHotel!.id}
          tenantId={tenantId}
          onClose={() => setShowAddStaff(false)}
          onSaved={() => { setShowAddStaff(false); load(); }}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: t.housekeeping.cleanedToday,   value: stats.cleaned,    icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t.housekeeping.pending,         value: stats.pending,    icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: t.housekeeping.inProgress,     value: stats.inProgress, icon: SprayCan,     color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: t.housekeeping.inspected,       value: stats.inspected,  icon: Eye,          color: 'text-teal-600',    bg: 'bg-teal-50' },
          { label: t.housekeeping.maintenanceOpen,value: stats.maintOpen,  icon: AlertTriangle,color: stats.maintOpen > 0 ? 'text-red-600' : 'text-gray-500', bg: stats.maintOpen > 0 ? 'bg-red-50' : 'bg-gray-100' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xs text-gray-500 font-medium leading-tight">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.id ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
            {t.badge ? (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'kanban' && (
        <KanbanBoard
          tasks={todayTasks}
          staff={staff}
          hotelId={currentHotel!.id}
          tenantId={tenantId}
          upsellByRoom={upsellByRoom}
          onTasksChanged={load}
        />
      )}

      {tab === 'rooms' && (
        <RoomGrid
          tasks={todayTasks}
          rooms={rooms}
          staff={staff}
          onTasksChanged={load}
        />
      )}

      {tab === 'maintenance' && (
        <MaintenanceTab
          issues={issues}
          rooms={rooms}
          hotelId={currentHotel!.id}
          tenantId={tenantId}
          onChanged={load}
        />
      )}

      {tab === 'staff' && (
        <StaffTab
          staff={staff}
          tasks={tasks}
          hotelId={currentHotel!.id}
          tenantId={tenantId}
          onChanged={load}
        />
      )}
    </div>
  );
}
