import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar variant="hotel" />
      <main className="flex-1 px-4 py-4 lg:px-6 lg:py-6">
        <Outlet />
      </main>
    </div>
  );
}
