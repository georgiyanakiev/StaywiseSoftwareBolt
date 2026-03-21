import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, BedDouble, Users, Receipt,
  SprayCan, BarChart3, Settings, Building2, Bell, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHotel } from '../../contexts/HotelContext';
import { format } from 'date-fns';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reservations', icon: CalendarCheck, label: 'Reservations' },
  { to: '/rooms', icon: BedDouble, label: 'Rooms' },
  { to: '/guests', icon: Users, label: 'Guests' },
  { to: '/billing', icon: Receipt, label: 'Billing' },
  { to: '/housekeeping', icon: SprayCan, label: 'Housekeeping' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function TopNav() {
  const { signOut, staff } = useAuth();
  const { currentHotel } = useHotel();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
          <div className="flex items-center h-16 gap-6">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-bold text-gray-900 tracking-tight">StayWise</span>
                {currentHotel && (
                  <span className="ml-2 text-xs text-gray-400 font-medium hidden lg:inline">{currentHotel.name}</span>
                )}
              </div>
            </div>

            <div className="hidden lg:flex items-center h-full gap-1 flex-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap
                    ${isActive(item.to)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                  {isActive(item.to) && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </NavLink>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <div className="hidden md:flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-500 font-medium">
                <span>{format(new Date(), 'EEE, MMM d')}</span>
              </div>

              <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Bell className="w-4.5 h-4.5 w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
              </button>

              <button
                onClick={signOut}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Sign out</span>
              </button>

              {staff && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                      {staff.first_name[0]}{staff.last_name[0]}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold text-gray-900 leading-none">{staff.first_name} {staff.last_name}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{staff.role}</p>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-50 mb-1">
                          <p className="text-xs font-semibold text-gray-900">{staff.first_name} {staff.last_name}</p>
                          {currentHotel && <p className="text-xs text-gray-400 mt-0.5 truncate">{currentHotel.name}</p>}
                        </div>
                        <NavLink
                          to="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          Settings
                        </NavLink>
                        <button
                          onClick={() => { setUserMenuOpen(false); signOut(); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                  ${isActive(item.to)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <item.icon className="w-4.5 h-4.5 w-5 h-5 flex-shrink-0" />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => { setMobileOpen(false); signOut(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              Sign out
            </button>
          </div>
        )}
      </header>
    </>
  );
}
