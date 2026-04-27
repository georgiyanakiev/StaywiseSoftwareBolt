import { useState } from 'react';
import { Plus, Pencil, UserX, UserCheck, Loader2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import { HKTask, HKStaff } from './types';

interface Props {
  staff: HKStaff[];
  tasks: HKTask[];
  hotelId: string;
  tenantId: string | null;
  onChanged: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  housekeeper: 'bg-blue-100 text-blue-700',
  supervisor:  'bg-amber-100 text-amber-700',
  inspector:   'bg-teal-100 text-teal-700',
  maintenance: 'bg-gray-100 text-gray-700',
};

export default function StaffTab({ staff, tasks, hotelId, tenantId, onChanged }: Props) {
  const { toast } = useToast();
  const [editTarget, setEditTarget] = useState<HKStaff | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.scheduled_date === today);

  const getAssignedToday = (name: string) => todayTasks.filter(t => t.assigned_to === name).length;
  const getCompletedToday = (name: string) => todayTasks.filter(t => t.assigned_to === name && (t.status === 'done' || t.status === 'inspected' || t.status === 'completed')).length;

  const toggleActive = async (s: HKStaff) => {
    setTogglingId(s.id);
    await supabase.from('staff_members').update({ active: !s.active }).eq('id', s.id);
    setTogglingId(null);
    onChanged();
    toast('success', `${s.name} ${!s.active ? 'activated' : 'deactivated'}`);
  };

  const active = staff.filter(s => s.active);
  const inactive = staff.filter(s => !s.active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{active.length} active staff member{active.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {staff.length === 0 && (
        <div className="py-12 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>No housekeeping staff yet</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {active.length > 0 && (
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Role</th>
                <th className="table-header">Phone</th>
                <th className="table-header text-center">Assigned Today</th>
                <th className="table-header text-center">Completed Today</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map(s => {
                const assigned  = getAssignedToday(s.name);
                const completed = getCompletedToday(s.name);
                const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
                return (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="table-cell font-medium text-gray-900">{s.name}</td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500 text-sm">{s.phone || '—'}</td>
                    <td className="table-cell text-center">
                      <span className="font-semibold text-gray-900">{assigned}</span>
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold text-emerald-600">{completed}</span>
                        {assigned > 0 && (
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditTarget(s)} className="text-xs text-gray-400 hover:text-blue-600 transition-colors p-1">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleActive(s)} disabled={togglingId === s.id} className="text-xs text-gray-400 hover:text-red-500 transition-colors p-1">
                          {togglingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {inactive.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Inactive Staff</p>
          <div className="space-y-2">
            {inactive.map(s => (
              <div key={s.id} className="bg-white rounded-lg border border-dashed border-gray-200 p-3 flex items-center justify-between opacity-60">
                <div>
                  <span className="text-sm font-medium text-gray-700">{s.name}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600'}`}>{s.role}</span>
                </div>
                <button onClick={() => toggleActive(s)} disabled={togglingId === s.id} className="text-xs text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                  {togglingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Activate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(showAdd || editTarget) && (
        <StaffModal
          existing={editTarget}
          hotelId={hotelId}
          tenantId={tenantId}
          onClose={() => { setShowAdd(false); setEditTarget(null); }}
          onSaved={() => {
            setShowAdd(false);
            setEditTarget(null);
            onChanged();
            toast('success', editTarget ? 'Staff updated' : 'Staff added');
          }}
        />
      )}
    </div>
  );
}

function StaffModal({ existing, hotelId, tenantId, onClose, onSaved }: {
  existing: HKStaff | null;
  hotelId: string;
  tenantId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name:  existing?.name  ?? '',
    role:  existing?.role  ?? 'housekeeper',
    phone: existing?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (existing) {
      await supabase.from('staff_members').update(form).eq('id', existing.id);
    } else {
      await supabase.from('staff_members').insert({
        hotel_id: hotelId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...form,
      });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={existing ? 'Edit Staff Member' : 'Add Staff Member'} size="sm">
      <div className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="Full name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
          <select value={form.role} onChange={e => set('role', e.target.value)} className="input-field">
            <option value="housekeeper">Housekeeper</option>
            <option value="supervisor">Supervisor</option>
            <option value="inspector">Inspector</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field" placeholder="+351 912 345 678" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {existing ? 'Save Changes' : 'Add Staff'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
