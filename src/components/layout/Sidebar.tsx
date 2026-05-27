import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, SprayCan, QrCode,
  GitBranch, Globe, TrendingUp, ShoppingBag,
  CreditCard, FileText, BarChart3,
  Users, Settings, Building2, ChevronLeft, ChevronRight, LogOut, X, BookOpen,
  UserCog, KeyRound, ClipboardList, Wrench, BedDouble,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHotel } from '../../contexts/HotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTenant } from '../../contexts/TenantContext';
import { ROLE_LABELS, type StaffRole } from '../../lib/permissions';
import { useHotelPath } from '../../hooks/useHotelPath';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { signOut, staff, canAccess } = useAuth();
  const { currentHotel } = useHotel();
  const { language, setLanguage, t } = useLanguage();
  const { tenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const { basePath, hotelPath } = useHotelPath();

  const brandColor = tenant?.primary_color ?? '#1e3a5f';
  const displayName = tenant?.name ?? 'StayWise PMS';

  const navItems: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: t.navigation.dashboard },
    { to: '/front-desk', icon: ClipboardList, label: t.navigation.frontDesk },
    { to: '/reservations', icon: CalendarCheck, label: t.navigation.reservations },
    { to: '/rooms', icon: BedDouble, label: t.navigation.rooms },
    { to: '/housekeeping', icon: SprayCan, label: t.navigation.housekeeping },
    { to: '/maintenance', icon: Wrench, label: t.navigation.maintenance },
    { to: '/guest-portal', icon: QrCode, label: t.navigation.guestPortal },
    { to: '/channel-manager', icon: GitBranch, label: t.navigation.channelManager },
    { to: '/booking-engine', icon: Globe, label: t.navigation.bookingEngine },
    { to: '/dynamic-pricing', icon: TrendingUp, label: t.navigation.dynamicPricing },
    { to: '/upselling', icon: ShoppingBag, label: t.navigation.upselling },
    { to: '/payment-automation', icon: CreditCard, label: t.navigation.payments },
    { to: '/billing', icon: FileText, label: t.navigation.billing },
    { to: '/reports', icon: BarChart3, label: t.navigation.reports },
    { to: '/guests', icon: Users, label: t.navigation.guests },
    { to: '/settings/staff', icon: UserCog, label: t.common.add },
    { to: '/owner-portal', icon: KeyRound, label: t.navigation.superAdmin },
    { to: '/settings', icon: Settings, label: t.navigation.settings },
    { to: '/guide', icon: BookOpen, label: t.navigation.userGuide },
  ];

  const isActive = (to: string) => {
    const fullTo = hotelPath(to);
    return fullTo === basePath
      ? location.pathname === basePath || location.pathname === basePath + '/'
      : location.pathname === fullTo || location.pathname.startsWith(fullTo + '/');
  };

  const renderNavItem = (item: NavItem) => {
    if (!canAccess(item.to)) return null;
    const active = isActive(item.to);
    return (
      <NavLink
        key={item.to}
        to={hotelPath(item.to)}
        onClick={onMobileClose}
        className={() =>
          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            active ? 'font-medium' : 'text-gray-900 hover:bg-gray-50 hover:text-black'
          } ${collapsed ? 'justify-center px-2' : ''}`
        }
        style={active ? { color: brandColor, backgroundColor: `${brandColor}14` } : undefined}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  };

  const content = (
    <div className="flex flex-col h-full">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-4 border-b border-gray-100`}>
        <button
          onClick={() => navigate(hotelPath('/'))}
          className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
          title={language === 'bg' ? 'Обратно към таблото' : 'Back to dashboard'}
        >
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={displayName} className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: brandColor }}>
              <Building2 className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && <span className="text-sm font-semibold text-gray-900 truncate">{displayName}</span>}
        </button>
        <button onClick={onMobileClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        <button onClick={onToggle} className="hidden lg:flex p-1 text-gray-400 hover:text-gray-600">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && currentHotel && (
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{language === 'bg' ? 'Обект' : 'Property'}</p>
          <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{currentHotel.name}</p>
        </div>
      )}

      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1">
        {navItems.map(renderNavItem)}
      </nav>

      <div className="px-2 pb-4 border-t border-gray-100 pt-3">
        {!collapsed && (
          <div className="flex items-center gap-0.5 mb-3 px-1">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-l-md border transition-colors ${
                language === 'en'
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('bg')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-r-md border-t border-b border-r transition-colors ${
                language === 'bg'
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              БГ
            </button>
          </div>
        )}
        {!collapsed && staff && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-lg bg-gray-50">
            <div className="w-7 h-7 rounded-full bg-[#eef3f9] flex items-center justify-center text-xs font-bold text-[#1e3a5f] flex-shrink-0">
              {staff.first_name[0]}{staff.last_name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 truncate">{staff.first_name} {staff.last_name}</p>
              <p className="text-xs text-gray-400">{ROLE_LABELS[staff.role as StaffRole] ?? staff.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={signOut}
          className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{language === 'bg' ? 'Изход' : 'Sign Out'}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden" onClick={onMobileClose} />}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transition-all duration-200 lg:relative lg:z-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'w-14' : 'w-60'}`}>
        {content}
      </aside>
    </>
  );
}
