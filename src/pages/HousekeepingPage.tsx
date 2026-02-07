import { useState, useEffect, useMemo } from 'react';
import {
  SprayCan,
  Plus,
  ClipboardList,
  Grid3x3,
  Wrench,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useHotel } from '../contexts/HotelContext';
import { supabase } from '../lib/supabase';
import { getStatusColor, getStatusLabel, formatDate, formatDateTime } from '../lib/utils';
import type { HousekeepingTask, MaintenanceRequest, Room } from '../types';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

type ViewMode = 'tasks' | 'board';

const TASK_TYPES: HousekeepingTask['task_type'][] = ['clean', 'deep_clean', 'linen_change', 'restock', 'inspection'];
const TASK_PRIORITIES: HousekeepingTask['priority'][] = ['low', 'normal', 'high', 'urgent'];
const TASK_STATUSES: HousekeepingTask['status'][] = ['pending', 'in_progress', 'completed'];
const MAINTENANCE_PRIORITIES: MaintenanceRequest['priority'][] = ['low', 'medium', 'high', 'urgent'];

const ROOM_STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  clean: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  dirty: 'bg-red-100 border-red-300 text-red-800',
  in_progress: 'bg-amber-100 border-amber-300 text-amber-800',
  occupied: 'bg-blue-100 border-blue-300 text-blue-800',
  maintenance: 'bg-gray-200 border-gray-400 text-gray-700',
  out_of_service: 'bg-gray-300 border-gray-500 text-gray-800',
};

