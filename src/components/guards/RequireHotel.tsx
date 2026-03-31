import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import { useAuth } from '../../contexts/AuthContext';
import { canAccess } from '../../lib/permissions';
import ForbiddenPage from '../ui/ForbiddenPage';

export default function RequireHotel() {
  const { session } = useActiveHotel();
  const { staff } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/lobby" replace state={{ from: location }} />;
  }

  const role = staff?.role ?? session.role;

  if (!canAccess(role, location.pathname)) {
    return <ForbiddenPage role={role} />;
  }

  return <Outlet />;
}
