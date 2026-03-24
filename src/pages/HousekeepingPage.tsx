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
  CheckSquare,
  Square,
  TrendingUp,
  Award,
  UserCheck,
  LayoutList,
  Smartphone,
  ArrowRight,
  RefreshCw,
  User,
} from 'lucide-react';
import { useHotel } from '../contexts/HotelContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { getStatusColor, getStatusLabel, formatDate, formatDateTime } from '../lib/utils';
import type { HousekeepingTask, MaintenanceRequest, Room, StaffMember } from '../types';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

interface ChecklistItem {
  id: string;
  item_name: string;
  is_completed: boolean;
  completed_by: string;
  completed_at: string | null;
}

type ViewMode = 'tasks' | 'board' | 'mobile';

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

const PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-gray-300',
  normal: 'border-l-blue-400',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

const TASK_TYPE_COLORS: Record<string, string> = {
  clean: 'bg-sky-100 text-sky-700',
  deep_clean: 'bg-teal-100 text-teal-700',
  linen_change: 'bg-teal-100 text-teal-700',
  restock: 'bg-amber-100 text-amber-700',
  inspection: 'bg-gray-100 text-gray-700',
};

const STATUS_CARD_STYLE: Record<string, string> = {
  pending: 'border-l-amber-400 bg-white',
  in_progress: 'border-l-blue-500 bg-blue-50',
  completed: 'border-l-emerald-500 bg-emerald-50',
};

const ROOM_STATUSES: Room['status'][] = ['available', 'occupied', 'dirty', 'clean', 'maintenance', 'out_of_service'];

const DEFAULT_CHECKLIST_ITEMS: Record<HousekeepingTask['task_type'], string[]> = {
  clean: [
    'Make bed with fresh linens',
    'Vacuum and mop floors',
    'Clean and disinfect bathroom',
    'Dust all surfaces',
    'Empty trash bins',
    'Restock toiletries',
    'Check and replace towels',
    'Clean mirrors and windows',
  ],
  deep_clean: [
    'Make bed with fresh linens',
    'Deep vacuum carpets and furniture',
    'Clean and disinfect bathroom thoroughly',
    'Dust all surfaces including high areas',
    'Empty and sanitize trash bins',
    'Restock all toiletries',
    'Wash all towels and linens',
    'Clean mirrors, windows, and glass surfaces',
    'Clean under furniture',
    'Sanitize all touch points',
    'Check and clean air vents',
  ],
  linen_change: [
    'Remove all used linens',
    'Replace bed sheets and pillowcases',
    'Replace duvet cover',
    'Add fresh towels',
    'Check mattress condition',
  ],
  restock: [
    'Check and restock toiletries',
    'Restock towels',
    'Restock coffee/tea supplies',
    'Restock minibar items',
    'Replace used glasses',
  ],
  inspection: [
    'Check room cleanliness',
    'Verify all amenities present',
    'Test all lights and switches',
    'Check plumbing and fixtures',
    'Inspect furniture condition',
    'Check for maintenance issues',
  ],
};

interface TaskFormData {
  room_id: string;
  task_type: HousekeepingTask['task_type'];
  priority: HousekeepingTask['priority'];
  assigned_to: string;
  notes: string;
  auto_assign: boolean;
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
  auto_assign: true,
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
  const { t } = useLanguage();

  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [housekeepingStaff, setHousekeepingStaff] = useState<StaffMember[]>([]);
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

  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  const [mobileStaffFilter, setMobileStaffFilter] = useState('');

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

  const fetchHousekeepingStaff = async () => {
    if (!currentHotel) return;
    const { data } = await supabase
      .from('staff_members')
      .select('*')
      .eq('hotel_id', currentHotel.id)
      .eq('role', 'housekeeping')
      .eq('is_active', true)
      .order('first_name');
    setHousekeepingStaff((data || []) as StaffMember[]);
  };

