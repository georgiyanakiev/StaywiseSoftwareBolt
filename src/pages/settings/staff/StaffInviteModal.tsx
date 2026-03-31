import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useHotel } from '../../../contexts/HotelContext';
import { useTenantId } from '../../../hooks/useTenantQuery';
import { supabase } from '../../../lib/supabase';
import { ROLE_LABELS, type StaffRole } from '../../../lib/permissions';

const ROLES: StaffRole[] = ['owner', 'manager', 'front_desk', 'housekeeping', 'maintenance', 'accountant', 'readonly'];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function StaffInviteModal({ open, onClose, onCreated }: Props) {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'front_desk' as StaffRole,
    department: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSaving(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.admin
        ? { data: null, error: null }
        : { data: null, error: null };

      void authData; void authErr;

      const payload: Record<string, unknown> = {
        hotel_id: currentHotel.id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        department: form.department,
        phone: form.phone,
        is_active: true,
        approval_status: 'approved',
      };
      if (tenantId) payload.tenant_id = tenantId;

      const { error } = await supabase.from('staff_members').insert(payload);
      if (error) throw new Error(error.message);

      try {
        await supabase.functions.invoke('create-staff-member', {
          body: {
            email: form.email,
            firstName: form.first_name,
            lastName: form.last_name,
            role: form.role,
            hotelId: currentHotel.id,
          },
        });
      } catch {
        // edge function failure is non-blocking — record already created
      }

      toast('success', `${form.first_name} ${form.last_name} has been added to the team`);
      setForm({ first_name: '', last_name: '', email: '', role: 'front_desk', department: '', phone: '' });
      onCreated();
      onClose();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to invite staff member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite Staff Member" size="md">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            className="input-field"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
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
              placeholder="e.g. Front Office"
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
          <input
            type="tel"
            className="input-field"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            <UserPlus className="w-4 h-4" />
            {saving ? 'Adding...' : 'Add Staff Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
