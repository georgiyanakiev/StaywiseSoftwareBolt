import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, BedDouble, Users, Receipt,
  SprayCan, BarChart3, Settings, Building2, Bell, LogOut, Menu, X, ChevronDown, BookOpen, ArrowLeftRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHotel } from '../../contexts/HotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import { format } from 'date-fns';

export default function TopNav() {
  const { signOut, staff } = useAuth();
  const { currentHotel } = useHotel();
  const { t, lang, setLang } = useLanguage();
  const { session } = useActiveHotel();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const brandColor = session?.primaryColor ?? '#2563eb';
  const hotelName = session?.hotelName ?? currentHotel?.name ?? 'StayWise';
  const hotelLogo = session?.hotelLogo ?? null;

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t.nav.dashboard },
    { to: '/reservations', icon: CalendarCheck, label: t.nav.reservations },
    { to: '/rooms', icon: BedDouble, label: t.nav.rooms },
    { to: '/guests', icon: Users, label: t.nav.guests },
    { to: '/billing', icon: Receipt, label: t.nav.billing },
    { to: '/housekeeping', icon: SprayCan, label: t.nav.housekeeping },
    { to: '/reports', icon: BarChart3, label: t.nav.reports },
    { to: '/settings', icon: Settings, label: t.nav.settings },
    { to: '/guide', icon: BookOpen, label: 'Guide' },
  ];

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  function getInitials(name: string) {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
          <div className="flex items-center h-16 gap-6">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {hotelLogo ? (
                <img
                  src={hotelLogo}
                  alt={hotelName}
                  className="w-8 h-8 rounded-lg object-contain"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: brandColor }}
                >
                  {session ? (
                    <span className="text-xs font-bold text-white leading-none">{getInitials(hotelName)}</span>
                  ) : (
                    <Building2 className="w-4 h-4 text-white" />
                  )}
                </div>
              )}
              <div className="hidden sm:block">
                <span className="text-base font-bold text-gray-900 tracking-tight">{hotelName}</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center h-full gap-1 flex-1">
              {navItems.map(item => {
                const active = isActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap
                      ${active ? 'bg-opacity-10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                    style={active ? { color: brandColor, backgroundColor: `${brandColor}14` } : undefined}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                        style={{ backgroundColor: brandColor }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <div className="hidden md:flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-500 font-medium">
                <span>{format(new Date(), 'EEE, MMM d')}</span>
              </div>

              <div className="hidden sm:flex items-center rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === 'en' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  style={lang === 'en' ? { backgroundColor: brandColor } : undefined}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('bg')}
                  className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === 'bg' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  style={lang === 'bg' ? { backgroundColor: brandColor } : undefined}
                >
                  BG
                </button>
              </div>

              <button
                onClick={() => navigate('/lobby')}
                title="Switch Hotel"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 hidden sm:flex"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span className="hidden md:inline">Switch Hotel</span>
              </button>

              <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
              </button>

              <button
                onClick={signOut}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">{t.nav.signOut}</span>
              </button>

              {staff && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: brandColor }}
                    >
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
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-50 mb-1">
                          <p className="text-xs font-semibold text-gray-900">{staff.first_name} {staff.last_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate capitalize">{staff.role}</p>
                          {session && (
                            <p className="text-xs mt-0.5 truncate font-medium" style={{ color: brandColor }}>{session.hotelName}</p>
                          )}
                        </div>
                        <button
                          onClick={() => { setUserMenuOpen(false); navigate('/lobby'); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                          Switch Hotel
                        </button>
                        <NavLink
                          to="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          {t.nav.settings}
                        </NavLink>
                        <button
                          onClick={() => { setUserMenuOpen(false); signOut(); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {t.nav.signOut}
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
            {navItems.map(item => {
              const active = isActive(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                    ${active ? '' : 'text-gray-700 hover:bg-gray-50'}`}
                  style={active ? { color: brandColor, backgroundColor: `${brandColor}14` } : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
            <button
              onClick={() => { setMobileOpen(false); navigate('/lobby'); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ArrowLeftRight className="w-5 h-5 flex-shrink-0" />
              Switch Hotel
            </button>
            <div className="flex items-center gap-1 px-3 pt-2">
              <button
                onClick={() => setLang('en')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-l-md border transition-colors ${lang === 'en' ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
                style={lang === 'en' ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
              >
                EN
              </button>
              <button
                onClick={() => setLang('bg')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-r-md border-t border-b border-r transition-colors ${lang === 'bg' ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
                style={lang === 'bg' ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
              >
                BG
              </button>
            </div>
            <button
              onClick={() => { setMobileOpen(false); signOut(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {t.nav.signOut}
            </button>
          </div>
        )}
      </header>
    </>
  );
}
