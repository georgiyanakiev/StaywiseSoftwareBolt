import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { useHotel } from '../../../contexts/HotelContext';
import { useToast } from '../../../components/ui/Toast';
import { supabase } from '../../../lib/supabase';
import {
  ALL_MODULES,
  MODULE_LABELS,
  ROLE_LABELS,
  DEFAULT_PERMISSIONS,
  type StaffRole,
  type ModuleKey,
  type ModulePermission,
} from '../../../lib/permissions';

const ROLES: StaffRole[] = ['owner', 'manager', 'front_desk', 'housekeeping', 'maintenance', 'accountant', 'readonly'];
const ACTIONS: (keyof ModulePermission)[] = ['can_view', 'can_create', 'can_edit', 'can_delete'];
const ACTION_LABELS: Record<keyof ModulePermission, string> = {
  can_view: 'View',
  can_create: 'Create',
  can_edit: 'Edit',
  can_delete: 'Delete',
};

type MatrixData = Record<StaffRole, Record<ModuleKey, ModulePermission>>;

interface Props {
  activeRole: StaffRole;
  onRoleChange: (role: StaffRole) => void;
}

export default function PermissionsMatrix({ activeRole, onRoleChange }: Props) {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [matrix, setMatrix] = useState<MatrixData>(() => {
    const m = {} as MatrixData;
    for (const role of ROLES) {
      m[role] = { ...DEFAULT_PERMISSIONS[role] };
    }
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFromDb = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('role_permissions')
        .select('role, module, can_view, can_create, can_edit, can_delete')
        .eq('hotel_id', currentHotel.id);

      if (data && data.length > 0) {
        const m = {} as MatrixData;
        for (const role of ROLES) {
          m[role] = { ...DEFAULT_PERMISSIONS[role] };
        }
        for (const row of data) {
          const role = row.role as StaffRole;
          const module = row.module as ModuleKey;
          if (m[role] && ALL_MODULES.includes(module)) {
            m[role][module] = {
              can_view: row.can_view,
              can_create: row.can_create,
              can_edit: row.can_edit,
              can_delete: row.can_delete,
            };
          }
        }
        setMatrix(m);
      }
    } finally {
      setLoading(false);
    }
  }, [currentHotel]);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  const toggle = (module: ModuleKey, action: keyof ModulePermission) => {
    setMatrix(prev => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [module]: {
          ...prev[activeRole][module],
          [action]: !prev[activeRole][module][action],
        },
      },
    }));
  };

  const resetRole = () => {
    setMatrix(prev => ({
      ...prev,
      [activeRole]: { ...DEFAULT_PERMISSIONS[activeRole] },
    }));
  };

  const savePermissions = async () => {
    if (!currentHotel) return;
    setSaving(true);
    try {
      const rows = ALL_MODULES.map(module => ({
        hotel_id: currentHotel.id,
        role: activeRole,
        module,
        ...matrix[activeRole][module],
      }));

      const { error } = await supabase
        .from('role_permissions')
        .upsert(rows, { onConflict: 'hotel_id,role,module' });

      if (error) throw new Error(error.message);
      toast('success', `Permissions saved for ${ROLE_LABELS[activeRole]}`);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Permissions Matrix</h3>
          <p className="text-sm text-gray-500 mt-0.5">Configure what each role can do in each module</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetRole}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to defaults
          </button>
          <button
            onClick={savePermissions}
            disabled={saving}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {ROLES.map(role => (
          <button
            key={role}
            onClick={() => onRoleChange(role)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeRole === role
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading permissions...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600 w-48">Module</th>
                {ACTIONS.map(a => (
                  <th key={a} className="text-center py-3 px-3 font-medium text-gray-600 w-20">
                    {ACTION_LABELS[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ALL_MODULES.map((module, i) => (
                <tr key={module} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                  <td className="py-2.5 px-4 font-medium text-gray-700">{MODULE_LABELS[module]}</td>
                  {ACTIONS.map(action => {
                    const checked = matrix[activeRole]?.[module]?.[action] ?? false;
                    const isDisabled = activeRole === 'owner';
                    return (
                      <td key={action} className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => !isDisabled && toggle(module, action)}
                          disabled={isDisabled}
                          title={isDisabled ? 'Owner always has full access' : ''}
                          className={`w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors ${
                            checked
                              ? 'bg-[#1e3a5f] text-white'
                              : 'bg-white border-2 border-gray-300 hover:border-blue-400'
                          } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                          {checked && (
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
