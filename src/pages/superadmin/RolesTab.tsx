import { useState, Fragment } from 'react';
import { Shield, Eye, Plus, Pencil, Trash2, Crown, Briefcase, ConciergeBell, Wrench, Calculator, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ALL_MODULES,
  MODULE_LABELS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_BADGE_COLORS,
  DEFAULT_PERMISSIONS,
  type StaffRole,
  type ModuleKey,
  type ModulePermission,
} from '../../lib/permissions';

const ROLES: StaffRole[] = ['owner', 'manager', 'front_desk', 'housekeeping', 'accountant', 'readonly'];

const ROLE_ICONS: Record<StaffRole, React.ReactNode> = {
  admin:        <Shield className="w-4 h-4" />,
  owner:        <Crown className="w-4 h-4" />,
  manager:      <Briefcase className="w-4 h-4" />,
  front_desk:   <ConciergeBell className="w-4 h-4" />,
  housekeeping: <Wrench className="w-4 h-4" />,
  maintenance:  <Wrench className="w-4 h-4" />,
  accountant:   <Calculator className="w-4 h-4" />,
  readonly:     <Lock className="w-4 h-4" />,
};

const ROLE_GRADIENT: Record<StaffRole, string> = {
  admin:        'from-red-500 to-red-600',
  owner:        'from-amber-500 to-orange-500',
  manager:      'from-blue-500 to-blue-600',
  front_desk:   'from-sky-500 to-cyan-500',
  housekeeping: 'from-emerald-500 to-teal-500',
  maintenance:  'from-orange-500 to-orange-600',
  accountant:   'from-cyan-500 to-cyan-600',
  readonly:     'from-gray-400 to-gray-500',
};

const ROLE_BG: Record<StaffRole, string> = {
  admin:        'bg-red-50 border-red-200',
  owner:        'bg-amber-50 border-amber-200',
  manager:      'bg-blue-50 border-blue-200',
  front_desk:   'bg-sky-50 border-sky-200',
  housekeeping: 'bg-emerald-50 border-emerald-200',
  maintenance:  'bg-orange-50 border-orange-200',
  accountant:   'bg-cyan-50 border-cyan-200',
  readonly:     'bg-gray-50 border-gray-200',
};

const MODULE_GROUPS: { label: string; modules: ModuleKey[] }[] = [
  { label: 'Operations',    modules: ['dashboard', 'front_desk', 'reservations', 'rooms', 'guests'] },
  { label: 'Housekeeping',  modules: ['housekeeping', 'maintenance'] },
  { label: 'Finance',       modules: ['billing', 'payments', 'invoicing', 'reports'] },
  { label: 'Guest Experience', modules: ['guest_portal', 'upselling'] },
  { label: 'Revenue',       modules: ['channel_manager', 'booking_engine', 'dynamic_pricing'] },
  { label: 'Management',    modules: ['owner_portal', 'settings'] },
];

