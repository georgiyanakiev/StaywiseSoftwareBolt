import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, SprayCan,
  GitBranch, CreditCard, FileText, Globe,
  Users, Settings, LogOut, Menu, X, ChevronDown, ArrowLeftRight,
  Building2, Shield, ArrowLeft, Receipt, BedDouble, ClipboardList,
  Wrench, BookOpen, Link2, Bell, BarChart3,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ROLE_LABELS, type StaffRole } from '../../lib/permissions';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  items: NavItem[];
}

const ROW1_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/',             label: 'Dashboard',   icon: LayoutDashboard },
      { to: '/front-desk',   label: 'Front Desk',  icon: ClipboardList },
      { to: '/reservations', label: 'Reservations',icon: CalendarCheck },
      { to: '/rooms',        label: 'Rooms',       icon: BedDouble },
    ],
  },
  {
    items: [
      { to: '/housekeeping', label: 'Housekeeping', icon: SprayCan },
      { to: '/maintenance',  label: 'Maintenance',  icon: Wrench },
    ],
  },
  {
    items: [
      { to: '/channel-manager',    label: 'Channel Manager', icon: GitBranch },
      { to: '/booking-engine',     label: 'Booking Engine',  icon: Globe },
      { to: '/payment-automation', label: 'Payments',        icon: CreditCard },
      { to: '/billing',            label: 'Billing',         icon: Receipt },
    ],
  },
  {
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
];

const ROW2_LEFT: NavItem[] = [
  { to: '/guests',   label: 'Guests',    icon: Users },
  { to: '/invoicing',label: 'Invoicing', icon: FileText },
];

const ROW2_RIGHT: NavItem[] = [
  { to: '/settings', label: 'Settings',   icon: Settings },
  { to: '/guide',    label: 'User Guide', icon: BookOpen },
];

const CHANNELS: NavItem[] = [
  { to: '/booking-com', label: 'Booking.com', icon: Link2 },
  { to: '/expedia',     label: 'Expedia',     icon: Link2 },
  { to: '/cloudbeds',   label: 'Cloudbeds',   icon: Link2 },
  { to: '/siteminder',  label: 'SiteMinder',  icon: Link2 },
  { to: '/lodgify',     label: 'Lodgify',     icon: Link2 },
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

const dropdownStyle: React.CSSProperties = {
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05)',
};

function DropdownBase({ children, width = 180 }: { children: React.ReactNode; width?: number }) {
  return (
    <div
      className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-lg py-1.5 z-[100] animate-in"
      style={{ ...dropdownStyle, width }}
    >
      {children}
    </div>
  );
}

function DropdownItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon?: React.ElementType;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-[calc(100%-8px)] mx-1 px-2.5 py-1.5 rounded-md text-[13px] transition-colors text-left ${
        danger
          ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />}
      <span>{label}</span>
    </button>
  );
}

