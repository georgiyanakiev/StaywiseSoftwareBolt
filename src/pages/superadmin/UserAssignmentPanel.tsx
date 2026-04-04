import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Loader2, Building2, AlertCircle, X } from 'lucide-react';
import { supabaseAdmin, supabase } from '../../lib/supabase';
import type { AdminUser, Tenant, HotelAssignment, AssignmentRole } from './types';
import { ASSIGNMENT_ROLES } from './types';

interface Props {
  user: AdminUser;
  tenants: Tenant[];
  onToast: (msg: string) => void;
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getUserDisplayName(user: AdminUser) {
  const meta = user.raw_user_meta_data;
  if (!meta) return user.email;
  if (meta.first_name || meta.last_name) return `${meta.first_name ?? ''} ${meta.last_name ?? ''}`.trim();
  if (meta.full_name) return meta.full_name;
  return user.email;
}

export default function UserAssignmentPanel({ user, tenants, onToast }: Props) {
  const [assignments, setAssignments] = useState<HotelAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Tenant | null>(null);
  const db = supabaseAdmin ?? supabase;

  const displayName = getUserDisplayName(user);
  const initials = displayName !== user.email
    ? getInitials(displayName)
    : user.email.slice(0, 2).toUpperCase();

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from('user_hotel_assignments')
      .select('*')
      .eq('user_id', user.id);
    setAssignments((data as HotelAssignment[]) ?? []);
    setLoading(false);
  }, [db, user.id]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const getAssignment = (tenantId: string) =>
    assignments.find(a => a.tenant_id === tenantId);

  const doToggle = async (tenant: Tenant) => {
    const existing = getAssignment(tenant.id);
    setSaving(tenant.id);
    setSaveError(null);

    if (existing) {
      const newActive = !existing.active;
      const { error } = await db
        .from('user_hotel_assignments')
        .update({ active: newActive })
        .eq('id', existing.id);
      if (error) {
        setSaveError(`Failed to update assignment for ${tenant.name}: ${error.message}`);
      } else {
        setAssignments(prev => prev.map(a => a.id === existing.id ? { ...a, active: newActive } : a));
        onToast(newActive ? `Assigned to ${tenant.name}` : `Removed from ${tenant.name}`);
      }
    } else {
      const { data, error } = await db
        .from('user_hotel_assignments')
        .insert({ user_id: user.id, tenant_id: tenant.id, role: 'front_desk', active: true })
        .select()
        .single();
      if (error) {
        setSaveError(`Failed to assign to ${tenant.name}: ${error.message}`);
      } else if (data) {
        setAssignments(prev => [...prev, data as HotelAssignment]);
        onToast(`Assigned to ${tenant.name}`);
      }
    }

    setSaving(null);
  };

  const handleToggle = (tenant: Tenant) => {
    const existing = getAssignment(tenant.id);
    if (existing?.active) {
      setConfirmRemove(tenant);
    } else {
      doToggle(tenant);
    }
  };

  const handleRoleChange = async (tenant: Tenant, role: AssignmentRole) => {
    const existing = getAssignment(tenant.id);
    if (!existing) return;
    setSaving(`role-${tenant.id}`);
    setSaveError(null);

    const { error } = await db
      .from('user_hotel_assignments')
      .update({ role })
      .eq('id', existing.id);

    if (error) {
      setSaveError(`Failed to update role: ${error.message}`);
    } else {
      setAssignments(prev => prev.map(a => a.id === existing.id ? { ...a, role } : a));
      onToast('Role updated');
    }
    setSaving(null);
  };

  return (
    <div className="flex flex-col h-full">
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Remove Assignment</h3>
              <button onClick={() => setConfirmRemove(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-700">
                Remove <span className="font-semibold">{displayName || user.email}</span> from{' '}
                <span className="font-semibold">{confirmRemove.name}</span>? They will lose access immediately.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-4">
              <button
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { doToggle(confirmRemove); setConfirmRemove(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Toggle to assign or remove this user from a hotel. Changes save immediately.
        </p>
      </div>

      {saveError && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="flex-shrink-0 text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tenants.map(tenant => {
              const assignment = getAssignment(tenant.id);
              const isAssigned = assignment?.active === true;
              const isSaving = saving === tenant.id;
              const isRoleSaving = saving === `role-${tenant.id}`;

              return (
                <div key={tenant.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: tenant.primary_color ?? '#2563eb' }}
                    >
                      {tenant.logo_url ? (
                        <img src={tenant.logo_url} alt={tenant.name} className="w-8 h-8 rounded-lg object-contain" />
                      ) : (
                        tenant.name.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tenant.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{tenant.subdomain}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAssigned && (
                        <select
                          value={assignment?.role ?? 'front_desk'}
                          onChange={e => handleRoleChange(tenant, e.target.value as AssignmentRole)}
                          disabled={isRoleSaving}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white disabled:opacity-50"
                        >
                          {ASSIGNMENT_ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={() => handleToggle(tenant)}
                        disabled={isSaving}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${isAssigned ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        {isSaving ? (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-3 h-3 animate-spin text-white" />
                          </span>
                        ) : (
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isAssigned ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                        )}
                      </button>
                    </div>
                  </div>
                  {isAssigned && (
                    <div className="ml-11 mt-1 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Assigned</span>
                    </div>
                  )}
                </div>
              );
            })}
            {tenants.length === 0 && (
              <div className="py-12 text-center">
                <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No hotels yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
