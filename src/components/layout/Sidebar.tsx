import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, BedDouble, Users, Receipt,
  SprayCan, BarChart3, Settings, Building2, ChevronLeft, ChevronRight, LogOut, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHotel } from '../../contexts/HotelContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { signOut, staff } = useAuth();
  const { currentHotel } = useHotel();
  const { t, lang, setLang } = useLanguage();
  const location = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t.nav.dashboard },
    { to: '/reservations', icon: CalendarCheck, label: t.nav.reservations },
    { to: '/rooms', icon: BedDouble, label: t.nav.rooms },
    { to: '/guests', icon: Users, label: t.nav.guests },
    { to: '/billing', icon: Receipt, label: t.nav.billing },
    { to: '/housekeeping', icon: SprayCan, label: t.nav.housekeeping },
    { to: '/reports', icon: BarChart3, label: t.nav.reports },
    { to: '/settings', icon: Settings, label: t.nav.settings },
  ];

  const content = (
    <div className="flex flex-col h-full">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-5 border-b border-gray-100`}>
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && <span className="text-base font-semibold text-gray-900 truncate">StayWise</span>}
        </div>
        <button onClick={onMobileClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <button onClick={onToggle} className="hidden lg:flex p-1 text-gray-400 hover:text-gray-600">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && currentHotel && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{t.nav.property}</p>
          <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{currentHotel.name}</p>
        </div>
      )}

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onMobileClose}
            className={() => {
              const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
              return `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'} ${collapsed ? 'justify-center px-2' : ''}`;
            }}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        {!collapsed && (
          <div className="flex items-center gap-1 mb-3 px-3">
            <button
              onClick={() => setLang('en')}
              className={`flex-1 py-1 text-xs font-semibold rounded-l-md border transition-colors ${lang === 'en' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('bg')}
              className={`flex-1 py-1 text-xs font-semibold rounded-r-md border-t border-b border-r transition-colors ${lang === 'bg' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            >
              BG
            </button>
          </div>
        )}
        {!collapsed && staff && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-medium text-brand-700">
              {staff.first_name[0]}{staff.last_name[0]}
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-gray-900 truncate">{staff.first_name} {staff.last_name}</p>
              <p className="text-xs text-gray-500 capitalize">{staff.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={signOut}
          className={`sidebar-link sidebar-link-inactive w-full text-red-600 hover:text-red-700 hover:bg-red-50 ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{t.nav.signOut}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden" onClick={onMobileClose} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transition-all duration-200 lg:relative lg:z-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-16' : 'w-64'}`}>
        {content}
      </aside>
    </>
  );
}
