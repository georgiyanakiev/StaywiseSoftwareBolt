import { Menu, Bell, Search } from 'lucide-react';
import { useHotel } from '../../contexts/HotelContext';
import { useTenant } from '../../contexts/TenantContext';
import { format } from 'date-fns';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { currentHotel } = useHotel();
  const { tenant } = useTenant();

  const brandColor = tenant?.primary_color ?? '#2563eb';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {currentHotel && (
              <p className="text-xs text-gray-500 hidden sm:block">
                {tenant?.name ?? currentHotel.name}
                {' '}&middot;{' '}
                {currentHotel.city}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
            <Search className="w-4 h-4" />
            <span>{format(new Date(), 'EEEE, MMM d, yyyy')}</span>
          </div>
          <button
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: brandColor }}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
