import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, User, Save, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';
import {
  HKTask, HKStaff,
  TASK_TYPE_LABELS, TASK_TYPE_COLORS, PRIORITY_COLORS,
  STATUS_LABELS, NEXT_STATUS,
} from './types';

interface Props {
  task: HKTask;
  staff: HKStaff[];
  onClose: () => void;
  onUpdated: (task: HKTask) => void;
}

export default function TaskDetailPanel({ task, staff, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    status: task.status,
    priority: task.priority,
    assigned_to: task.assigned_to ?? '',
    notes: task.notes ?? '',
    inspected_by: task.inspected_by ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to ?? '',
      notes: task.notes ?? '',
      inspected_by: task.inspected_by ?? '',
    });
  }, [task.id]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const updates: Partial<HKTask> & Record<string, unknown> = { ...form };

    if (form.status === 'in_progress' && !task.started_at) {
      updates.started_at = now;
    }
    if ((form.status === 'done' || form.status === 'completed') && !task.completed_at) {
      updates.completed_at = now;
    }
    if (form.status === 'inspected' && !task.inspected_at) {
      updates.inspected_at = now;
    }

    const { data } = await supabase
      .from('housekeeping_tasks')
      .update(updates)
      .eq('id', task.id)
      .select()
      .single();

    setSaving(false);
    if (data) onUpdated(data as HKTask);
  };

  const advanceStatus = async () => {
    const next = NEXT_STATUS[form.status];
    if (!next) return;
    setForm(f => ({ ...f, status: next }));
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status: next };
    if (next === 'in_progress' && !task.started_at) updates.started_at = now;
    if (next === 'done' && !task.completed_at) updates.completed_at = now;
    if (next === 'inspected' && !task.inspected_at) updates.inspected_at = now;

    const { data } = await supabase
      .from('housekeeping_tasks')
      .update(updates)
      .eq('id', task.id)
      .select()
      .single();

    if (data) onUpdated(data as HKTask);
  };

  const nextLabel = NEXT_STATUS[form.status] ? STATUS_LABELS[NEXT_STATUS[form.status]] : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-bold text-blue-700 text-lg">
              {task.room_number}
            </div>
            <div>
              <p className="font-semibold text-gray-900">Room {task.room_number}</p>
              <p className="text-xs text-gray-500">Floor {task.floor ?? '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${TASK_TYPE_COLORS[task.task_type] ?? 'bg-gray-100 text-gray-600'}`}>
              {TASK_TYPE_LABELS[task.task_type] ?? task.task_type}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_COLORS[form.priority] ?? ''}`}>
              {form.priority}
            </span>
          </div>

          {nextLabel && (
            <button
              onClick={advanceStatus}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark as {nextLabel}
            </button>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field text-sm">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="inspected">Inspected</option>
                <option value="skipped">Skipped</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input-field text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" /> Assigned To
              </label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className="input-field text-sm">
                <option value="">Unassigned</option>
                {staff.filter(s => s.active).map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>

            {(form.status === 'inspected') && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Inspected By</label>
                <select value={form.inspected_by} onChange={e => set('inspected_by', e.target.value)} className="input-field text-sm">
                  <option value="">Select inspector...</option>
                  {staff.filter(s => s.active && (s.role === 'supervisor' || s.role === 'inspector')).map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="input-field text-sm resize-none"
                rows={3}
                placeholder="Add notes..."
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs text-gray-500">
            {task.started_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Started: {formatDateTime(task.started_at)}
              </div>
            )}
            {task.completed_at && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Completed: {formatDateTime(task.completed_at)}
                {task.duration_minutes && ` · ${task.duration_minutes} min`}
              </div>
            )}
            {task.inspected_at && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-teal-400" />
                Inspected: {formatDateTime(task.inspected_at)}
                {task.inspected_by && ` by ${task.inspected_by}`}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
