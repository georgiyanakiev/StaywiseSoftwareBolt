import { useState } from 'react';
import { Plus, RefreshCw, Loader2, ChevronRight, User, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import {
  HKTask, HKStaff,
  TASK_TYPE_LABELS, TASK_TYPE_COLORS, PRIORITY_COLORS,
  KANBAN_COLUMNS, NEXT_STATUS, STATUS_LABELS,
} from './types';
import TaskDetailPanel from './TaskDetailPanel';

interface Props {
  tasks: HKTask[];
  staff: HKStaff[];
  hotelId: string;
  tenantId: string | null;
  upsellByRoom?: Record<string, string[]>;
  onTasksChanged: () => void;
}

export default function KanbanBoard({ tasks, staff, hotelId, tenantId, upsellByRoom = {}, onTasksChanged }: Props) {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<HKTask | null>(null);
  const [filterStaff, setFilterStaff] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [generating, setGenerating] = useState(false);

  const staffNames = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
  const floors = [...new Set(tasks.map(t => t.floor).filter(f => f != null))].sort((a, b) => a - b);

  const filtered = tasks.filter(t => {
    if (filterStaff && t.assigned_to !== filterStaff) return false;
    if (filterType && t.task_type !== filterType) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterFloor && String(t.floor) !== filterFloor) return false;
    return true;
  });

  const advanceTask = async (e: React.MouseEvent, task: HKTask) => {
    e.stopPropagation();
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status: next };
    if (next === 'in_progress' && !task.started_at) updates.started_at = now;
    if (next === 'done' && !task.completed_at) updates.completed_at = now;
    if (next === 'inspected' && !task.inspected_at) updates.inspected_at = now;
    await supabase.from('housekeeping_tasks').update(updates).eq('id', task.id);
    onTasksChanged();
  };

  const generateTasks = async () => {
    setGenerating(true);
    const today = new Date().toISOString().split('T')[0];
    let created = 0;

    const { data: checkouts } = await supabase
      .from('reservations')
      .select('room_id, rooms(number, floor)')
      .eq('hotel_id', hotelId)
      .eq('check_out', today)
      .in('status', ['checked_in', 'confirmed']);

    const { data: occupied } = await supabase
      .from('reservations')
      .select('room_id, rooms(number, floor)')
      .eq('hotel_id', hotelId)
      .lt('check_in', today)
      .gt('check_out', today)
      .eq('status', 'checked_in');

    const existingRoomIds = new Set(
      tasks.filter(t => t.scheduled_date === today).map(t => t.room_id)
    );

    const toInsert: object[] = [];

    for (const r of (checkouts ?? [])) {
      if (!r.room_id || existingRoomIds.has(r.room_id)) continue;
      const room = r.rooms as { number: string; floor: number } | null;
      toInsert.push({
        hotel_id: hotelId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        room_id: r.room_id,
        room_number: room?.number ?? '',
        floor: room?.floor ?? 1,
        task_type: 'checkout_clean',
        status: 'pending',
        priority: 'normal',
        scheduled_date: today,
      });
      existingRoomIds.add(r.room_id);
    }

    for (const r of (occupied ?? [])) {
      if (!r.room_id || existingRoomIds.has(r.room_id)) continue;
      const room = r.rooms as { number: string; floor: number } | null;
      toInsert.push({
        hotel_id: hotelId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        room_id: r.room_id,
        room_number: room?.number ?? '',
        floor: room?.floor ?? 1,
        task_type: 'stayover_clean',
        status: 'pending',
        priority: 'normal',
        scheduled_date: today,
      });
      existingRoomIds.add(r.room_id);
    }

    if (toInsert.length > 0) {
      await supabase.from('housekeeping_tasks').insert(toInsert);
      created = toInsert.length;
    }

    setGenerating(false);
    onTasksChanged();
    toast(
      created > 0 ? 'success' : 'info',
      created > 0 ? `${created} task${created > 1 ? 's' : ''} generated for today` : 'No new tasks — all rooms already have tasks'
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="input-field py-1.5 text-xs w-36">
          <option value="">All Staff</option>
          <option value="">Unassigned</option>
          {staffNames.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field py-1.5 text-xs w-36">
          <option value="">All Types</option>
          {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="input-field py-1.5 text-xs w-32">
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} className="input-field py-1.5 text-xs w-28">
          <option value="">All Floors</option>
          {floors.map(f => <option key={f} value={String(f)}>Floor {f}</option>)}
        </select>
        <div className="ml-auto">
          <button
            onClick={generateTasks}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Generate Today's Tasks
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
        {KANBAN_COLUMNS.map(col => {
          const colTasks = filtered.filter(t =>
            col.id === 'done' ? (t.status === 'done' || t.status === 'completed') : t.status === col.id
          );
          return (
            <div key={col.id} className={`bg-gray-50 rounded-xl border-t-4 ${col.color} overflow-hidden`}>
              <div className="px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                <span className="text-xs bg-white text-gray-500 border border-gray-200 rounded-full px-2 py-0.5 font-medium">{colTasks.length}</span>
              </div>
              <div className="px-2 pb-3 space-y-2 min-h-[120px]">
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    upsells={upsellByRoom[task.room_id] ?? []}
                    onClick={() => setSelectedTask(task)}
                    onAdvance={advanceTask}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="py-6 text-center text-gray-400 text-xs">No tasks</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          staff={staff}
          onClose={() => setSelectedTask(null)}
          onUpdated={updated => {
            setSelectedTask(updated);
            onTasksChanged();
          }}
        />
      )}
    </div>
  );
}

function TaskCard({ task, upsells, onClick, onAdvance }: {
  task: HKTask;
  upsells: string[];
  onClick: () => void;
  onAdvance: (e: React.MouseEvent, task: HKTask) => void;
}) {
  const nextLabel = NEXT_STATUS[task.status] ? STATUS_LABELS[NEXT_STATUS[task.status]] : null;
  const isUrgent = task.priority === 'urgent';
  const isHigh = task.priority === 'high';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border cursor-pointer hover:shadow-md transition-all p-3 ${
        isUrgent ? 'border-l-4 border-l-red-500 border-red-100' :
        isHigh   ? 'border-l-4 border-l-amber-400 border-amber-50' :
                   'border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <span className="text-lg font-bold text-gray-900 leading-none">{task.room_number}</span>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority] ?? ''}`}>
          {task.priority !== 'normal' && task.priority !== 'low' && (
            <>{task.priority === 'urgent' ? <AlertTriangle className="w-3 h-3 inline mr-0.5" /> : null}{task.priority}</>
          )}
          {(task.priority === 'normal' || task.priority === 'low') && task.priority}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className={`text-xs px-1.5 py-0.5 rounded ${TASK_TYPE_COLORS[task.task_type] ?? 'bg-gray-100 text-gray-600'}`}>
          {TASK_TYPE_LABELS[task.task_type] ?? task.task_type}
        </span>
        <span className="text-xs text-gray-400">Floor {task.floor}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
        <User className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{task.assigned_to || 'Unassigned'}</span>
      </div>

      {task.notes && (
        <p className="text-xs text-gray-400 truncate mb-2">{task.notes}</p>
      )}

      {upsells.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {upsells.map((u, i) => (
            <span key={i} className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5 leading-tight">
              {u}
            </span>
          ))}
        </div>
      )}

      {nextLabel && (
        <button
          onClick={e => onAdvance(e, task)}
          className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded py-1 font-medium transition-colors mt-1"
        >
          <ChevronRight className="w-3 h-3" />
          {nextLabel}
        </button>
      )}
    </div>
  );
}
