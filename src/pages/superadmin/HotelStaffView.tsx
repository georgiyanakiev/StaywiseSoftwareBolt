import { useState, useEffect, useCallback } from 'react';
import { Loader2, UserX, UserPlus, Search, Building2 } from 'lucide-react';
import { supabaseAdmin, supabase } from '../../lib/supabase';
import type { AdminUser, Tenant, HotelAssignment, AssignmentRole } from './types';
import { ASSIGNMENT_ROLES } from './types';

interface Props {
  tenants: Tenant[];
  allUsers: AdminUser[];
  onToast: (msg: string) => void;
}

interface AssignmentWithUser extends HotelAssignment {
  user?: AdminUser;
}

function getUserDisplayName(user: AdminUser) {
  const meta = user.raw_user_meta_data;
  if (!meta) return user.email;
  if (meta.first_name || meta.last_name) return `${meta.first_name ?? ''} ${meta.last_name ?? ''}`.trim();
  if (meta.full_name) return meta.full_name;
  return user.email;
}

export default function HotelStaffView({ tenants, allUsers, onToast }: Props) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id ?? '');
  const [assignments, setAssignments] = useState<AssignmentWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<AssignmentRole>('front_desk');
  const [adding, setAdding] = useState(false);
  const db = supabaseAdmin ?? supabase;

  const fetchAssignments = useCallback(async () => {
    if (!selectedTenantId) return;
    setLoading(true);
    const { data } = await db
      .from('user_hotel_assignments')
      .select('*')
      .eq('tenant_id', selectedTenantId)
      .eq('active', true);

    const enriched = (data ?? []).map(a => ({
      ...(a as HotelAssignment),
      user: allUsers.find(u => u.id === (a as HotelAssignment).user_id),
    }));
    setAssignments(enriched);
    setLoading(false);
  }, [db, selectedTenantId, allUsers]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleRoleChange = async (assignment: AssignmentWithUser, role: AssignmentRole) => {
    setSavingId(assignment.id);
    const { error } = await db
      .from('user_hotel_assignments')
      .update({ role })
      .eq('id', assignment.id);
    if (!error) {
      setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, role } : a));
      onToast('Role updated');
    }
    setSavingId(null);
  };

  const handleRemove = async (assignment: AssignmentWithUser) => {
    setSavingId(assignment.id);
    const { error } = await db
      .from('user_hotel_assignments')
      .update({ active: false })
      .eq('id', assignment.id);
    if (!error) {
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
      onToast('User removed from hotel');
    }
    setSavingId(null);
  };

  const handleAddUser = async () => {
    if (!addUserId) return;
    setAdding(true);

    const existing = await db
      .from('user_hotel_assignments')
      .select('id, active')
      .eq('user_id', addUserId)
      .eq('tenant_id', selectedTenantId)
      .maybeSingle();

    let error = null;
    if (existing.data) {
      const res = await db
        .from('user_hotel_assignments')
        .update({ active: true, role: addRole })
        .eq('id', existing.data.id);
      error = res.error;
    } else {
      const res = await db
        .from('user_hotel_assignments')
        .insert({ user_id: addUserId, tenant_id: selectedTenantId, role: addRole, active: true });
      error = res.error;
    }

    if (!error) {
      onToast('User added to hotel');
      setShowAddUser(false);
      setAddUserId('');
      setAddSearch('');
      setAddRole('front_desk');
      await fetchAssignments();
    }
    setAdding(false);
  };

  const assignedUserIds = new Set(assignments.map(a => a.user_id));
  const availableUsers = allUsers.filter(u =>
    !assignedUserIds.has(u.id) &&
    (addSearch === '' ||
      u.email.toLowerCase().includes(addSearch.toLowerCase()) ||
      getUserDisplayName(u).toLowerCase().includes(addSearch.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select
          value={selectedTenantId}
          onChange={e => setSelectedTenantId(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-700">
            Staff assigned to this hotel
            {!loading && <span className="ml-1.5 text-gray-400 font-normal">({assignments.length})</span>}
          </p>
          <button
            onClick={() => setShowAddUser(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add User
          </button>
        </div>

        {showAddUser && (
          <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={addUserId}
                onChange={e => setAddUserId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select user...</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {getUserDisplayName(u)} ({u.email})
                  </option>
                ))}
              </select>
              <select
                value={addRole}
                onChange={e => setAddRole(e.target.value as AssignmentRole)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ASSIGNMENT_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button
                onClick={handleAddUser}
                disabled={!addUserId || adding}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-400">No staff assigned to this hotel yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {assignments.map(a => {
              const user = a.user;
              const displayName = user ? getUserDisplayName(user) : a.user_id.slice(0, 8) + '...';
              const initials = user
                ? (displayName !== user.email ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : user.email.slice(0, 2).toUpperCase())
                : '??';

              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={a.role}
                      onChange={e => handleRoleChange(a, e.target.value as AssignmentRole)}
                      disabled={savingId === a.id}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white disabled:opacity-50"
                    >
                      {ASSIGNMENT_ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemove(a)}
                      disabled={savingId === a.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove from hotel"
                    >
                      {savingId === a.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserX className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
