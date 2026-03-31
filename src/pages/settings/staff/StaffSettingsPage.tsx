import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, Pencil, UserX, UserCheck, Search, Shield, BookOpen,
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

  const filtered = staffList.filter(s => {
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
                  ? 'border-blue-600 text-blue-600'
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
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            member.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
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
    </div>
  );
}
