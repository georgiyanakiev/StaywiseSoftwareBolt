export type StaffRole =
  | 'admin'
  | 'owner'
  | 'manager'
  | 'front_desk'
  | 'housekeeping'
  | 'maintenance'
  | 'accountant'
  | 'readonly';

export type ModuleKey =
  | 'dashboard'
  | 'front_desk'
  | 'reservations'
  | 'rooms'
  | 'guests'
  | 'billing'
  | 'housekeeping'
  | 'maintenance'
  | 'reports'
  | 'settings'
  | 'channel_manager'
  | 'booking_engine'
  | 'payments'
  | 'invoicing'
  | 'guest_portal'
  | 'owner_portal'
  | 'dynamic_pricing'
  | 'upselling';

export interface ModulePermission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export type PermissionsMap = Partial<Record<ModuleKey, ModulePermission>>;

export const ROUTE_TO_MODULE: Record<string, ModuleKey> = {
  '/':                   'dashboard',
  '/front-desk':         'front_desk',
  '/reservations':       'reservations',
  '/rooms':              'rooms',
  '/guests':             'guests',
  '/billing':            'billing',
  '/housekeeping':       'housekeeping',
  '/maintenance':        'maintenance',
  '/reports':            'reports',
  '/settings':           'settings',
  '/settings/staff':     'settings',
  '/channel-manager':    'channel_manager',
  '/booking-engine':     'booking_engine',
  '/payment-automation': 'payments',
  '/invoicing':          'invoicing',
  '/invoicing/settings': 'invoicing',
  '/guest-portal':       'guest_portal',
  '/owner-portal':       'owner_portal',
  '/owner-portal/my-portal': 'owner_portal',
  '/dynamic-pricing':    'dynamic_pricing',
  '/upselling':          'upselling',
  '/booking-com':        'settings',
  '/expedia':            'settings',
  '/cloudbeds':          'settings',
  '/siteminder':         'settings',
  '/lodgify':            'settings',
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin:        'Admin',
  owner:        'Owner',
  manager:      'Manager',
  front_desk:   'Front Desk',
  housekeeping: 'Housekeeping',
  maintenance:  'Maintenance',
  accountant:   'Accountant',
  readonly:     'Read Only',
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  admin:        'Full access to all features, settings, and staff management.',
  owner:        'Full access to all features, settings, and staff management.',
  manager:      'Full operational access. Can manage staff but cannot delete critical settings.',
  front_desk:   'Manages reservations, check-ins, guests, and billing. View-only for reports.',
  housekeeping: 'Full access to housekeeping and maintenance tasks. View-only for rooms.',
  maintenance:  'Full access to maintenance requests. View-only for housekeeping dashboard.',
  accountant:   'Full access to payments, invoicing, and reports. View-only for reservations.',
  readonly:     'View-only access to all modules. Cannot create, edit, or delete anything.',
};

export const ROLE_BADGE_COLORS: Record<StaffRole, string> = {
  admin:        'bg-red-100 text-red-700',
  owner:        'bg-red-100 text-red-700',
  manager:      'bg-amber-100 text-amber-700',
  front_desk:   'bg-blue-100 text-blue-700',
  housekeeping: 'bg-emerald-100 text-emerald-700',
  maintenance:  'bg-orange-100 text-orange-700',
  accountant:   'bg-cyan-100 text-cyan-700',
  readonly:     'bg-gray-100 text-gray-600',
};

export const ALL_MODULES: ModuleKey[] = [
  'dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing',
  'housekeeping', 'maintenance', 'reports', 'settings', 'channel_manager',
  'booking_engine', 'payments', 'invoicing', 'guest_portal', 'owner_portal', 'dynamic_pricing', 'upselling',
];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard:       'Dashboard',
  front_desk:      'Front Desk',
  reservations:    'Reservations',
  rooms:           'Rooms',
  guests:          'Guests',
  billing:         'Billing',
  housekeeping:    'Housekeeping',
  maintenance:     'Maintenance',
  reports:         'Reports',
  settings:        'Settings',
  channel_manager: 'Channel Manager',
  booking_engine:  'Booking Engine',
  payments:        'Payments',
  invoicing:       'Invoicing',
  guest_portal:    'Digital Check-in',
  owner_portal:    'Owner Portal',
  dynamic_pricing: 'Dynamic Pricing',
  upselling:       'Upselling',
};

function makePerms(full: ModuleKey[], view: ModuleKey[]): Record<ModuleKey, ModulePermission> {
  return ALL_MODULES.reduce((acc, m) => {
    if (full.includes(m)) {
      acc[m] = { can_view: true, can_create: true, can_edit: true, can_delete: false };
    } else if (view.includes(m)) {
      acc[m] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
    } else {
      acc[m] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
    }
    return acc;
  }, {} as Record<ModuleKey, ModulePermission>);
}

export const DEFAULT_PERMISSIONS: Record<StaffRole, Record<ModuleKey, ModulePermission>> = {
  admin: ALL_MODULES.reduce((acc, m) => {
    acc[m] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
    return acc;
  }, {} as Record<ModuleKey, ModulePermission>),

  owner: ALL_MODULES.reduce((acc, m) => {
    acc[m] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
    return acc;
  }, {} as Record<ModuleKey, ModulePermission>),

  manager: ALL_MODULES.reduce((acc, m) => {
    acc[m] = {
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: !['settings', 'payments'].includes(m),
    };
    return acc;
  }, {} as Record<ModuleKey, ModulePermission>),

  front_desk: makePerms(
    ['dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing', 'guest_portal'],
    ['housekeeping', 'maintenance', 'reports', 'invoicing', 'channel_manager', 'booking_engine']
  ),

  housekeeping: makePerms(
    ['housekeeping', 'maintenance'],
    ['dashboard', 'rooms']
  ),

  maintenance: makePerms(
    ['maintenance', 'housekeeping'],
    ['dashboard']
  ),

  accountant: makePerms(
    ['payments', 'invoicing', 'billing', 'reports'],
    ['dashboard', 'reservations', 'rooms', 'guests']
  ),

  readonly: ALL_MODULES.reduce((acc, m) => {
    acc[m] = m !== 'settings'
      ? { can_view: true, can_create: false, can_edit: false, can_delete: false }
      : { can_view: false, can_create: false, can_edit: false, can_delete: false };
    return acc;
  }, {} as Record<ModuleKey, ModulePermission>),
};

export function getModuleForPath(pathname: string): ModuleKey | undefined {
  const exact = ROUTE_TO_MODULE[pathname];
  if (exact) return exact;
  for (const [route, module] of Object.entries(ROUTE_TO_MODULE)) {
    if (route !== '/' && pathname.startsWith(route + '/')) return module;
  }
  return undefined;
}

export function canAccessPath(permissions: PermissionsMap | null, pathname: string): boolean {
  if (!permissions) return false;
  const module = getModuleForPath(pathname);
  if (!module) return true;
  return permissions[module]?.can_view ?? false;
}

export function hasPerm(
  permissions: PermissionsMap | null,
  module: ModuleKey,
  action: keyof ModulePermission
): boolean {
  if (!permissions) return false;
  return permissions[module]?.[action] ?? false;
}