const ROOM_STATUS_LEGEND: { status: string; label: string; color: string }[] = [
  { status: 'available', label: 'Available / Clean', color: 'bg-emerald-100 border-emerald-300' },
  { status: 'dirty', label: 'Dirty', color: 'bg-red-100 border-red-300' },
  { status: 'in_progress', label: 'Being Cleaned', color: 'bg-amber-100 border-amber-300' },
  { status: 'occupied', label: 'Occupied', color: 'bg-blue-100 border-blue-300' },
  { status: 'maintenance', label: 'Maintenance', color: 'bg-gray-200 border-gray-400' },
  { status: 'out_of_service', label: 'Out of Service', color: 'bg-gray-300 border-gray-500' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const TASK_TYPE_COLORS: Record<string, string> = {
  clean: 'bg-sky-100 text-sky-700',
  deep_clean: 'bg-violet-100 text-violet-700',
  linen_change: 'bg-teal-100 text-teal-700',
  restock: 'bg-amber-100 text-amber-700',
  inspection: 'bg-indigo-100 text-indigo-700',
};

const ROOM_STATUSES: Room['status'][] = ['available', 'occupied', 'dirty', 'clean', 'maintenance', 'out_of_service'];

interface TaskFormData {
  room_id: string;
  task_type: HousekeepingTask['task_type'];
  priority: HousekeepingTask['priority'];
  assigned_to: string;
  notes: string;
}

interface MaintenanceFormData {
  room_id: string;
  description: string;
  priority: MaintenanceRequest['priority'];
  assigned_to: string;
}

const defaultTaskForm: TaskFormData = {
  room_id: '',
  task_type: 'clean',
  priority: 'normal',
  assigned_to: '',
  notes: '',
};

const defaultMaintenanceForm: MaintenanceFormData = {
  room_id: '',
  description: '',
  priority: 'medium',
  assigned_to: '',
};

export default function HousekeepingPage() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('');
  const [assignedToSearch, setAssignedToSearch] = useState('');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormData>(defaultTaskForm);
  const [savingTask, setSavingTask] = useState(false);

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormData>(defaultMaintenanceForm);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const [maintenanceOpen, setMaintenanceOpen] = useState(false);

  const [roomStatusDropdown, setRoomStatusDropdown] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!currentHotel) return;
    const { data, error } = await supabase
      .from('housekeeping_tasks')
      .select('*, room:rooms(*, room_type:room_types(*))')
      .eq('hotel_id', currentHotel.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast('error', 'Failed to load housekeeping tasks');
      return;
    }
    setTasks((data || []) as HousekeepingTask[]);
  };

  const fetchRooms = async () => {
    if (!currentHotel) return;
    const { data, error } = await supabase
      .from('rooms')
      .select('*, room_type:room_types(*)')
      .eq('hotel_id', currentHotel.id)
      .order('number');
    if (error) {
      toast('error', 'Failed to load rooms');
      return;
    }
    setRooms((data || []) as Room[]);
  };

  const fetchMaintenanceRequests = async () => {
    if (!currentHotel) return;
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*, room:rooms(*, room_type:room_types(*))')
      .eq('hotel_id', currentHotel.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast('error', 'Failed to load maintenance requests');
      return;
    }
    setMaintenanceRequests((data || []) as MaintenanceRequest[]);
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchTasks(), fetchRooms(), fetchMaintenanceRequests()]);
    setLoading(false);
  };

  useEffect(() => {
    if (currentHotel) {
      fetchAll();
    }
  }, [currentHotel?.id]);

  const pendingCount = useMemo(() => tasks.filter(t => t.status === 'pending').length, [tasks]);
  const inProgressCount = useMemo(() => tasks.filter(t => t.status === 'in_progress').length, [tasks]);
  const completedTodayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(t => t.status === 'completed' && t.completed_at?.startsWith(today)).length;
  }, [tasks]);
  const dirtyRoomsCount = useMemo(() => rooms.filter(r => r.status === 'dirty').length, [rooms]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (statusFilter && task.status !== statusFilter) return false;
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (taskTypeFilter && task.task_type !== taskTypeFilter) return false;
      if (assignedToSearch) {
        const q = assignedToSearch.toLowerCase();
        if (!task.assigned_to?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, taskTypeFilter, assignedToSearch]);

  const openCreateTask = () => {
    setTaskForm({ ...defaultTaskForm, room_id: rooms[0]?.id || '' });
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSavingTask(true);

    const payload = {
      hotel_id: currentHotel.id,
      room_id: taskForm.room_id,
      task_type: taskForm.task_type,
      priority: taskForm.priority,
      status: 'pending' as const,
      assigned_to: taskForm.assigned_to.trim(),
      notes: taskForm.notes.trim(),
    };

    const { error } = await supabase.from('housekeeping_tasks').insert(payload);
    if (error) {
      toast('error', 'Failed to create task');
      setSavingTask(false);
      return;
    }

    toast('success', 'Housekeeping task created');
    setSavingTask(false);
    setShowTaskModal(false);
    fetchTasks();
  };

  const handleTaskStatusAdvance = async (task: HousekeepingTask) => {
    let newStatus: HousekeepingTask['status'];
    if (task.status === 'pending') {
      newStatus = 'in_progress';
    } else if (task.status === 'in_progress') {
      newStatus = 'completed';
    } else {
      return;
    }

    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'completed') {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('housekeeping_tasks')
      .update(updatePayload)
      .eq('id', task.id);

    if (error) {
      toast('error', 'Failed to update task status');
      return;
    }

    if (newStatus === 'completed' && task.room_id) {
      await supabase
        .from('rooms')
        .update({ status: 'clean' })
        .eq('id', task.room_id);
      setRooms(prev => prev.map(r => r.id === task.room_id ? { ...r, status: 'clean' as const } : r));
    }

    toast('success', `Task marked as ${getStatusLabel(newStatus).toLowerCase()}`);
    fetchTasks();
  };

  const handleRoomStatusChange = async (roomId: string, newStatus: Room['status']) => {
    const { error } = await supabase.from('rooms').update({ status: newStatus }).eq('id', roomId);
    if (error) {
      toast('error', 'Failed to update room status');
      return;
    }
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: newStatus } : r));
    setRoomStatusDropdown(null);
    toast('success', `Room status changed to ${getStatusLabel(newStatus)}`);
  };

  const openCreateMaintenance = () => {
    setMaintenanceForm({ ...defaultMaintenanceForm, room_id: rooms[0]?.id || '' });
    setShowMaintenanceModal(true);
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSavingMaintenance(true);

    const payload = {
      hotel_id: currentHotel.id,
      room_id: maintenanceForm.room_id,
      description: maintenanceForm.description.trim(),
      priority: maintenanceForm.priority,
      status: 'reported' as const,
      assigned_to: maintenanceForm.assigned_to.trim(),
      cost: 0,
    };

    const { error } = await supabase.from('maintenance_requests').insert(payload);
    if (error) {
      toast('error', 'Failed to create maintenance request');
      setSavingMaintenance(false);
      return;
    }

    toast('success', 'Maintenance request created');
    setSavingMaintenance(false);
    setShowMaintenanceModal(false);
    fetchMaintenanceRequests();
  };

  const handleMaintenanceStatusAdvance = async (request: MaintenanceRequest) => {
    let newStatus: MaintenanceRequest['status'];
    if (request.status === 'reported') {
      newStatus = 'in_progress';
    } else if (request.status === 'in_progress') {
      newStatus = 'completed';
    } else {
      return;
    }

    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'completed') {
      updatePayload.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('maintenance_requests')
      .update(updatePayload)
      .eq('id', request.id);

    if (error) {
      toast('error', 'Failed to update maintenance status');
      return;
    }

    toast('success', `Request marked as ${getStatusLabel(newStatus).toLowerCase()}`);
    fetchMaintenanceRequests();
  };

  const getNextStatusLabel = (status: string): string | null => {
    if (status === 'pending') return 'Start';
    if (status === 'in_progress') return 'Complete';
    return null;
  };

  const getNextMaintenanceStatusLabel = (status: string): string | null => {
    if (status === 'reported') return 'Start';
    if (status === 'in_progress') return 'Complete';
    return null;
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!currentHotel) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
          <p className="text-sm text-gray-500 mt-1">Manage cleaning tasks, room statuses, and maintenance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreateTask} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500">Pending Tasks</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{pendingCount}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <SprayCan className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500">In Progress</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{inProgressCount}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-500">Completed Today</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{completedTodayCount}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-gray-500">Total Rooms Dirty</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{dirtyRoomsCount}</span>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setViewMode('tasks')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'tasks'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Task List
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{tasks.length}</span>
            </div>
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'board'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              Room Status Board
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{rooms.length}</span>
            </div>
          </button>
        </nav>
      </div>

      {viewMode === 'tasks' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search assigned to..."
              value={assignedToSearch}
              onChange={e => setAssignedToSearch(e.target.value)}
              className="input-field flex-1"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Statuses</option>
              {TASK_STATUSES.map(s => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Priorities</option>
              {TASK_PRIORITIES.map(p => (
                <option key={p} value={p}>{getStatusLabel(p)}</option>
              ))}
            </select>
            <select
              value={taskTypeFilter}
              onChange={e => setTaskTypeFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Task Types</option>
              {TASK_TYPES.map(t => (
                <option key={t} value={t}>{getStatusLabel(t)}</option>
              ))}
            </select>
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={<SprayCan className="w-6 h-6" />}
              title="No tasks found"
              description={tasks.length === 0 ? 'Create your first housekeeping task to get started.' : 'Try adjusting your filters to find tasks.'}
              action={
                tasks.length === 0 ? (
                  <button onClick={openCreateTask} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Create Task
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Room</th>
                    <th className="table-header">Room Type</th>
                    <th className="table-header">Task Type</th>
                    <th className="table-header">Priority</th>
                    <th className="table-header">Assigned To</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Notes</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell font-medium text-gray-900">
                        {task.room?.number || 'N/A'}
                      </td>
                      <td className="table-cell text-gray-600">
                        {task.room?.room_type?.name || 'N/A'}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TASK_TYPE_COLORS[task.task_type] || 'bg-gray-100 text-gray-700'}`}>
                          {getStatusLabel(task.task_type)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority] || 'bg-gray-100 text-gray-700'}`}>
                          {getStatusLabel(task.priority)}
                        </span>
                      </td>
                      <td className="table-cell text-gray-600">
                        {task.assigned_to || 'Unassigned'}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusColor(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500 text-sm max-w-[200px] truncate">
                        {task.notes || '-'}
                      </td>
                      <td className="table-cell">
                        {getNextStatusLabel(task.status) && (
                          <button
                            onClick={() => handleTaskStatusAdvance(task)}
                            className="btn-secondary text-xs"
                          >
                            {task.status === 'pending' && <Clock className="w-3 h-3" />}
                            {task.status === 'in_progress' && <CheckCircle className="w-3 h-3" />}
                            {getNextStatusLabel(task.status)}
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <span className="text-xs text-gray-400">Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {viewMode === 'board' && (
        <>
          <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
            {ROOM_STATUS_LEGEND.map(item => (
              <div key={item.status} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border ${item.color}`} />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {rooms.map(room => (
              <div key={room.id} className="relative">
                <button
                  onClick={() => setRoomStatusDropdown(roomStatusDropdown === room.id ? null : room.id)}
                  className={`w-full p-3 rounded-xl border-2 text-center transition-all hover:shadow-md ${ROOM_STATUS_COLORS[room.status] || 'bg-gray-100 border-gray-300 text-gray-700'}`}
                >
                  <div className="text-lg font-bold">{room.number}</div>
                  <div className="text-xs font-medium mt-0.5">{getStatusLabel(room.status)}</div>
                </button>
                {roomStatusDropdown === room.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setRoomStatusDropdown(null)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1 min-w-[140px]">
                      {ROOM_STATUSES.filter(s => s !== room.status).map(s => (
                        <button
                          key={s}
                          onClick={() => handleRoomStatusChange(room.id, s)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className={`w-2.5 h-2.5 rounded-full border ${ROOM_STATUS_COLORS[s]?.split(' ').slice(0, 2).join(' ') || 'bg-gray-100 border-gray-300'}`} />
                          {getStatusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {rooms.length === 0 && (
            <EmptyState
              icon={<Grid3x3 className="w-6 h-6" />}
              title="No rooms found"
              description="Add rooms in Room Management to see them on the status board."
            />
          )}
        </>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={() => setMaintenanceOpen(!maintenanceOpen)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Maintenance Requests</h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {maintenanceRequests.length}
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${maintenanceOpen ? 'rotate-180' : ''}`} />
        </button>

        {maintenanceOpen && (
          <div className="border-t border-gray-100">
            <div className="p-4 flex justify-end">
              <button onClick={openCreateMaintenance} className="btn-primary">
                <Plus className="w-4 h-4" />
                New Request
              </button>
            </div>

            {maintenanceRequests.length === 0 ? (
              <EmptyState
                icon={<Wrench className="w-6 h-6" />}
                title="No maintenance requests"
                description="Create a maintenance request when something needs repair."
                action={
                  <button onClick={openCreateMaintenance} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    New Request
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Room</th>
                      <th className="table-header">Description</th>
                      <th className="table-header">Priority</th>
                      <th className="table-header">Assigned To</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Created</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {maintenanceRequests.map(request => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell font-medium text-gray-900">
                          {request.room?.number || 'N/A'}
                        </td>
                        <td className="table-cell text-gray-600 max-w-[300px] truncate">
                          {request.description}
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[request.priority] || 'bg-gray-100 text-gray-700'}`}>
                            {getStatusLabel(request.priority)}
                          </span>
                        </td>
                        <td className="table-cell text-gray-600">
                          {request.assigned_to || 'Unassigned'}
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                        </td>
                        <td className="table-cell text-gray-500 text-sm">
                          {formatDate(request.created_at)}
                        </td>
                        <td className="table-cell">
                          {getNextMaintenanceStatusLabel(request.status) && (
                            <button
                              onClick={() => handleMaintenanceStatusAdvance(request)}
                              className="btn-secondary text-xs"
                            >
                              {request.status === 'reported' && <Clock className="w-3 h-3" />}
                              {request.status === 'in_progress' && <CheckCircle className="w-3 h-3" />}
                              {getNextMaintenanceStatusLabel(request.status)}
                            </button>
                          )}
                          {request.status === 'completed' && (
                            <span className="text-xs text-gray-400">
                              {request.resolved_at ? formatDateTime(request.resolved_at) : 'Done'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Create Housekeeping Task"
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Room</label>
            <select
              value={taskForm.room_id}
              onChange={e => setTaskForm(prev => ({ ...prev, room_id: e.target.value }))}
              className="input-field w-full"
              required
            >
              <option value="">Select a room</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  Room {r.number} - {r.room_type?.name || 'Unknown'} ({getStatusLabel(r.status)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Task Type</label>
              <select
                value={taskForm.task_type}
                onChange={e => setTaskForm(prev => ({ ...prev, task_type: e.target.value as HousekeepingTask['task_type'] }))}
                className="input-field w-full"
                required
              >
                {TASK_TYPES.map(t => (
                  <option key={t} value={t}>{getStatusLabel(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select
                value={taskForm.priority}
                onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as HousekeepingTask['priority'] }))}
                className="input-field w-full"
                required
              >
                {TASK_PRIORITIES.map(p => (
                  <option key={p} value={p}>{getStatusLabel(p)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned To</label>
            <input
              type="text"
              value={taskForm.assigned_to}
              onChange={e => setTaskForm(prev => ({ ...prev, assigned_to: e.target.value }))}
              className="input-field w-full"
              placeholder="Staff member name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={taskForm.notes}
              onChange={e => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field w-full"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowTaskModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={savingTask} className="btn-primary">
              {savingTask ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        title="New Maintenance Request"
      >
        <form onSubmit={handleSaveMaintenance} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Room</label>
            <select
              value={maintenanceForm.room_id}
              onChange={e => setMaintenanceForm(prev => ({ ...prev, room_id: e.target.value }))}
              className="input-field w-full"
              required
            >
              <option value="">Select a room</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  Room {r.number} - {r.room_type?.name || 'Unknown'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={maintenanceForm.description}
              onChange={e => setMaintenanceForm(prev => ({ ...prev, description: e.target.value }))}
              className="input-field w-full"
              rows={3}
              placeholder="Describe the maintenance issue..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select
                value={maintenanceForm.priority}
                onChange={e => setMaintenanceForm(prev => ({ ...prev, priority: e.target.value as MaintenanceRequest['priority'] }))}
                className="input-field w-full"
                required
              >
                {MAINTENANCE_PRIORITIES.map(p => (
                  <option key={p} value={p}>{getStatusLabel(p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned To</label>
              <input
                type="text"
                value={maintenanceForm.assigned_to}
                onChange={e => setMaintenanceForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                className="input-field w-full"
                placeholder="Staff member name"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowMaintenanceModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={savingMaintenance} className="btn-primary">
              {savingMaintenance ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
