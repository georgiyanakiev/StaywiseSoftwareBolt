import { Navigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import { useAuth } from '../../contexts/AuthContext';
import ForbiddenPage from '../ui/ForbiddenPage';
import { ROLE_LABELS, type StaffRole } from '../../lib/permissions';

export default function RequireHotel() {
  const { session } = useActiveHotel();
  const { staff, canAccess, permissions } = useAuth();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();

  if (!session) {
    return <Navigate to="/lobby" replace state={{ from: location }} />;
  }

  if (slug && session.subdomain && slug !== session.subdomain) {
    return <Navigate to={`/h/${session.subdomain}`} replace />;
  }

  const role = (staff?.role ?? session?.role ?? 'front_desk') as StaffRole;
  const roleLabel = ROLE_LABELS[role] ?? role;

  const routePath = slug
    ? location.pathname.replace(`/h/${slug}`, '') || '/'
    : location.pathname;

  if (permissions !== null && !canAccess(routePath)) {
    return <ForbiddenPage role={roleLabel} />;
  }

  return <Outlet />;
}
