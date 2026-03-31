import { useState } from 'react';
import { Bed, SprayCan, Eye, AlertTriangle, ZapOff, Ban } from 'lucide-react';
import { HKTask, HKStaff, TASK_TYPE_LABELS } from './types';
import TaskDetailPanel from './TaskDetailPanel';

interface Room {
  id: string;
  number: string;
  floor: number;
  status: string;
  room_type?: { name: string };
}

interface Props {
  tasks: HKTask[];
  rooms: Room[];
  staff: HKStaff[];
  onTasksChanged: () => void;
}

const ROOM_STATUS_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  inspected:   { bg: 'bg-emerald-50',  border: 'border-emerald-300',  text: 'text-emerald-800', label: 'Inspected' },
  done:        { bg: 'bg-emerald-50',  border: 'border-emerald-200',  text: 'text-emerald-700', label: 'Clean' },
  in_progress: { bg: 'bg-amber-50',    border: 'border-amber-300',    text: 'text-amber-800',   label: 'In Progress' },
  pending:     { bg: 'bg-red-50',      border: 'border-red-200',      text: 'text-red-700',     label: 'Pending' },
  maintenance: { bg: 'bg-gray-200',    border: 'border-gray-400',     text: 'text-gray-700',    label: 'Maintenance' },
  available:   { bg: 'bg-emerald-50',  border: 'border-emerald-200',  text: 'text-emerald-700', label: 'Available' },
  dirty:       { bg: 'bg-red-50',      border: 'border-red-200',      text: 'text-red-700',     label: 'Dirty' },
  occupied:    { bg: 'bg-blue-50',     border: 'border-blue-200',     text: 'text-blue-700',    label: 'Occupied' },
  out_of_service: { bg: 'bg-gray-100', border: 'border-gray-300',     text: 'text-gray-500',    label: 'Out of Service' },
};

const TASK_ICON: Record<string, React.ElementType> = {
  checkout_clean: SprayCan,
  stayover_clean: SprayCan,
  deep_clean:     SprayCan,
  touch_up:       SprayCan,
  inspection:     Eye,
  turndown:       Bed,
};

const LEGEND = [
  { label: 'Inspected / Clean', style: ROOM_STATUS_STYLE.inspected },
  { label: 'In Progress',       style: ROOM_STATUS_STYLE.in_progress },
  { label: 'Pending / Dirty',   style: ROOM_STATUS_STYLE.pending },
  { label: 'Occupied',          style: ROOM_STATUS_STYLE.occupied },
  { label: 'Maintenance',       style: ROOM_STATUS_STYLE.maintenance },
  { label: 'Out of Service',    style: ROOM_STATUS_STYLE.out_of_service },
];

export default function RoomGrid({ tasks, rooms, staff, onTasksChanged }: Props) {
  const [selectedTask, setSelectedTask] = useState<HKTask | null>(null);

  const tasksByRoom: Record<string, HKTask> = {};
  for (const t of tasks) {
    if (t.room_id) tasksByRoom[t.room_id] = t;
  }

  const getStyle = (room: Room, task?: HKTask) => {
    if (task) return ROOM_STATUS_STYLE[task.status] ?? ROOM_STATUS_STYLE.pending;
    return ROOM_STATUS_STYLE[room.status] ?? ROOM_STATUS_STYLE.available;
  };

  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {floors.map(floor => {
        const floorRooms = rooms.filter(r => r.floor === floor);
        return (
          <div key={floor}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Floor {floor}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {floorRooms.map(room => {
                const task = tasksByRoom[room.id];
                const style = getStyle(room, task);
                const IconComp = task ? (TASK_ICON[task.task_type] ?? SprayCan) : null;
                const isUrgent = task?.priority === 'urgent';

                return (
                  <button
                    key={room.id}
                    onClick={() => task && setSelectedTask(task)}
                    className={`relative rounded-xl border-2 p-2.5 text-left transition-all ${style.bg} ${style.border} ${style.text}
                      ${task ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'cursor-default'}
                      ${isUrgent ? 'ring-2 ring-red-400 ring-offset-1' : ''}
                    `}
                  >
                    {isUrgent && (
                      <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
                    )}
                    <p className="text-base font-bold leading-tight">{room.number}</p>
                    {IconComp && (
                      <IconComp className="w-4 h-4 mt-0.5 opacity-60" />
                    )}
                    {task && (
                      <p className="text-xs mt-0.5 opacity-70 leading-tight truncate">
                        {TASK_TYPE_LABELS[task.task_type] ?? task.task_type}
                      </p>
                    )}
                    {!task && (
                      <p className="text-xs mt-0.5 opacity-60 leading-tight">{style.label}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {rooms.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <Bed className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>No rooms found</p>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Legend</p>
        <div className="flex flex-wrap gap-2">
          {LEGEND.map(l => (
            <div key={l.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${l.style.bg} ${l.style.border}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${l.style.bg} border ${l.style.border}`} />
              <span className={`text-xs font-medium ${l.style.text}`}>{l.label}</span>
            </div>
          ))}
        </div>
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
