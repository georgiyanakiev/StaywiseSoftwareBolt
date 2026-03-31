import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, SprayCan, GitBranch, CreditCard,
  FileText, Globe, TrendingUp, ShoppingBag, QrCode, BarChart3,
  Users, Settings, LogOut, Menu, X, ChevronDown, ArrowLeftRight,
  Building2, Shield, ArrowLeft, Receipt, BedDouble, ClipboardList,
  Wrench, KeyRound, UserCog, BookOpen, Link2, Bell,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ROLE_LABELS, DEFAULT_PERMISSIONS, canAccessPath, type StaffRole } from '../../lib/permissions';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const ROW1_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reservations', label: 'Reservations', icon: CalendarCheck },
  { to: '/housekeeping', label: 'Housekeeping', icon: SprayCan },
];

const ROW2_NAV: NavItem[] = [
  { to: '/channel-manager', label: 'Channel Manager', icon: GitBranch },
  { to: '/payment-automation', label: 'Payments', icon: CreditCard },
  { to: '/invoicing', label: 'Invoicing', icon: FileText },
  { to: '/booking-engine', label: 'Booking Engine', icon: Globe },
  { to: '/dynamic-pricing', label: 'Dynamic Pricing', icon: TrendingUp },
  { to: '/upselling', label: 'Upselling', icon: ShoppingBag },
  { to: '/guest-portal', label: 'Guest Portal', icon: QrCode },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/guests', label: 'Guests', icon: Users },
];

interface MobileSection {
  label: string;
  items: NavItem[];
}

const MOBILE_SECTIONS: MobileSection[] = [
  {
    label: 'Daily',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/reservations', label: 'Reservations', icon: CalendarCheck },
      { to: '/housekeeping', label: 'Housekeeping', icon: SprayCan },
      { to: '/front-desk', label: 'Front Desk', icon: ClipboardList },
      { to: '/rooms', label: 'Rooms', icon: BedDouble },
      { to: '/maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/channel-manager', label: 'Channel Manager', icon: GitBranch },
      { to: '/payment-automation', label: 'Payments', icon: CreditCard },
      { to: '/invoicing', label: 'Invoicing', icon: FileText },
      { to: '/billing', label: 'Billing', icon: Receipt },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { to: '/booking-engine', label: 'Booking Engine', icon: Globe },
      { to: '/dynamic-pricing', label: 'Dynamic Pricing', icon: TrendingUp },
      { to: '/upselling', label: 'Upselling', icon: ShoppingBag },
    ],
  },
  {
    label: 'Guests',
    items: [
      { to: '/guest-portal', label: 'Guest Portal', icon: QrCode },
      { to: '/guests', label: 'Guest Profiles', icon: Users },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/owner-portal', label: 'Owner Portal', icon: KeyRound },
      { to: '/settings/staff', label: 'Staff & Roles', icon: UserCog },
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/booking-com', label: 'Booking.com', icon: Link2 },
      { to: '/expedia', label: 'Expedia', icon: Link2 },
      { to: '/cloudbeds', label: 'Cloudbeds', icon: Link2 },
      { to: '/siteminder', label: 'SiteMinder', icon: Link2 },
      { to: '/lodgify', label: 'Lodgify', icon: Link2 },
      { to: '/guide', label: 'User Guide', icon: BookOpen },
    ],
  },
];

