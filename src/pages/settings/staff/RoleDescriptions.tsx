import { ShieldCheck, Users } from 'lucide-react';
import {
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_BADGE_COLORS,
  DEFAULT_PERMISSIONS,
  ALL_MODULES,
  MODULE_LABELS,
  type StaffRole,
} from '../../../lib/permissions';

const ROLES: StaffRole[] = ['owner', 'manager', 'front_desk', 'housekeeping', 'maintenance', 'accountant', 'readonly'];

export default function RoleDescriptions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" />
        <div>
          <h3 className="text-base font-semibold text-gray-900">Role Reference Guide</h3>
          <p className="text-sm text-gray-500">What each role can access by default</p>
        </div>
      </div>

      <div className="grid gap-3">
        {ROLES.map(role => {
          const perms = DEFAULT_PERMISSIONS[role];
          const accessibleModules = ALL_MODULES.filter(m => perms[m]?.can_view);
          const fullAccessModules = ALL_MODULES.filter(m => perms[m]?.can_create && perms[m]?.can_edit);

          return (
            <div key={role} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ROLE_BADGE_COLORS[role]}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE_COLORS[role]}`}>
                      {ROLE_LABELS[role]}
                    </span>
                    <p className="text-sm text-gray-600 mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {accessibleModules.map(m => (
                  <span
                    key={m}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      fullAccessModules.includes(m)
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {fullAccessModules.includes(m) && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {MODULE_LABELS[m]}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Blue = full access &nbsp;&middot;&nbsp; Gray = view only
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
