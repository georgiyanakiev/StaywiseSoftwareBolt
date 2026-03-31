import { Outlet, Navigate } from 'react-router-dom';
import TopNav from './TopNav';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';

export default function AppLayout() {
  const { session } = useActiveHotel();

  if (!session) {
    return <Navigate to="/lobby" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