const ROW2_GROUPS = [
  ['/channel-manager', '/payment-automation', '/invoicing'],
  ['/booking-engine', '/dynamic-pricing', '/upselling'],
  ['/guest-portal', '/reports', '/guests'],
];

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function useIsActive() {
  const location = useLocation();
  return useCallback(
    (to: string) =>
      to === '/'
        ? location.pathname === '/'
        : location.pathname === to || location.pathname.startsWith(to + '/'),
    [location.pathname]
  );
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

function filterByRole(items: NavItem[], role: string | null): NavItem[] {
  if (!role) return items;
  if (role === 'super_admin') return items;
  const perms = DEFAULT_PERMISSIONS[role as StaffRole];
  if (!perms) return items;
  return items.filter(item => canAccessPath(perms, item.to));
}

function HotelSwitcherButton({ brandColor, hotelName, hotelLogo }: { brandColor: string; hotelName: string; hotelLogo: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { clearActiveHotel } = useActiveHotel();
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 transition-colors max-w-[160px]"
      >
        {hotelLogo ? (
          <img src={hotelLogo} alt={hotelName} className="w-5 h-5 rounded flex-shrink-0 object-contain" />
        ) : (
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {getInitials(hotelName)}
          </div>
        )}
        <span className="truncate hidden xl:block">{hotelName}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-900/8 py-1.5 z-50">
          <div className="px-3 py-2 border-b border-gray-100 mb-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Current Hotel</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{hotelName}</p>
          </div>
          <button
            onClick={() => { setOpen(false); clearActiveHotel(); }}
            className="flex items-center gap-2 w-[calc(100%-8px)] mx-1 px-3 py-2 rounded-lg text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
            Switch Hotel
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationsBell({ brandColor }: { brandColor: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-900/8 py-1.5 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
          </div>
          <div className="px-3 py-4 text-center">
            <p className="text-[13px] text-gray-400">No new notifications</p>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ brandColor, userRole }: { brandColor: string; userRole: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { signOut, user } = useAuth();
  const { clearActiveHotel } = useActiveHotel();
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 p-1 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: brandColor }}
        >
          {initials}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-900/8 py-1.5 z-50">
          {user?.email && (
            <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{user.email}</p>
              {userRole && (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {ROLE_LABELS[userRole as StaffRole] ?? capitalize(userRole)}
                </p>
              )}
            </div>
          )}
          <button
            onClick={() => { setOpen(false); clearActiveHotel(); }}
            className="flex items-center gap-2 w-[calc(100%-8px)] mx-1 px-3 py-2 rounded-lg text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
            Switch Hotel
          </button>
          <div className="mx-2 my-1 border-t border-gray-100" />
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="flex items-center gap-2 w-[calc(100%-8px)] mx-1 px-3 py-2 rounded-lg text-[13px] text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileDrawer({ onClose, brandColor, userRole }: { onClose: () => void; brandColor: string; userRole: string | null }) {
  const isActive = useIsActive();
  const { signOut, user } = useAuth();
  const { session, clearActiveHotel } = useActiveHotel();
  const { lang, setLang } = useLanguage();
  const { staff } = useAuth();
  const role = session?.role ?? staff?.role ?? userRole ?? null;
  const hotelName = session?.hotelName ?? 'StayWise';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <aside className="relative z-10 w-72 h-full bg-white flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {getInitials(hotelName)}
            </div>
            <span className="text-sm font-bold text-gray-900 truncate max-w-[160px]">{hotelName}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-3">
          {MOBILE_SECTIONS.map(section => {
            const visibleItems = filterByRole(section.items, role);
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label} className="mb-3">
                <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const active = isActive(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          active ? 'font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        style={active ? { color: brandColor, backgroundColor: `${brandColor}18` } : undefined}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: brandColor }} />}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 px-2 py-3 space-y-1">
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden mb-2 mx-1">
            <button
              onClick={() => setLang('en')}
              className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${lang === 'en' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              style={lang === 'en' ? { backgroundColor: brandColor } : undefined}
            >EN</button>
            <button
              onClick={() => setLang('bg')}
              className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${lang === 'bg' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              style={lang === 'bg' ? { backgroundColor: brandColor } : undefined}
            >BG</button>
          </div>
          {user?.email && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: brandColor }}>
                {user.email.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 truncate">{user.email}</p>
                {role && <p className="text-[11px] text-gray-400">{ROLE_LABELS[role as StaffRole] ?? capitalize(role)}</p>}
              </div>
            </div>
          )}
          <button
            onClick={() => { onClose(); clearActiveHotel(); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
            Switch Hotel
          </button>
          <button
            onClick={() => { onClose(); signOut(); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </div>
  );
}

function SecondaryNav({ brandColor, userRole }: { brandColor: string; userRole: string | null }) {
  const isActive = useIsActive();
  const visibleItems = filterByRole(ROW2_NAV, userRole);

  if (visibleItems.length === 0) return null;

  const groupEnds = new Set<string>();
  ROW2_GROUPS.forEach(group => {
    const last = [...group].reverse().find(to => visibleItems.some(i => i.to === to));
    if (last) groupEnds.add(last);
  });

  return (
    <div className="w-full h-10 bg-gray-50 border-b border-gray-200/70 hidden lg:flex items-center px-4 lg:px-6 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-0.5 min-w-max">
        {visibleItems.map((item, idx) => {
          const active = isActive(item.to);
          const isGroupEnd = groupEnds.has(item.to) && idx < visibleItems.length - 1;
          return (
            <div key={item.to} className="flex items-center">
              <NavLink
                to={item.to}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap ${
                  active ? '' : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                }`}
                style={active ? { color: brandColor, backgroundColor: `${brandColor}18`, fontWeight: 500 } : undefined}
              >
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
              {isGroupEnd && (
                <span className="mx-1.5 text-gray-300 text-[10px] select-none">·</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type TopBarVariant = 'hotel' | 'lobby' | 'superadmin';

interface TopBarProps {
  variant?: TopBarVariant;
}

export default function TopBar({ variant = 'hotel' }: TopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session } = useActiveHotel();
  const { staff } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const isActive = useIsActive();

  const brandColor = session?.primaryColor ?? '#2563eb';
  const hotelName = session?.hotelName ?? 'StayWise';
  const hotelLogo = session?.hotelLogo ?? null;
  const plan = session?.plan ?? null;
  const userRole = session?.role ?? staff?.role ?? null;

  if (variant === 'lobby') {
    return (
      <header className="sticky top-0 z-50 w-full h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6">
        <button
          onClick={() => navigate('/lobby')}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColor }}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900">StayWise</span>
        </button>
        <div className="ml-auto">
          <UserMenu brandColor={brandColor} userRole={userRole} />
        </div>
      </header>
    );
  }

  if (variant === 'superadmin') {
    return (
      <header className="sticky top-0 z-50 w-full h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-3">
        <button
          onClick={() => navigate('/lobby')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors mr-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Lobby</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">StayWise</p>
            <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider leading-none">Super Admin</p>
          </div>
        </div>
        <div className="ml-auto">
          <UserMenu brandColor="#dc2626" userRole="super_admin" />
        </div>
      </header>
    );
  }

  const row1Items = filterByRole(ROW1_NAV, userRole);

  return (
    <>
      <div className="sticky top-0 z-40 w-full">
        {/* Row 1 */}
        <header className="w-full h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-2">
          {/* Brand / Hotel identity */}
          <div className="flex items-center gap-2 flex-shrink-0 mr-1">
            {hotelLogo ? (
              <img src={hotelLogo} alt={hotelName} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {getInitials(hotelName)}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-tight truncate max-w-[140px]">{hotelName}</p>
              <div className="flex items-center gap-1">
                {plan && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-white px-1 py-0.5 rounded leading-none" style={{ backgroundColor: brandColor }}>
                    {plan}
                  </span>
                )}
                {userRole && (
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-1 py-0.5 rounded leading-none">
                    {capitalize(userRole)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Row 1 nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0">
            {row1Items.map(item => {
              const active = isActive(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                    active ? '' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={active ? { color: brandColor, backgroundColor: `${brandColor}18` } : undefined}
                >
                  <item.icon className="w-[15px] h-[15px] flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right zone */}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            {/* Language toggle */}
            <div className="hidden lg:flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-semibold transition-colors ${lang === 'en' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                style={lang === 'en' ? { backgroundColor: brandColor } : undefined}
              >EN</button>
              <button
                onClick={() => setLang('bg')}
                className={`px-2.5 py-1 text-xs font-semibold transition-colors ${lang === 'bg' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                style={lang === 'bg' ? { backgroundColor: brandColor } : undefined}
              >BG</button>
            </div>

            <HotelSwitcherButton brandColor={brandColor} hotelName={hotelName} hotelLogo={hotelLogo} />
            <NotificationsBell brandColor={brandColor} />
            <UserMenu brandColor={brandColor} userRole={userRole} />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Row 2 — secondary nav (desktop only) */}
        <SecondaryNav brandColor={brandColor} userRole={userRole} />
      </div>

      {mobileOpen && <MobileDrawer onClose={() => setMobileOpen(false)} brandColor={brandColor} userRole={userRole} />}
    </>
  );
}
