import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, SprayCan, QrCode,
  GitBranch, Globe, TrendingUp, ShoppingBag,
  CreditCard, FileText, BarChart3,
  Users, Settings, Building2, ChevronLeft, ChevronRight, LogOut, X, BookOpen,
  Link2, UserCog, KeyRound, ClipboardList, Wrench, BedDouble,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHotel } from '../../contexts/HotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTenant } from '../../contexts/TenantContext';
import { ROLE_LABELS, type StaffRole } from '../../lib/permissions';

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

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/front-desk', icon: ClipboardList, label: 'Front Desk' },
      { to: '/reservations', icon: CalendarCheck, label: 'Reservations' },
      { to: '/rooms', icon: BedDouble, label: 'Rooms' },
      { to: '/housekeeping', icon: SprayCan, label: 'Housekeeping' },
      { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
      { to: '/guest-portal', icon: QrCode, label: 'Guest Portal' },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { to: '/channel-manager', icon: GitBranch, label: 'Channel Manager' },
      { to: '/booking-engine', icon: Globe, label: 'Booking Engine' },
      { to: '/dynamic-pricing', icon: TrendingUp, label: 'Dynamic Pricing' },
      { to: '/upselling', icon: ShoppingBag, label: 'Upselling' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/payment-automation', icon: CreditCard, label: 'Payments' },
      { to: '/billing', icon: FileText, label: 'Invoicing & Billing' },
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'Guests',
    items: [
      { to: '/guests', icon: Users, label: 'Guest Profiles' },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { to: '/booking-com', icon: Link2, label: 'Booking.com' },
      { to: '/expedia', icon: Link2, label: 'Expedia' },
      { to: '/cloudbeds', icon: Link2, label: 'Cloudbeds' },
      { to: '/siteminder', icon: Link2, label: 'SiteMinder' },
      { to: '/lodgify', icon: Link2, label: 'Lodgify' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings/staff', icon: UserCog, label: 'Staff & Roles' },
      { to: '/owner-portal', icon: KeyRound, label: 'Owner Portal' },
      { to: '/settings', icon: Settings, label: 'General' },
      { to: '/guide', icon: BookOpen, label: 'User Guide' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { signOut, staff, canAccess } = useAuth();
  const { currentHotel } = useHotel();
  const { lang, setLang } = useLanguage();
  const { tenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();

  const brandColor = tenant?.primary_color ?? '#1e3a5f';
  const displayName = tenant?.name ?? 'StayWise PMS';

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname === to || location.pathname.startsWith(to + '/');

  const renderNavItem = (item: NavItem) => {
    if (!canAccess(item.to)) return null;
    const active = isActive(item.to);
    return (
      <NavLink
        key={item.to}
        to={item.to}
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
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
          title="Back to dashboard"
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
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Property</p>
          <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{currentHotel.name}</p>
        </div>
      )}

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => canAccess(item.to));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{group.label}</p>
              )}
              {collapsed && <div className="my-1.5 border-t border-gray-100" />}
              <div className="space-y-0.5">
                {visibleItems.map(renderNavItem)}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-2 pb-4 border-t border-gray-100 pt-3">
        {!collapsed && (
          <div className="flex items-center gap-0.5 mb-3 px-1">
            <button onClick={() => setLang('en')} className={`flex-1 py-1 text-xs font-semibold rounded-l-md border transition-colors ${lang === 'en' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>EN</button>
            <button onClick={() => setLang('bg')} className={`flex-1 py-1 text-xs font-semibold rounded-r-md border-t border-b border-r transition-colors ${lang === 'bg' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>BG</button>
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
          {!collapsed && <span>Sign Out</span>}
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