function PermCell({ perm, showAll }: { perm: ModulePermission; showAll: boolean }) {
  if (!perm.can_view) {
    return (
      <div className="flex items-center justify-center">
        <span className="text-gray-300 text-lg font-light select-none">—</span>
      </div>
    );
  }

  if (!showAll) {
    const level = perm.can_delete ? 'full' : perm.can_create && perm.can_edit ? 'edit' : 'view';
    const map = {
      full:  { label: 'Full', cls: 'bg-green-100 text-green-700 border border-green-200' },
      edit:  { label: 'Edit', cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
      view:  { label: 'View', cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
    };
    const { label, cls } = map[level];
    return (
      <div className="flex justify-center">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cls}`}>{label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-0.5">
      <ActionDot active={perm.can_view}   title="View"   color="text-gray-400" icon={<Eye className="w-3 h-3" />} />
      <ActionDot active={perm.can_create} title="Create" color="text-blue-500"  icon={<Plus className="w-3 h-3" />} />
      <ActionDot active={perm.can_edit}   title="Edit"   color="text-amber-500" icon={<Pencil className="w-3 h-3" />} />
      <ActionDot active={perm.can_delete} title="Delete" color="text-red-500"   icon={<Trash2 className="w-3 h-3" />} />
    </div>
  );
}

function ActionDot({ active, title, color, icon }: { active: boolean; title: string; color: string; icon: React.ReactNode }) {
  return (
    <div title={active ? title : `No ${title.toLowerCase()} access`}
      className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
        active ? `${color} bg-white border border-current/20` : 'text-gray-200 bg-gray-50'
      }`}
    >
      {icon}
    </div>
  );
}

function RoleCard({ role }: { role: StaffRole }) {
  const [expanded, setExpanded] = useState(false);
  const perms = DEFAULT_PERMISSIONS[role];
  const fullCount  = ALL_MODULES.filter(m => perms[m]?.can_create && perms[m]?.can_edit).length;
  const viewCount  = ALL_MODULES.filter(m => perms[m]?.can_view && !(perms[m]?.can_create)).length;
  const noneCount  = ALL_MODULES.filter(m => !perms[m]?.can_view).length;

  return (
    <div className={`border rounded-xl overflow-hidden ${ROLE_BG[role]}`}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_GRADIENT[role]} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
            {ROLE_ICONS[role]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${ROLE_BADGE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5 leading-snug">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="text-center bg-white/70 rounded-lg py-1.5">
            <p className="text-base font-bold text-green-600">{fullCount}</p>
            <p className="text-[10px] text-gray-500 font-medium">Full Access</p>
          </div>
          <div className="text-center bg-white/70 rounded-lg py-1.5">
            <p className="text-base font-bold text-blue-600">{viewCount}</p>
            <p className="text-[10px] text-gray-500 font-medium">View Only</p>
          </div>
          <div className="text-center bg-white/70 rounded-lg py-1.5">
            <p className="text-base font-bold text-gray-400">{noneCount}</p>
            <p className="text-[10px] text-gray-500 font-medium">No Access</p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Hide modules</> : <><ChevronDown className="w-3 h-3" /> Show modules</>}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-current/10 bg-white/50 px-4 pb-4 pt-3 space-y-3">
          {MODULE_GROUPS.map(group => {
            const visible = group.modules.filter(m => perms[m]?.can_view);
            if (visible.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{group.label}</p>
                <div className="flex flex-wrap gap-1">
                  {group.modules.map(m => {
                    const p = perms[m];
                    if (!p?.can_view) return (
                      <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 line-through">
                        {MODULE_LABELS[m]}
                      </span>
                    );
                    const isFull = p.can_create && p.can_edit;
                    return (
                      <span key={m} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isFull ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {MODULE_LABELS[m]}
                        {isFull && ' ✓'}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RolesTab() {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Role Permission Levels</h2>
          <p className="text-sm text-gray-500 mt-0.5">Default permissions for each role across all modules</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setView('cards')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'cards' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'table' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {view === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map(role => <RoleCard key={role} role={role} />)}
        </div>
      )}

      {view === 'table' && (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
              <div
                onClick={() => setShowActions(a => !a)}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors cursor-pointer ${showActions ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${showActions ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              Show detailed actions
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 w-44 sticky left-0 bg-gray-50 z-10">Module</th>
                  {ROLES.map(role => (
                    <th key={role} className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${ROLE_GRADIENT[role]} text-white flex items-center justify-center mx-auto`}>
                          {ROLE_ICONS[role]}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{ROLE_LABELS[role]}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_GROUPS.map(group => (
                  <Fragment key={group.label}>
                    <tr className="bg-gray-50/60">
                      <td colSpan={ROLES.length + 1} className="px-4 py-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.label}</span>
                      </td>
                    </tr>
                    {group.modules.map((module, i) => (
                      <tr key={module} className={`border-t border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'} hover:bg-blue-50/20 transition-colors`}>
                        <td className="py-2.5 px-4 font-medium text-gray-700 text-xs sticky left-0 bg-inherit">{MODULE_LABELS[module]}</td>
                        {ROLES.map(role => (
                          <td key={role} className="py-2 px-2">
                            <PermCell perm={DEFAULT_PERMISSIONS[role][module]} showAll={showActions} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {!showActions && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="inline-block w-10 text-center bg-green-100 text-green-700 border border-green-200 rounded-md px-1 py-0.5 text-[10px] font-semibold">Full</span> Create, edit &amp; delete</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-10 text-center bg-blue-100 text-blue-700 border border-blue-200 rounded-md px-1 py-0.5 text-[10px] font-semibold">Edit</span> View, create &amp; edit</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-10 text-center bg-gray-100 text-gray-600 border border-gray-200 rounded-md px-1 py-0.5 text-[10px] font-semibold">View</span> Read-only access</span>
              <span className="flex items-center gap-1.5"><span className="inline-block text-gray-300 font-light">—</span> No access</span>
            </div>
          )}
          {showActions && (
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Eye className="w-3 h-3 text-gray-400" /> View</span>
              <span className="flex items-center gap-1.5"><Plus className="w-3 h-3 text-blue-500" /> Create</span>
              <span className="flex items-center gap-1.5"><Pencil className="w-3 h-3 text-amber-500" /> Edit</span>
              <span className="flex items-center gap-1.5"><Trash2 className="w-3 h-3 text-red-500" /> Delete</span>
              <span className="flex items-center gap-1.5"><span className="text-gray-200">icon</span> = no access</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
