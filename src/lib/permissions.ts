export type StaffRole = 'admin' | 'manager' | 'receptionist' | 'housekeeping';

export interface RoutePermission {
  path: string;
  allowedRoles: StaffRole[];
}

const ALL: StaffRole[] = ['admin', 'manager', 'receptionist', 'housekeeping'];
const MANAGEMENT: StaffRole[] = ['admin', 'manager'];
const FRONT_OF_HOUSE: StaffRole[] = ['admin', 'manager', 'receptionist'];
const ADMIN_ONLY: StaffRole[] = ['admin'];

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  { path: '/',                    allowedRoles: ALL },
  { path: '/front-desk',          allowedRoles: FRONT_OF_HOUSE },
  { path: '/reservations',        allowedRoles: FRONT_OF_HOUSE },
  { path: '/rooms',               allowedRoles: ALL },
  { path: '/guests',              allowedRoles: FRONT_OF_HOUSE },
  { path: '/billing',             allowedRoles: FRONT_OF_HOUSE },
  { path: '/housekeeping',        allowedRoles: ALL },
  { path: '/maintenance',         allowedRoles: ALL },
  { path: '/reports',             allowedRoles: MANAGEMENT },
  { path: '/settings',            allowedRoles: MANAGEMENT },
  { path: '/guide',               allowedRoles: ALL },
  { path: '/channel-manager',     allowedRoles: MANAGEMENT },
  { path: '/booking-engine',      allowedRoles: MANAGEMENT },
  { path: '/payment-automation',  allowedRoles: MANAGEMENT },
  { path: '/invoicing',           allowedRoles: MANAGEMENT },
  { path: '/booking-com',         allowedRoles: ADMIN_ONLY },
  { path: '/expedia',             allowedRoles: ADMIN_ONLY },
  { path: '/cloudbeds',           allowedRoles: ADMIN_ONLY },
  { path: '/siteminder',          allowedRoles: ADMIN_ONLY },
  { path: '/lodgify',             allowedRoles: ADMIN_ONLY },
];

export function getRoutePermission(pathname: string): RoutePermission | undefined {
  return ROUTE_PERMISSIONS.find(rp =>
    rp.path === '/'
      ? pathname === '/'
      : pathname === rp.path || pathname.startsWith(rp.path + '/')
  );
}

export function canAccess(role: string, pathname: string): boolean {
  const permission = getRoutePermission(pathname);
  if (!permission) return true;
  return (permission.allowedRoles as string[]).includes(role);
}
