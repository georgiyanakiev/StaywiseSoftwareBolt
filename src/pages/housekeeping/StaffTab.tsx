import { useState } from 'react';
import { Plus, Pencil, UserX, UserCheck, Loader2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { useLanguage } from '../../contexts/LanguageContext';
import Modal from '../../components/ui/Modal';
import { HKTask, HKStaff, staffFullName } from './types';

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
  manager:     'bg-purple-100 text-purple-700',
  admin:       'bg-rose-100 text-rose-700',
};

export default function StaffTab({ staff, tasks, hotelId, tenantId, onChanged }: Props) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [editTarget, setEditTarget] = useState<HKStaff | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(task => task.scheduled_date === today);

  const getAssignedToday = (s: HKStaff) => {
    const name = staffFullName(s);
    return todayTasks.filter(task => task.assigned_to === name).length;
  };
  const getCompletedToday = (s: HKStaff) => {
    const name = staffFullName(s);
    return todayTasks.filter(task =>
      task.assigned_to === name &&
      (task.status === 'done' || task.status === 'inspected' || task.status === 'completed')
    ).length;
  };

  const toggleActive = async (s: HKStaff) => {
    setTogglingId(s.id);
    await supabase.from('staff_members').update({ is_active: !s.is_active }).eq('id', s.id);
    setTogglingId(null);
    onChanged();
    toast('success', `${staffFullName(s)} ${!s.is_active ? t.housekeeping.activated : t.housekeeping.deactivated}`);
  };

  const active   = staff.filter(s => s.is_active);
  const inactive = staff.filter(s => !s.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {active.length} {active.length !== 1 ? t.housekeeping.activeStaffPlural : t.housekeeping.activeStaff}
        </p>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> {t.housekeeping.addStaff}
        </button>
      </div>

      {staff.length === 0 && (
        <div className="py-12 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>{t.housekeeping.noStaff}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {active.length > 0 && (
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">{t.housekeeping.name}</th>
                <th className="table-header">{t.housekeeping.roleLabel}</th>
                <th className="table-header">{t.housekeeping.phoneLabel}</th>
                <th className="table-header text-center">{t.housekeeping.assignedToday}</th>
                <th className="table-header text-center">{t.housekeeping.completedToday}</th>
                <th className="table-header">{t.housekeeping.actionsLabel}</th>
              </tr>
            </thead>
            <tbody>
              {active.map(s => {
                const assigned  = getAssignedToday(s);
                const completed = getCompletedToday(s);
                const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
                return (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="table-cell font-medium text-gray-900">{staffFullName(s)}</td>
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
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">{t.housekeeping.inactiveStaff}</p>
          <div className="space-y-2">
            {inactive.map(s => (
              <div key={s.id} className="bg-white rounded-lg border border-dashed border-gray-200 p-3 flex items-center justify-between opacity-60">
                <div>
                  <span className="text-sm font-medium text-gray-700">{staffFullName(s)}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600'}`}>{s.role}</span>
                </div>
                <button onClick={() => toggleActive(s)} disabled={togglingId === s.id} className="text-xs text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                  {togglingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {t.housekeeping.activate}
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
            toast('success', editTarget ? t.housekeeping.staffUpdated : t.housekeeping.staffAdded);
          }}
        />
      )}
    </div>
  );
}

export function StaffModal({ existing, hotelId, tenantId, onClose, onSaved }: {
  existing: HKStaff | null;
  hotelId: string;
  tenantId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    first_name: existing?.first_name ?? '',
    last_name:  existing?.last_name  ?? '',
    role:       existing?.role       ?? 'housekeeper',
    phone:      existing?.phone      ?? '',
    email:      existing?.email      ?? '',
    is_active:  existing?.is_active  ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.first_name.trim()) return;
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
    <Modal open onClose={onClose} title={existing ? t.housekeeping.editStaff : t.housekeeping.addStaff} size="sm">
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.housekeeping.firstName}</label>
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className="input-field" placeholder="Ivan" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.housekeeping.lastName}</label>
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className="input-field" placeholder="Petrov" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.housekeeping.roleLabel}</label>
          <select value={form.role} onChange={e => set('role', e.target.value)} className="input-field">
            <option value="housekeeper">Housekeeper</option>
            <option value="supervisor">Supervisor</option>
            <option value="inspector">Inspector</option>
            <option value="maintenance">Maintenance</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.housekeeping.phoneLabel}</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field" placeholder="+359 888 123 456" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.housekeeping.emailLabel}</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" placeholder="ivan@hotel.com" />
        </div>
        <div className="flex items-center justify-between py-1">
          <label className="text-sm font-medium text-gray-700">{t.housekeeping.activeToggle}</label>
          <button
            type="button"
            onClick={() => set('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-[#1e3a5f]' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">{t.common.cancel}</button>
          <button onClick={handleSave} disabled={saving || !form.first_name.trim()} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {existing ? t.housekeeping.saveChanges : t.housekeeping.addStaff}
          </button>
        </div>
      </div>
    </Modal>
  );
}
