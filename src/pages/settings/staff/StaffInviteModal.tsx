import { useState, useEffect } from 'react';
import { UserPlus, Copy, CheckCircle2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useHotel } from '../../../contexts/HotelContext';
import { supabase } from '../../../lib/supabase';
import { ROLE_LABELS, type StaffRole } from '../../../lib/permissions';

const ROLES: StaffRole[] = ['owner', 'manager', 'front_desk', 'housekeeping', 'maintenance', 'accountant', 'readonly'];

function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$';
  let pw = '';
  for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
  return pw;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface CreatedStaff {
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  tempPassword: string;
  staffId?: string;
}

export default function StaffInviteModal({ open, onClose, onCreated }: Props) {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdStaff, setCreatedStaff] = useState<CreatedStaff | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'front_desk' as StaffRole,
    department: '',
    phone: '',
    tempPassword: '',
  });

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, tempPassword: generatePassword() }));
      setCreatedStaff(null);
      setCopied(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    if (form.tempPassword.length < 8) {
      toast('error', 'Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-staff-member', {
        body: {
          email: form.email,
          firstName: form.first_name,
          first_name: form.first_name,
          lastName: form.last_name,
          last_name: form.last_name,
          role: form.role,
          hotelId: currentHotel.id,
          hotel_id: currentHotel.id,
          department: form.department,
          phone: form.phone,
          password: form.tempPassword,
          is_active: true,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setCreatedStaff({
        firstName: form.first_name,
        lastName: form.last_name,
        email: form.email,
        role: form.role,
        tempPassword: form.tempPassword,
        staffId: data?.staffId,
      });

      onCreated();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to invite staff member');
    } finally {
      setSaving(false);
    }
  };

  const onboardingMessage = createdStaff ? `Hi ${createdStaff.firstName},

You have been added to ${currentHotel?.name ?? 'the hotel'} on StayWise PMS.

Your login details:
  Email: ${createdStaff.email}
  Temporary password: ${createdStaff.tempPassword}

Please log in at the StayWise URL and change your password on first login.

Welcome to the team!`.trim() : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(onboardingMessage);
      setCopied(true);
      if (createdStaff?.staffId) {
        await supabase.from('staff_members').update({ onboarding_sent: true }).eq('id', createdStaff.staffId);
      }
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast('error', 'Could not copy to clipboard');
    }
  };

  const handleClose = () => {
    setCreatedStaff(null);
    setForm({ first_name: '', last_name: '', email: '', role: 'front_desk', department: '', phone: '', tempPassword: '' });
    onClose();
  };

  if (createdStaff) {
    return (
      <Modal open={open} onClose={handleClose} title="Staff Member Added" size="md">
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800">
                {createdStaff.firstName} {createdStaff.lastName} has been added
              </p>
              <p className="text-sm text-emerald-700 mt-0.5">{ROLE_LABELS[createdStaff.role]} · {createdStaff.email}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Temporary Password</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
              <code className="flex-1 text-sm font-mono text-gray-900 select-all">
                {showPw ? createdStaff.tempPassword : '•'.repeat(createdStaff.tempPassword.length)}
              </code>
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Share this securely — they should change it on first login.</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Onboarding Message</p>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-44 overflow-y-auto">
              {onboardingMessage}
            </pre>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                copied
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-[#1e3a5f] text-white hover:bg-[#172e4c]'
              }`}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Onboarding Details'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invite Staff Member" size="md">
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, tempPassword: generatePassword() }))}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          </div>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input-field pr-10 font-mono"
              value={form.tempPassword}
              onChange={e => setForm(f => ({ ...f, tempPassword: e.target.value }))}
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">You will be shown this password to share with the staff member after adding them.</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            <UserPlus className="w-4 h-4" />
            {saving ? 'Adding...' : 'Add Staff Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
