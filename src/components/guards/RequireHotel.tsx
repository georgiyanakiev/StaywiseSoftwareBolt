import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import { useAuth } from '../../contexts/AuthContext';
import ForbiddenPage from '../ui/ForbiddenPage';
import { ROLE_LABELS, type StaffRole } from '../../lib/permissions';

export default function RequireHotel() {
  const { session } = useActiveHotel();
  const { staff, canAccess, permissions } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/lobby" replace state={{ from: location }} />;
  }

  const role = (staff?.role ?? session?.role ?? 'front_desk') as StaffRole;
  const roleLabel = ROLE_LABELS[role] ?? role;

  if (permissions !== null && !canAccess(location.pathname)) {
    return <ForbiddenPage role={roleLabel} />;
  }

  return <Outlet />;
}
