import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, Loader2, Building2, AlertCircle, X, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AdminUser, Tenant, HotelAssignment, AssignmentRole } from './types';
import { ASSIGNMENT_ROLES } from './types';
import {
  DEFAULT_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  ROLE_BADGE_COLORS,
  ALL_MODULES,
  MODULE_LABELS,
  type StaffRole,
} from '../../lib/permissions';

const ROLE_ACCESS_SUMMARY: Record<AssignmentRole, { full: string[]; view: string[] }> = (() => {
  const result = {} as Record<AssignmentRole, { full: string[]; view: string[] }>;
  const roles: AssignmentRole[] = ['owner', 'manager', 'front_desk', 'housekeeping', 'accountant', 'readonly'];
  for (const role of roles) {
    const perms = DEFAULT_PERMISSIONS[role as StaffRole];
    if (!perms) { result[role] = { full: [], view: [] }; continue; }
    result[role] = {
      full: ALL_MODULES.filter(m => perms[m]?.can_create && perms[m]?.can_edit).map(m => MODULE_LABELS[m]),
      view: ALL_MODULES.filter(m => perms[m]?.can_view && !(perms[m]?.can_create)).map(m => MODULE_LABELS[m]),
    };
  }
  return result;
})();

function RoleTooltip({ role, onClose }: { role: AssignmentRole; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const summary = ROLE_ACCESS_SUMMARY[role];
  const desc = ROLE_DESCRIPTIONS[role as StaffRole];
  const badge = ROLE_BADGE_COLORS[role as StaffRole];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-7 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${badge}`}>
          {ASSIGNMENT_ROLES.find(r => r.value === role)?.label}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-gray-500 leading-snug mb-2">{desc}</p>

      {summary.full.length > 0 && (
        <div className="mb-2">
          <p className="font-semibold text-gray-700 mb-1">Full access ({summary.full.length})</p>
          <div className="flex flex-wrap gap-1">
            {summary.full.map(m => (
              <span key={m} className="px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 font-medium">{m}</span>
            ))}
          </div>
        </div>
      )}

      {summary.view.length > 0 && (
        <div>
          <p className="font-semibold text-gray-700 mb-1">View only ({summary.view.length})</p>
          <div className="flex flex-wrap gap-1">
            {summary.view.map(m => (
              <span key={m} className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">{m}</span>
            ))}
          </div>
        </div>
      )}

      {summary.full.length === 0 && summary.view.length === 0 && (
        <p className="text-gray-400 italic">No module access</p>
      )}
    </div>
  );
}

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
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);
  const db = supabase;

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

    const newActive = existing ? !existing.active : true;
    const role = (existing?.role ?? 'front_desk') as AssignmentRole;

    const { error } = await db.rpc('set_user_tenant_access', {
      p_user_id: user.id,
      p_tenant_id: tenant.id,
      p_role: role,
      p_active: newActive,
    });

    if (error) {
      setSaveError(`Failed to update assignment for ${tenant.name}. Please try again.`);
    } else {
      if (existing) {
        setAssignments(prev => prev.map(a => a.id === existing.id ? { ...a, active: newActive, role } : a));
      } else {
        setAssignments(prev => [...prev, {
          id: crypto.randomUUID(),
          user_id: user.id,
          tenant_id: tenant.id,
          role,
          active: true,
        } as HotelAssignment]);
      }
      onToast(newActive ? `Assigned to ${tenant.name}` : `Removed from ${tenant.name}`);
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

    const { error } = await db.rpc('set_user_tenant_access', {
      p_user_id: user.id,
      p_tenant_id: tenant.id,
      p_role: role,
      p_active: existing.active,
    });

    if (error) {
      setSaveError('Failed to update role. Please try again.');
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
          <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
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
                        <div className="relative flex items-center gap-1">
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
                          <button
                            type="button"
                            onClick={() => setOpenTooltip(prev => prev === tenant.id ? null : tenant.id)}
                            className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                            title="View role permissions"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          {openTooltip === tenant.id && (
                            <RoleTooltip
                              role={(assignment?.role ?? 'front_desk') as AssignmentRole}
                              onClose={() => setOpenTooltip(null)}
                            />
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => handleToggle(tenant)}
                        disabled={isSaving}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${isAssigned ? 'bg-[#1e3a5f]' : 'bg-gray-200'}`}
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
