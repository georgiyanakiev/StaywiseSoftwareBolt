import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { supabase } from '../../../lib/supabase';
import { ROLE_LABELS, type StaffRole } from '../../../lib/permissions';
import type { StaffMember } from '../../../types';

const ROLES: StaffRole[] = ['owner', 'manager', 'front_desk', 'housekeeping', 'maintenance', 'accountant', 'readonly'];

interface Props {
  staff: StaffMember | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function StaffEditModal({ staff, open, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    role: 'front_desk' as StaffRole,
    department: '',
    phone: '',
    is_active: true,
  });

  useEffect(() => {
    if (staff) {
      setForm({
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: staff.role as StaffRole,
        department: staff.department ?? '',
        phone: staff.phone ?? '',
        is_active: staff.is_active,
      });
    }
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('staff_members')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          department: form.department,
          phone: form.phone,
          is_active: form.is_active,
        })
        .eq('id', staff.id);

      if (error) throw new Error(error.message);
      toast('success', 'Staff member updated');
      onSaved();
      onClose();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to update staff member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Staff Member" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              className="input-field"
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              className="input-field"
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              className="input-field"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as StaffRole }))}
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              className="input-field"
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            className="input-field"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`relative w-10 h-6 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {form.is_active ? 'Active' : 'Deactivated'}
            </span>
          </label>
          {!form.is_active && (
            <span className="text-xs text-gray-500">This staff member cannot log in when deactivated.</span>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
