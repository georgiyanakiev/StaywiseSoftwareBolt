import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, BedDouble, Users, Receipt,
  SprayCan, BarChart3, Settings, Building2, LogOut, Menu, X,
  BookOpen, ArrowLeftRight, ClipboardList, Wrench, GitBranch,
  Globe, CreditCard, FileText, Link2, ChevronLeft, ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import { useHotelPath } from '../../hooks/useHotelPath';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

interface SidebarInnerProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
  mobile?: boolean;
}

function SidebarInner({ collapsed, onToggle, onClose, mobile }: SidebarInnerProps) {
  const { signOut, user, staff } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { session, clearActiveHotel } = useActiveHotel();
  const location = useLocation();
  const { basePath, hotelPath } = useHotelPath();
  const [integrationsOpen, setIntegrationsOpen] = useState(false);

  const brandColor = session?.primaryColor ?? '#2563eb';
  const hotelName = session?.hotelName ?? 'StayWise';
  const hotelLogo = session?.hotelLogo ?? null;
  const plan = session?.plan ?? null;
  const userRole = session?.role ?? staff?.role ?? null;

  const navItems: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: t.navigation.dashboard },
    { to: '/front-desk', icon: ClipboardList, label: 'Front Desk' },
    { to: '/reservations', icon: CalendarCheck, label: t.navigation.reservations },
    { to: '/rooms', icon: BedDouble, label: t.navigation.rooms },
    { to: '/guests', icon: Users, label: t.navigation.guests },
    { to: '/billing', icon: Receipt, label: t.navigation.billing },
    { to: '/housekeeping', icon: SprayCan, label: t.navigation.housekeeping },
    { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
    { to: '/reports', icon: BarChart3, label: t.navigation.reports },
  ];

  const operationsItems: NavItem[] = [
    { to: '/channel-manager', icon: GitBranch, label: 'Channel Manager' },
    { to: '/booking-engine', icon: Globe, label: 'Booking Engine' },
    { to: '/payment-automation', icon: CreditCard, label: 'Payments' },
    { to: '/invoicing', icon: FileText, label: 'Invoicing' },
  ];

  const integrationItems: NavItem[] = [
    { to: '/booking-com', icon: Link2, label: 'Booking.com' },
    { to: '/expedia', icon: Link2, label: 'Expedia' },
    { to: '/cloudbeds', icon: Link2, label: 'Cloudbeds' },
    { to: '/siteminder', icon: Link2, label: 'SiteMinder' },
    { to: '/lodgify', icon: Link2, label: 'Lodgify' },
  ];

  const bottomItems: NavItem[] = [
    { to: '/settings', icon: Settings, label: t.navigation.settings },
    { to: '/guide', icon: BookOpen, label: 'User Guide' },
  ];

  const isActive = (to: string) => {
    const fullTo = hotelPath(to);
    const dashPath = basePath || '/';
    return fullTo === dashPath
      ? location.pathname === dashPath || location.pathname === dashPath + '/'
      : location.pathname === fullTo || location.pathname.startsWith(fullTo + '/');
  };

  const handleNavClick = () => {
    if (mobile && onClose) onClose();
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.to);
    return (
      <NavLink
        key={item.to}
        to={hotelPath(item.to)}
        onClick={handleNavClick}
        title={collapsed ? item.label : undefined}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          collapsed ? 'justify-center px-2' : ''
        } ${active ? '' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        style={active ? { color: brandColor, backgroundColor: `${brandColor}12` } : undefined}
      >
        <item.icon className="w-4.5 h-4.5 w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {active && !collapsed && (
          <span
            className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: brandColor }}
          />
        )}
      </NavLink>
    );
  };

  const renderSectionLabel = (label: string) =>
    !collapsed ? (
      <p className="px-3 pt-5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    ) : (
      <div className="my-2 mx-2 border-t border-gray-100" />
    );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Hotel Identity Block ─────────────────────────── */}
      <div className={`px-4 pt-5 pb-4 border-b border-gray-100 ${collapsed ? 'px-2' : ''}`}>
        <div className={`flex items-start ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {/* Logo / initials */}
          {hotelLogo ? (
            <img
              src={hotelLogo}
              alt={hotelName}
              className="w-10 h-10 rounded-xl object-contain flex-shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              {session ? (
                <span className="text-sm font-bold text-white leading-none">{getInitials(hotelName)}</span>
              ) : (
                <Building2 className="w-5 h-5 text-white" />
              )}
            </div>
          )}

          {!collapsed && (
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{hotelName}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {plan && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide text-white leading-none"
                    style={{ backgroundColor: brandColor }}
                  >
                    {plan}
                  </span>
                )}
                {userRole && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 leading-none">
                    {capitalize(userRole)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle (desktop) */}
        {!mobile && (
          <button
            onClick={onToggle}
            className={`mt-3 flex items-center justify-center w-full py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-xs gap-1 ${collapsed ? 'px-2' : 'px-3'}`}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></>}
          </button>
        )}
      </div>

      {/* ── Nav Items ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
        {navItems.map(renderNavItem)}

        {renderSectionLabel('Operations')}
        {operationsItems.map(renderNavItem)}

        {/* Integrations collapsible */}
        {!collapsed ? (
          <>
            <button
              onClick={() => setIntegrationsOpen(o => !o)}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <Link2 className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="truncate flex-1 text-left">Integrations</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${integrationsOpen ? 'rotate-180' : ''}`} />
            </button>
            {integrationsOpen && (
              <div className="pl-2">
                {integrationItems.map(renderNavItem)}
              </div>
            )}
          </>
        ) : (
          <>
            {renderSectionLabel('Int.')}
            {integrationItems.map(renderNavItem)}
          </>
        )}

        <div className="pt-1">
          {bottomItems.map(renderNavItem)}
        </div>
      </nav>

      {/* ── Bottom: Switch Hotel / User / Logout ─────────── */}
      <div className="border-t border-gray-100 px-2 py-3 space-y-1">
        {/* Language toggle */}
        {!collapsed && (
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden mb-2 mx-1">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${language === 'en' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              style={language === 'en' ? { backgroundColor: brandColor } : undefined}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('bg')}
              className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${language === 'bg' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              style={language === 'bg' ? { backgroundColor: brandColor } : undefined}
            >
              BG
            </button>
          </div>
        )}

        {/* Switch Hotel */}
        <button
          onClick={() => { handleNavClick(); clearActiveHotel(); }}
          title={collapsed ? 'Switch Hotel' : undefined}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <ArrowLeftRight className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Switch Hotel</span>}
        </button>

        {/* User email */}
        {!collapsed && user?.email && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {user.email[0].toUpperCase()}
            </div>
            <p className="text-xs text-gray-500 truncate flex-1">{user.email}</p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => { handleNavClick(); signOut(); }}
          title={collapsed ? t.navigation.signOut : undefined}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>{t.navigation.signOut}</span>}
        </button>
      </div>
    </div>
  );
}

export default function TopNav() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session } = useActiveHotel();
  const brandColor = session?.primaryColor ?? '#2563eb';
  const navigate = useNavigate();
  const { hotelPath } = useHotelPath();

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 shadow-sm">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate(hotelPath('/'))}
          className="text-sm font-bold text-gray-900 truncate max-w-[180px]"
        >
          {session?.hotelName ?? 'StayWise'}
        </button>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: brandColor }}
        >
          {session ? (
            <span className="text-xs font-bold text-white leading-none">
              {session.hotelName.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </span>
          ) : (
            <Building2 className="w-4 h-4 text-white" />
          )}
        </div>
      </div>

      {/* ── Mobile drawer overlay ────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-72 h-full shadow-2xl">
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarInner
              collapsed={false}
              onToggle={() => {}}
              onClose={() => setMobileOpen(false)}
              mobile
            />
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 border-r border-gray-100 transition-all duration-200 overflow-hidden ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarInner
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        />
      </aside>
    </>
  );
}