function LanguageSwitcher({ brandColor }: { brandColor: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { lang, setLang } = useLanguage();
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-md text-[12px] text-gray-500 hover:bg-gray-50 transition-colors whitespace-nowrap"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="font-medium">{lang.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <DropdownBase width={120}>
          {(['en', 'bg'] as const).map(l => (
            <button
              key={l}
              onClick={() => { setLang(l); setOpen(false); }}
              className={`flex items-center gap-2 w-[calc(100%-8px)] mx-1 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                lang === l ? 'font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={lang === l ? { color: brandColor } : undefined}
            >
              <span className="text-[11px] font-semibold w-5">{l.toUpperCase()}</span>
              <span className="text-gray-500">{l === 'en' ? 'English' : 'Bulgarian'}</span>
            </button>
          ))}
        </DropdownBase>
      )}
    </div>
  );
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
    <div ref={ref} className="relative hidden lg:block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors max-w-[160px]"
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
        <span className="truncate hidden xl:block max-w-[90px] font-medium">{hotelName}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <DropdownBase width={200}>
          <div className="px-3 py-2 border-b border-gray-100 mb-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Current Hotel</p>
            <p className="text-[13px] font-semibold text-gray-900 mt-0.5 truncate">{hotelName}</p>
          </div>
          <DropdownItem
            icon={ArrowLeftRight}
            label="Switch Hotel"
            onClick={() => { setOpen(false); clearActiveHotel(); }}
          />
        </DropdownBase>
      )}
    </div>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <DropdownBase width={280}>
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[13px] font-semibold text-gray-900">Notifications</p>
          </div>
          <div className="px-3 py-4 text-center">
            <p className="text-[12px] text-gray-400">No new notifications</p>
          </div>
        </DropdownBase>
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

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 p-0.5 rounded-full transition-all hover:ring-2 hover:ring-offset-1"
        style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white flex-shrink-0"
          style={{ backgroundColor: brandColor }}
        >
          {initials}
        </div>
      </button>

      {open && (
        <DropdownBase width={220}>
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
          <DropdownItem
            icon={ArrowLeftRight}
            label="Switch Hotel"
            onClick={() => { setOpen(false); clearActiveHotel(); }}
          />
          <div className="mx-2 my-1 border-t border-gray-100" />
          <DropdownItem
            icon={LogOut}
            label="Sign out"
            danger
            onClick={() => { setOpen(false); signOut(); }}
          />
        </DropdownBase>
      )}
    </div>
  );
}

function ChannelsDropdown({ brandColor }: { brandColor: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { canAccess } = useAuth();
  useClickOutside(ref, () => setOpen(false));

  const visibleChannels = CHANNELS.filter(c => canAccess(c.to));
  if (visibleChannels.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Link2 className="w-3 h-3" />
        <span>Channels</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <DropdownBase width={190}>
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Connected channels</p>
          </div>
          {visibleChannels.map(channel => (
            <button
              key={channel.to}
              onClick={() => { navigate(channel.to); setOpen(false); }}
              className="flex items-center gap-2 w-[calc(100%-8px)] mx-1 px-2.5 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
              <span className="flex-1 text-left">{channel.label}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            </button>
          ))}
        </DropdownBase>
      )}
    </div>
  );
}

function Row1NavLink({ item, brandColor }: { item: NavItem; brandColor: string }) {
  const isActive = useIsActive();
  const active = isActive(item.to);

  return (
    <NavLink
      to={item.to}
      className={`flex items-center gap-1 px-2.5 py-[5px] rounded-md text-[13px] transition-colors whitespace-nowrap flex-shrink-0 ${
        active ? 'font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
      }`}
      style={active ? { color: brandColor, backgroundColor: `${brandColor}14` } : undefined}
    >
      <item.icon className="w-[14px] h-[14px] flex-shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function Row2NavLink({ item, brandColor }: { item: NavItem; brandColor: string }) {
  const isActive = useIsActive();
  const active = isActive(item.to);

  return (
    <NavLink
      to={item.to}
      className={`flex items-center gap-1 px-2 py-[3px] rounded-[5px] text-[12px] transition-colors whitespace-nowrap flex-shrink-0 ${
        active ? 'font-medium' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
      style={active ? { color: brandColor } : undefined}
    >
      <item.icon className="w-3 h-3 flex-shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function MobileDrawer({ onClose, brandColor, userRole }: { onClose: () => void; brandColor: string; userRole: string | null }) {
  const isActive = useIsActive();
  const { signOut, user, canAccess, staff } = useAuth();
  const { session, clearActiveHotel } = useActiveHotel();
  const { lang, setLang } = useLanguage();
  const role = session?.role ?? staff?.role ?? userRole ?? null;
  const hotelName = session?.hotelName ?? 'StayWise';

  const allItems = [
    ...ROW1_GROUPS.flatMap(g => g.items),
    ...ROW2_LEFT,
    ...ROW2_RIGHT,
    ...CHANNELS,
  ].filter((item, idx, arr) => arr.findIndex(i => i.to === item.to) === idx);

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

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {allItems.filter(item => canAccess(item.to)).map(item => {
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

export type TopBarVariant = 'hotel' | 'lobby' | 'superadmin';

interface TopBarProps {
  variant?: TopBarVariant;
}

export default function TopBar({ variant = 'hotel' }: TopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session } = useActiveHotel();
  const { staff, canAccess } = useAuth();
  const navigate = useNavigate();

  const brandColor = session?.primaryColor ?? '#3b82f6';
  const hotelName = session?.hotelName ?? 'StayWise';
  const hotelLogo = session?.hotelLogo ?? null;
  const plan = session?.plan ?? null;
  const userRole = session?.role ?? staff?.role ?? null;

  if (variant === 'lobby') {
    return (
      <header className="sticky top-0 z-50 w-full h-[52px] bg-white border-b border-gray-200 flex items-center px-5">
        <button
          onClick={() => navigate('/lobby')}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColor }}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-[14px] font-semibold text-gray-900">StayWise</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher brandColor={brandColor} />
          <UserMenu brandColor={brandColor} userRole={userRole} />
        </div>
      </header>
    );
  }

  if (variant === 'superadmin') {
    return (
      <header className="sticky top-0 z-50 w-full h-[52px] bg-white border-b border-gray-200 flex items-center px-5 gap-3">
        <button
          onClick={() => navigate('/lobby')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-[13px] font-medium transition-colors mr-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Lobby</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-[34px] h-[34px] rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900 leading-tight">StayWise</p>
            <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider leading-none">Super Admin</p>
          </div>
        </div>
        <div className="ml-auto">
          <UserMenu brandColor="#dc2626" userRole="super_admin" />
        </div>
      </header>
    );
  }

  const row1Groups = ROW1_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => canAccess(item.to)),
  })).filter(g => g.items.length > 0);

  const row2Left = ROW2_LEFT.filter(item => canAccess(item.to));
  const row2Right = ROW2_RIGHT.filter(item => canAccess(item.to));
  const hasRow2 = row2Left.length > 0 || row2Right.length > 0;

  return (
    <>
      <header className="sticky top-0 z-50 w-full">
        {/* Row 1 — 52px, white */}
        <div className="bg-white border-b border-gray-200 h-[52px] flex items-center px-5 gap-3">
          {/* Hotel identity */}
          <div className="flex items-center gap-2 flex-shrink-0 mr-2">
            {hotelLogo ? (
              <img src={hotelLogo} alt={hotelName} className="w-[34px] h-[34px] rounded-lg object-contain flex-shrink-0" />
            ) : (
              <div
                className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {getInitials(hotelName)}
              </div>
            )}
            <div className="hidden sm:block min-w-0">
              <p className="text-[14px] font-semibold text-gray-900 leading-tight truncate max-w-[140px]">{hotelName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {plan && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none border"
                    style={{ backgroundColor: `${brandColor}12`, color: brandColor, borderColor: `${brandColor}40` }}
                  >
                    {plan.toUpperCase()}
                  </span>
                )}
                {userRole && (
                  <span className="text-[11px] text-gray-400 leading-none">
                    {ROLE_LABELS[userRole as StaffRole] ?? capitalize(userRole)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Vertical separator */}
          <div className="hidden lg:block w-px h-[18px] bg-gray-200 flex-shrink-0" />

          {/* Main nav groups — desktop */}
          <nav className="hidden lg:flex items-center flex-1 min-w-0">
            {row1Groups.map((group, gi) => (
              <div key={gi} className="flex items-center">
                {gi > 0 && (
                  <div className="w-px h-[18px] bg-gray-200 flex-shrink-0 mx-2" />
                )}
                <div className="flex items-center gap-0.5">
                  {group.items.map(item => (
                    <Row1NavLink key={item.to} item={item} brandColor={brandColor} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Right zone */}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher brandColor={brandColor} />
            <HotelSwitcherButton brandColor={brandColor} hotelName={hotelName} hotelLogo={hotelLogo} />
            <NotificationsBell />
            <UserMenu brandColor={brandColor} userRole={userRole} />
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Row 2 — 36px, gray-50 */}
        {hasRow2 && (
          <div className="hidden lg:flex bg-gray-50 border-b border-gray-200 h-[36px] items-center px-5 gap-2">
            {/* Left group */}
            <div className="flex items-center gap-0.5">
              {row2Left.map(item => (
                <Row2NavLink key={item.to} item={item} brandColor={brandColor} />
              ))}
            </div>

            {/* Channels dropdown */}
            <div className="w-px h-3.5 bg-gray-300 mx-1 flex-shrink-0" />
            <ChannelsDropdown brandColor={brandColor} />
            <div className="w-px h-3.5 bg-gray-300 mx-1 flex-shrink-0" />

            {/* Right group pushed to far right */}
            <div className="ml-auto flex items-center gap-0.5">
              {row2Right.map(item => (
                <Row2NavLink key={item.to} item={item} brandColor={brandColor} />
              ))}
            </div>
          </div>
        )}
      </header>

      {mobileOpen && <MobileDrawer onClose={() => setMobileOpen(false)} brandColor={brandColor} userRole={userRole} />}
    </>
  );
}