  const fetchAll = async () => {
    if (!currentHotel) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await Promise.all([fetchTasks(), fetchRooms(), fetchMaintenanceRequests(), fetchHousekeepingStaff()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
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

  const mobileFilteredTasks = useMemo(() => {
    const active = tasks.filter(t => t.status !== 'completed');
    if (!mobileStaffFilter) return active;
    return active.filter(t => t.assigned_to === mobileStaffFilter);
  }, [tasks, mobileStaffFilter]);

  const getNextAssignedStaff = (): string => {
    if (housekeepingStaff.length === 0) return '';
    const workload = new Map<string, number>();
    housekeepingStaff.forEach(s => {
      const name = `${s.first_name} ${s.last_name}`;
      const count = tasks.filter(t =>
        t.assigned_to === name && t.status !== 'completed'
      ).length;
      workload.set(name, count);
    });
    let minLoad = Infinity;
    let assigned = '';
    workload.forEach((count, name) => {
      if (count < minLoad) {
        minLoad = count;
        assigned = name;
      }
    });
    return assigned;
  };

  const openCreateTask = () => {
    const autoAssign = housekeepingStaff.length > 0;
    setTaskForm({
      ...defaultTaskForm,
      room_id: rooms[0]?.id || '',
      auto_assign: autoAssign,
      assigned_to: autoAssign ? getNextAssignedStaff() : '',
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSavingTask(true);

    const assignedTo = taskForm.auto_assign ? getNextAssignedStaff() : taskForm.assigned_to.trim();

    const payload = {
      hotel_id: currentHotel.id,
      room_id: taskForm.room_id,
      task_type: taskForm.task_type,
      priority: taskForm.priority,
      status: 'pending' as const,
      assigned_to: assignedTo,
      notes: taskForm.notes.trim(),
    };

    const { error } = await supabase.from('housekeeping_tasks').insert(payload);
    if (error) {
      toast('error', 'Failed to create task');
      setSavingTask(false);
      return;
    }

    toast('success', assignedTo ? `Task assigned to ${assignedTo}` : 'Housekeeping task created');
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
    if (newStatus === 'dirty') {
      setTimeout(() => fetchTasks(), 800);
    }
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

  const openChecklistModal = async (task: HousekeepingTask) => {
    setSelectedTask(task);
    setShowChecklistModal(true);
    setLoadingChecklist(true);

    const { data, error } = await supabase
      .from('housekeeping_checklist_items')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at');

    if (error) {
      toast('error', 'Failed to load checklist');
      setLoadingChecklist(false);
      return;
    }

    if (data && data.length > 0) {
      setChecklistItems(data as ChecklistItem[]);
    } else {
      const defaultItems = DEFAULT_CHECKLIST_ITEMS[task.task_type] || [];
      const itemsToInsert = defaultItems.map(name => ({
        hotel_id: currentHotel!.id,
        task_id: task.id,
        item_name: name,
        is_completed: false,
        completed_by: '',
      }));

      const { data: newItems, error: insertError } = await supabase
        .from('housekeeping_checklist_items')
        .insert(itemsToInsert)
        .select();

      if (insertError || !newItems) {
        toast('error', 'Failed to create checklist');
        setChecklistItems([]);
      } else {
        setChecklistItems(newItems as ChecklistItem[]);
      }
    }

    setLoadingChecklist(false);
  };

  const toggleChecklistItem = async (itemId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const updatePayload: Record<string, unknown> = { is_completed: newStatus };

    if (newStatus) {
      updatePayload.completed_by = currentHotel?.name || 'Staff';
      updatePayload.completed_at = new Date().toISOString();
    } else {
      updatePayload.completed_by = '';
      updatePayload.completed_at = null;
    }

    const { error } = await supabase
      .from('housekeeping_checklist_items')
      .update(updatePayload)
      .eq('id', itemId);

    if (error) {
      toast('error', 'Failed to update checklist item');
      return;
    }

    setChecklistItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              is_completed: newStatus,
              completed_by: newStatus ? (currentHotel?.name || 'Staff') : '',
              completed_at: newStatus ? new Date().toISOString() : null,
            }
          : item
      )
    );
  };

  const completeTaskWithChecklist = async () => {
    if (!selectedTask) return;

    const allCompleted = checklistItems.every(item => item.is_completed);
    if (!allCompleted) {
      toast('warning', 'Please complete all checklist items before finishing the task');
      return;
    }

    const { error } = await supabase
      .from('housekeeping_tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', selectedTask.id);

    if (error) {
      toast('error', 'Failed to complete task');
      return;
    }

    if (selectedTask.room_id) {
      await supabase.from('rooms').update({ status: 'clean' }).eq('id', selectedTask.room_id);
      setRooms(prev =>
        prev.map(r => (r.id === selectedTask.room_id ? { ...r, status: 'clean' as const } : r))
      );
    }

    toast('success', 'Task completed successfully');
    setShowChecklistModal(false);
    fetchTasks();
  };

  const staffPerformance = useMemo(() => {
    const staffMap = new Map<string, { name: string; completed: number; inProgress: number; pending: number; completedToday: number }>();
    const today = new Date().toISOString().split('T')[0];

    tasks.forEach(task => {
      if (!task.assigned_to) return;
      if (!staffMap.has(task.assigned_to)) {
        staffMap.set(task.assigned_to, { name: task.assigned_to, completed: 0, inProgress: 0, pending: 0, completedToday: 0 });
      }
      const staff = staffMap.get(task.assigned_to)!;
      if (task.status === 'completed') {
        staff.completed++;
        if (task.completed_at?.startsWith(today)) staff.completedToday++;
      } else if (task.status === 'in_progress') {
        staff.inProgress++;
      } else if (task.status === 'pending') {
        staff.pending++;
      }
    });

    return Array.from(staffMap.values()).sort((a, b) => b.completed - a.completed);
  }, [tasks]);

  const staffNames = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach(t => { if (t.assigned_to) names.add(t.assigned_to); });
    return Array.from(names).sort();
  }, [tasks]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!currentHotel) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.housekeeping.title}</h1>
          <p className="text-sm text-gray-500 mt-1">Manage cleaning tasks, room statuses, and maintenance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowPerformanceModal(true)} className="btn-secondary">
            <TrendingUp className="w-4 h-4" />
            Staff Performance
          </button>
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
            <span className="text-xs font-medium text-gray-500">Dirty Rooms</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{dirtyRoomsCount}</span>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 sm:gap-6 overflow-x-auto">
          <button
            onClick={() => setViewMode('tasks')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'tasks'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">Task List</span>
              <span className="sm:hidden">List</span>
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{tasks.length}</span>
            </div>
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'mobile'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Staff View</span>
              <span className="sm:hidden">Staff</span>
              {pendingCount + inProgressCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">{pendingCount + inProgressCount}</span>
              )}
            </div>
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'board'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              <span className="hidden sm:inline">Room Status Board</span>
              <span className="sm:hidden">Board</span>
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
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field">
              <option value="">All Statuses</option>
              {TASK_STATUSES.map(s => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input-field">
              <option value="">All Priorities</option>
              {TASK_PRIORITIES.map(p => (
                <option key={p} value={p}>{getStatusLabel(p)}</option>
              ))}
            </select>
            <select value={taskTypeFilter} onChange={e => setTaskTypeFilter(e.target.value)} className="input-field">
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
                      <td className="table-cell font-medium text-gray-900">{task.room?.number || 'N/A'}</td>
                      <td className="table-cell text-gray-600">{task.room?.room_type?.name || 'N/A'}</td>
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
                      <td className="table-cell text-gray-600">{task.assigned_to || 'Unassigned'}</td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusColor(task.status)}`}>{getStatusLabel(task.status)}</span>
                      </td>
                      <td className="table-cell text-gray-500 text-sm max-w-[200px] truncate">{task.notes || '-'}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          {task.status !== 'completed' && (
                            <button onClick={() => openChecklistModal(task)} className="btn-secondary text-xs" title="Open checklist">
                              <ClipboardList className="w-3 h-3" />
                              Checklist
                            </button>
                          )}
                          {getNextStatusLabel(task.status) && (
                            <button onClick={() => handleTaskStatusAdvance(task)} className="btn-secondary text-xs">
                              {task.status === 'pending' && <Clock className="w-3 h-3" />}
                              {task.status === 'in_progress' && <CheckCircle className="w-3 h-3" />}
                              {getNextStatusLabel(task.status)}
                            </button>
                          )}
                          {task.status === 'completed' && (
                            <span className="text-xs text-gray-400">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {viewMode === 'mobile' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <select
                value={mobileStaffFilter}
                onChange={e => setMobileStaffFilter(e.target.value)}
                className="input-field w-full"
              >
                <option value="">All Staff</option>
                {staffNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <button onClick={fetchAll} className="btn-secondary p-2.5" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {housekeepingStaff.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setMobileStaffFilter('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mobileStaffFilter === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {housekeepingStaff.map(s => {
                const name = `${s.first_name} ${s.last_name}`;
                const active = tasks.filter(t => t.assigned_to === name && t.status !== 'completed').length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setMobileStaffFilter(mobileStaffFilter === name ? '' : name)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      mobileStaffFilter === name ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    {s.first_name}
                    {active > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${mobileStaffFilter === name ? 'bg-white text-gray-900' : 'bg-amber-200 text-amber-800'}`}>
                        {active}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {mobileFilteredTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
              <p className="font-medium text-gray-600">All clear!</p>
              <p className="text-sm mt-1">No active tasks {mobileStaffFilter ? `for ${mobileStaffFilter}` : ''}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mobileFilteredTasks.map(task => {
                const progress = 0;
                const borderColor = PRIORITY_BORDER[task.priority] || 'border-l-gray-300';
                const cardBg = STATUS_CARD_STYLE[task.status] || 'bg-white';
                return (
                  <div
                    key={task.id}
                    className={`rounded-xl border border-gray-200 border-l-4 ${borderColor} ${cardBg} shadow-sm overflow-hidden`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="text-xl font-bold text-gray-900">Room {task.room?.number}</div>
                          <div className="text-xs text-gray-500">{task.room?.room_type?.name}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                            {getStatusLabel(task.priority)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TASK_TYPE_COLORS[task.task_type] || 'bg-gray-100 text-gray-700'}`}>
                            {getStatusLabel(task.task_type)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                        <span className="text-sm text-gray-700 font-medium">
                          {task.assigned_to || <span className="text-gray-400 italic">Unassigned</span>}
                        </span>
                      </div>

                      {task.notes && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.notes}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={`badge ${getStatusColor(task.status)} text-xs`}>
                          {getStatusLabel(task.status)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 grid grid-cols-2 divide-x divide-gray-100">
                      <button
                        onClick={() => openChecklistModal(task)}
                        className="flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        <ClipboardList className="w-4 h-4" />
                        Checklist
                      </button>
                      {task.status === 'pending' ? (
                        <button
                          onClick={() => handleTaskStatusAdvance(task)}
                          className="flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                          Start
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTaskStatusAdvance(task)}
                          className="flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
                  className={`w-full p-3 rounded-xl border-2 text-center transition-all hover:shadow-md active:scale-95 ${ROOM_STATUS_COLORS[room.status] || 'bg-gray-100 border-gray-300 text-gray-700'}`}
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
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
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
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{maintenanceRequests.length}</span>
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
                        <td className="table-cell font-medium text-gray-900">{request.room?.number || 'N/A'}</td>
                        <td className="table-cell text-gray-600 max-w-[300px] truncate">{request.description}</td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[request.priority] || 'bg-gray-100 text-gray-700'}`}>
                            {getStatusLabel(request.priority)}
                          </span>
                        </td>
                        <td className="table-cell text-gray-600">{request.assigned_to || 'Unassigned'}</td>
                        <td className="table-cell">
                          <span className={`badge ${getStatusColor(request.status)}`}>{getStatusLabel(request.status)}</span>
                        </td>
                        <td className="table-cell text-gray-500 text-sm">{formatDate(request.created_at)}</td>
                        <td className="table-cell">
                          {getNextMaintenanceStatusLabel(request.status) && (
                            <button onClick={() => handleMaintenanceStatusAdvance(request)} className="btn-secondary text-xs">
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

      <Modal open={showTaskModal} onClose={() => setShowTaskModal(false)} title="Create Housekeeping Task">
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Assigned To</label>
              {housekeepingStaff.length > 0 && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taskForm.auto_assign}
                    onChange={e => setTaskForm(prev => ({
                      ...prev,
                      auto_assign: e.target.checked,
                      assigned_to: e.target.checked ? getNextAssignedStaff() : '',
                    }))}
                    className="rounded border-gray-300 text-brand-600"
                  />
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Auto-assign
                  </span>
                </label>
              )}
            </div>
            {taskForm.auto_assign && housekeepingStaff.length > 0 ? (
              <div className="input-field w-full bg-gray-50 flex items-center gap-2 text-gray-600">
                <UserCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{getNextAssignedStaff() || 'No housekeeping staff available'}</span>
                <span className="ml-auto text-xs text-emerald-600 font-medium">Auto</span>
              </div>
            ) : housekeepingStaff.length > 0 ? (
              <select
                value={taskForm.assigned_to}
                onChange={e => setTaskForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                className="input-field w-full"
              >
                <option value="">Unassigned</option>
                {housekeepingStaff.map(s => {
                  const name = `${s.first_name} ${s.last_name}`;
                  const load = tasks.filter(t => t.assigned_to === name && t.status !== 'completed').length;
                  return (
                    <option key={s.id} value={name}>{name} ({load} active)</option>
                  );
                })}
              </select>
            ) : (
              <input
                type="text"
                value={taskForm.assigned_to}
                onChange={e => setTaskForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                className="input-field w-full"
                placeholder="Staff member name"
              />
            )}
            {housekeepingStaff.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">Add staff members with the &quot;housekeeping&quot; role to enable auto-assignment.</p>
            )}
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
            <button type="button" onClick={() => setShowTaskModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={savingTask} className="btn-primary">
              {savingTask ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showMaintenanceModal} onClose={() => setShowMaintenanceModal(false)} title="New Maintenance Request">
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
            <button type="button" onClick={() => setShowMaintenanceModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={savingMaintenance} className="btn-primary">
              {savingMaintenance ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        title={`Cleaning Checklist - Room ${selectedTask?.room?.number || ''}`}
        size="lg"
      >
        {loadingChecklist ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Task Type:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedTask && getStatusLabel(selectedTask.task_type)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Priority:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedTask && getStatusLabel(selectedTask.priority)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Assigned To:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedTask?.assigned_to || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Progress:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {checklistItems.filter(i => i.is_completed).length} / {checklistItems.length}
                  </span>
                </div>
              </div>
              {checklistItems.length > 0 && (
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((checklistItems.filter(i => i.is_completed).length / checklistItems.length) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {checklistItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id, item.is_completed)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all active:scale-[0.98] ${
                    item.is_completed ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {item.is_completed ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`flex-1 text-left text-sm ${item.is_completed ? 'text-emerald-900 line-through' : 'text-gray-900'}`}>
                    {item.item_name}
                  </span>
                  {item.is_completed && item.completed_at && (
                    <span className="text-xs text-emerald-600">{formatDateTime(item.completed_at)}</span>
                  )}
                </button>
              ))}
            </div>

            {checklistItems.length === 0 && (
              <EmptyState
                icon={<ClipboardList className="w-6 h-6" />}
                title="No checklist items"
                description="No checklist items found for this task."
              />
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setShowChecklistModal(false)} className="btn-secondary">Close</button>
              {selectedTask?.status !== 'completed' && (
                <button
                  onClick={completeTaskWithChecklist}
                  disabled={!checklistItems.every(item => item.is_completed)}
                  className="btn-primary"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete Task
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showPerformanceModal} onClose={() => setShowPerformanceModal(false)} title="Staff Performance" size="lg">
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Total Completed</span>
              </div>
              <span className="text-2xl font-bold text-emerald-900">{tasks.filter(t => t.status === 'completed').length}</span>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">In Progress</span>
              </div>
              <span className="text-2xl font-bold text-blue-900">{tasks.filter(t => t.status === 'in_progress').length}</span>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Pending</span>
              </div>
              <span className="text-2xl font-bold text-amber-900">{tasks.filter(t => t.status === 'pending').length}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">Active Staff</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">{staffPerformance.length}</span>
            </div>
          </div>

          {staffPerformance.length === 0 ? (
            <EmptyState icon={<Award className="w-6 h-6" />} title="No staff data" description="Assign tasks to staff members to see performance metrics." />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Staff Member</th>
                    <th className="table-header">Completed</th>
                    <th className="table-header">In Progress</th>
                    <th className="table-header">Pending</th>
                    <th className="table-header">Today</th>
                    <th className="table-header">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staffPerformance.map(staff => {
                    const total = staff.completed + staff.inProgress + staff.pending;
                    const completionRate = total > 0 ? Math.round((staff.completed / total) * 100) : 0;
                    return (
                      <tr key={staff.name} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell font-medium text-gray-900">{staff.name}</td>
                        <td className="table-cell"><span className="badge bg-emerald-100 text-emerald-700">{staff.completed}</span></td>
                        <td className="table-cell"><span className="badge bg-blue-100 text-blue-700">{staff.inProgress}</span></td>
                        <td className="table-cell"><span className="badge bg-amber-100 text-amber-700">{staff.pending}</span></td>
                        <td className="table-cell"><span className="badge bg-gray-100 text-gray-700">{staff.completedToday}</span></td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                              <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{completionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
