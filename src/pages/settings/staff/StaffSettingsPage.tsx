import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, Pencil, UserX, UserCheck, Search, Shield, BookOpen,
  Clock, CheckCircle2, XCircle, AlertTriangle, KeyRound, Eye, EyeOff, Loader2, Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useHotel } from '../../../contexts/HotelContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import { supabase } from '../../../lib/supabase';
import {
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  type StaffRole,
} from '../../../lib/permissions';
import type { StaffMember } from '../../../types';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import StaffInviteModal from './StaffInviteModal';
import StaffEditModal from './StaffEditModal';
import PermissionsMatrix from './PermissionsMatrix';
import RoleDescriptions from './RoleDescriptions';

type Tab = 'staff' | 'permissions' | 'roles';

function formatLastLogin(date: string | null): string {
  if (!date) return 'Never';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export default function StaffSettingsPage() {
  const { currentHotel } = useHotel();
  const { staff: currentStaff } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('staff');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeRole, setActiveRole] = useState<StaffRole>('manager');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isOwnerOrManager = currentStaff?.role === 'owner' || currentStaff?.role === 'manager';

  const loadStaff = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('staff_members')
        .select('*')
        .eq('hotel_id', currentHotel.id)
        .order('created_at', { ascending: false });
      setStaffList((data ?? []) as StaffMember[]);
    } finally {
      setLoading(false);
    }
  }, [currentHotel]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const toggleActive = async (member: StaffMember) => {
    const { error } = await supabase
      .from('staff_members')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);

    if (error) {
      toast('error', 'Failed to update staff status');
    } else {
      toast('success', `${member.first_name} ${member.is_active ? 'deactivated' : 'reactivated'}`);
      loadStaff();
    }
    setDeactivateTarget(null);
  };

  const approveStaff = async (member: StaffMember) => {
    const { error } = await supabase
      .from('staff_members')
      .update({ approval_status: 'approved', is_active: true })
      .eq('id', member.id);

    if (error) {
      toast('error', 'Failed to approve staff member');
    } else {
      toast('success', `${member.first_name} ${member.last_name} approved and activated`);
      loadStaff();
    }
  };

  const rejectStaff = async (member: StaffMember) => {
    const { error } = await supabase
      .from('staff_members')
      .update({ approval_status: 'rejected', is_active: false })
      .eq('id', member.id);

    if (error) {
      toast('error', 'Failed to reject staff member');
    } else {
      toast('success', `${member.first_name} ${member.last_name} access rejected`);
      loadStaff();
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || resetPassword.length < 8) return;
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-staff-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ staff_member_id: resetTarget.id, password: resetPassword }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        toast('error', json.error ?? 'Failed to reset password');
      } else {
        toast('success', `Password updated for ${resetTarget.first_name} ${resetTarget.last_name}`);
        setResetTarget(null);
        setResetPassword('');
      }
    } catch {
      toast('error', 'Failed to connect to password reset service');
    } finally {
      setResetting(false);
    }
  };

  const pendingApprovals = staffList.filter(s => s.approval_status === 'pending');

  const filtered = staffList.filter(s => s.approval_status !== 'pending').filter(s => {
    const q = search.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      (s.department ?? '').toLowerCase().includes(q)
    );
  });

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'staff', label: 'Staff List', icon: UserPlus },
    { key: 'permissions', label: 'Permissions Matrix', icon: Shield },
    { key: 'roles', label: 'Role Guide', icon: BookOpen },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Settings
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-semibold text-gray-900">Staff & Permissions</h1>
        </div>
        {isOwnerOrManager && tab === 'staff' && (
          <button
            onClick={() => setInviteOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Member
          </button>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'staff' && (
        <div className="space-y-4">
          {isOwnerOrManager && (
            <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-blue-700">
                <span className="font-semibold">Automated password reset emails may not be available.</span>
                {' '}If a staff member is locked out, use the <KeyRound className="w-3.5 h-3.5 inline mx-0.5" /> Reset Password button on their row to set a new password directly.
              </p>
            </div>
          )}

          {isOwnerOrManager && pendingApprovals.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-200 bg-amber-100/60">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-800">
                  {pendingApprovals.length} staff member{pendingApprovals.length > 1 ? 's' : ''} awaiting approval
                </p>
              </div>
              <div className="divide-y divide-amber-100">
                {pendingApprovals.map(member => {
                  const roleColor = ROLE_BADGE_COLORS[member.role as StaffRole] ?? 'bg-gray-100 text-gray-600';
                  return (
                    <div key={member.id} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-800 flex-shrink-0">
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        </div>
                        <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${roleColor}`}>
                          {ROLE_LABELS[member.role as StaffRole] ?? member.role}
                        </span>
                        <span className="hidden md:flex items-center gap-1 text-xs text-amber-700">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => approveStaff(member)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectStaff(member)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Search by name, email, role or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <LoadingSpinner size="md" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<UserPlus className="w-6 h-6" />}
              title="No staff members found"
              description={search ? 'Try adjusting your search' : 'Add your first staff member to get started'}
              action={isOwnerOrManager ? (
                <button className="btn-primary" onClick={() => setInviteOpen(true)}>Add Staff Member</button>
              ) : undefined}
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="table-header">Name</th>
                    <th className="table-header">Role</th>
                    <th className="table-header hidden sm:table-cell">Department</th>
                    <th className="table-header hidden md:table-cell">Last Login</th>
                    <th className="table-header">Status</th>
                    {isOwnerOrManager && <th className="table-header text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(member => {
                    const isMe = member.id === currentStaff?.id;
                    const roleColor = ROLE_BADGE_COLORS[member.role as StaffRole] ?? 'bg-gray-100 text-gray-600';
                    return (
                      <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="table-cell">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                              {member.first_name[0]}{member.last_name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {member.first_name} {member.last_name}
                                {isMe && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
                              </p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
                            {ROLE_LABELS[member.role as StaffRole] ?? member.role}
                          </span>
                        </td>
                        <td className="table-cell hidden sm:table-cell text-gray-500 text-sm">
                          {member.department || '—'}
                        </td>
                        <td className="table-cell hidden md:table-cell text-gray-500 text-sm">
                          {formatLastLogin(member.last_login)}
                        </td>
                        <td className="table-cell">
                          {member.approval_status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              member.is_active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                              {member.is_active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        {isOwnerOrManager && (
                          <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditTarget(member)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {!isMe && (
                                <button
                                  onClick={() => { setResetTarget(member); setResetPassword(''); setShowResetPw(false); }}
                                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Reset Password"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!isMe && (
                                <button
                                  onClick={() => setDeactivateTarget(member)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    member.is_active
                                      ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                      : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={member.is_active ? 'Deactivate' : 'Reactivate'}
                                >
                                  {member.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'permissions' && (
        isOwnerOrManager ? (
          <PermissionsMatrix activeRole={activeRole} onRoleChange={setActiveRole} />
        ) : (
          <div className="py-12 text-center text-gray-500">
            <Shield className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">Access Restricted</p>
            <p className="text-sm">Only owners and managers can view or edit permissions.</p>
          </div>
        )
      )}

      {tab === 'roles' && <RoleDescriptions />}

      <StaffInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={loadStaff}
      />

      <StaffEditModal
        staff={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={loadStaff}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        title={deactivateTarget?.is_active ? 'Deactivate Staff Member' : 'Reactivate Staff Member'}
        message={
          deactivateTarget?.is_active
            ? `Deactivating ${deactivateTarget?.first_name} ${deactivateTarget?.last_name} will prevent them from logging in.`
            : `This will restore login access for ${deactivateTarget?.first_name} ${deactivateTarget?.last_name}.`
        }
        confirmLabel={deactivateTarget?.is_active ? 'Deactivate' : 'Reactivate'}
        variant={deactivateTarget?.is_active ? 'danger' : 'warning'}
        onConfirm={() => deactivateTarget && toggleActive(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
      />

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Reset Password</h3>
                <p className="text-sm text-gray-500">{resetTarget.first_name} {resetTarget.last_name}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              This sets a new password immediately. The staff member will need to use it at their next login. Share it securely.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showResetPw ? 'text' : 'password'}
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowResetPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {resetPassword.length > 0 && resetPassword.length < 8 && (
                <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setResetTarget(null); setResetPassword(''); }}
                className="flex-1 btn-secondary"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting || resetPassword.length < 8}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                Set Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
