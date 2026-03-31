import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <TopNav />
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto">
        <main className="flex-1">
          <div className="p-4 lg:p-6 max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
