import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, SprayCan, GitBranch, CreditCard,
  FileText, Globe, Users, Settings, LogOut, Menu, X, ChevronDown,
  ArrowLeftRight, Building2, Shield, ArrowLeft, Receipt, BedDouble,
  ClipboardList, Wrench, BookOpen, Link2, Bell, BarChart3, Zap,
  Gift, MonitorSmartphone,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ROLE_LABELS, type StaffRole } from '../../lib/permissions';

/* ─── Types ─────────────────────────────────────────────────── */
interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

/* ─── Nav definitions ───────────────────────────────────────── */
const ROW2_GROUPS: NavItem[][] = [
  [
    { to: '/',             label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/front-desk',   label: 'Front Desk',   icon: ClipboardList },
    { to: '/reservations', label: 'Reservations', icon: CalendarCheck },
    { to: '/rooms',        label: 'Rooms',        icon: BedDouble },
  ],
  [
    { to: '/guests', label: 'Guests', icon: Users },
  ],
  [
    { to: '/housekeeping', label: 'Housekeeping', icon: SprayCan },
    { to: '/maintenance',  label: 'Maintenance',  icon: Wrench },
  ],
  [
    { to: '/reports', label: 'Reports', icon: BarChart3 },
  ],
];

const ROW3_GROUPS: NavItem[][] = [
  [
    { to: '/billing',            label: 'Billing',   icon: Receipt },
    { to: '/payment-automation', label: 'Payments',  icon: CreditCard },
    { to: '/invoicing',          label: 'Invoicing', icon: FileText },
  ],
  [
    { to: '/channel-manager', label: 'Channel Manager', icon: GitBranch },
    { to: '/booking-engine',  label: 'Booking Engine',  icon: Globe },
    { to: '/dynamic-pricing', label: 'Dynamic Pricing', icon: Zap },
    { to: '/upselling',       label: 'Upselling',       icon: Gift },
  ],
  [
    { to: '/guest-portal', label: 'Guest Portal', icon: MonitorSmartphone },
  ],
  [
    { to: '/settings', label: 'Settings',   icon: Settings },
    { to: '/guide',    label: 'User Guide', icon: BookOpen },
  ],
];

const CHANNELS: NavItem[] = [
  { to: '/booking-com', label: 'Booking.com', icon: Link2 },
  { to: '/expedia',     label: 'Expedia',     icon: Link2 },
  { to: '/cloudbeds',   label: 'Cloudbeds',   icon: Link2 },
  { to: '/siteminder',  label: 'SiteMinder',  icon: Link2 },
  { to: '/lodgify',     label: 'Lodgify',     icon: Link2 },
];

/* ─── Utilities ─────────────────────────────────────────────── */
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
    [location.pathname],
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

const dropdownShadow: React.CSSProperties = {
  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.12), 0 2px 6px -2px rgba(0,0,0,0.06)',
};

/* ─── Shared dropdown shell ─────────────────────────────────── */
function DropdownShell({ children, width = 200, left = false }: {
  children: React.ReactNode;
  width?: number;
  left?: boolean;
}) {
  return (
    <div
      className={`absolute top-full mt-1.5 bg-white border border-[#e2e8f0] rounded-lg py-1.5 z-[200]`}
      style={{ ...dropdownShadow, width, ...(left ? { left: 0 } : { right: 0 }) }}
    >
      {children}
    </div>
  );
}

function DropdownDivider() {
  return <div className="my-1 mx-2 border-t border-[#f1f5f9]" />;
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
        danger ? 'text-red-600 hover:bg-red-50' : 'text-[#374151] hover:bg-[#f9fafb]'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[#9ca3af]" />}
      <span>{label}</span>
    </button>
  );
}

/* ─── Row 1 sub-components ──────────────────────────────────── */
function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { lang, setLang } = useLanguage();
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 border border-[#334155] rounded-md text-[12px] text-[#94a3b8] hover:bg-[#334155] transition-colors whitespace-nowrap"
      >
        <Globe className="w-3 h-3 flex-shrink-0" />
        <span className="font-medium">{lang.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 text-[#64748b] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <DropdownShell width={130}>
          {(['en', 'bg'] as const).map(l => (
            <button
              key={l}
              onClick={() => { setLang(l); setOpen(false); }}
              className={`flex items-center gap-2 w-[calc(100%-8px)] mx-1 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                lang === l ? 'font-semibold text-[#3b82f6]' : 'text-[#374151] hover:bg-[#f9fafb]'
              }`}
            >
              <span className="text-[11px] font-bold w-5">{l.toUpperCase()}</span>
              <span className="text-[#6b7280]">{l === 'en' ? 'English' : 'Bulgarian'}</span>
            </button>
          ))}
        </DropdownShell>
      )}
    </div>
  );
}

function HotelSwitcherBtn({ brandColor, hotelName, hotelLogo }: {
  brandColor: string;
  hotelName: string;
  hotelLogo: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { clearActiveHotel } = useActiveHotel();
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 border border-[#334155] rounded-md text-[13px] text-[#e2e8f0] hover:bg-[#334155] transition-colors max-w-[180px]"
      >
        {hotelLogo ? (
          <img src={hotelLogo} alt={hotelName} className="w-[18px] h-[18px] rounded flex-shrink-0 object-contain" />
        ) : (
          <div
            className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {getInitials(hotelName)}
          </div>
        )}
        <span className="truncate max-w-[110px] font-medium">{hotelName}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 text-[#64748b] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <DropdownShell width={210}>
          <div className="px-3 py-2 border-b border-[#f1f5f9] mb-1">
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">Current Hotel</p>
            <p className="text-[13px] font-semibold text-[#111827] mt-0.5 truncate">{hotelName}</p>
          </div>
          <DropdownItem icon={ArrowLeftRight} label="Switch Hotel" onClick={() => { setOpen(false); clearActiveHotel(); }} />
        </DropdownShell>
      )}
    </div>
  );
}

function NotificationsBell({ dark }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-1.5 rounded-md transition-colors ${
          dark ? 'text-[#94a3b8] hover:text-white hover:bg-[#334155]' : 'text-[#94a3b8] hover:text-[#374151] hover:bg-[#f8fafc]'
        }`}
      >
        <Bell className="w-[18px] h-[18px]" />
      </button>
      {open && (
        <DropdownShell width={280}>
          <div className="px-3 py-2 border-b border-[#f1f5f9]">
            <p className="text-[13px] font-semibold text-[#111827]">Notifications</p>
          </div>
          <div className="px-3 py-4 text-center">
            <p className="text-[12px] text-[#94a3b8]">No new notifications</p>
          </div>
        </DropdownShell>
      )}
    </div>
  );
}

function UserAvatar({ brandColor, userRole, dark }: { brandColor: string; userRole: string | null; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { signOut, user } = useAuth();
  const { clearActiveHotel } = useActiveHotel();
  useClickOutside(ref, () => setOpen(false));

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';
  void dark;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center p-0.5 rounded-full transition-all hover:ring-2 hover:ring-offset-1 hover:ring-offset-[#1e293b]"
        style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)` }}
        >
          {initials}
        </div>
      </button>
      {open && (
        <DropdownShell width={220}>
          {user?.email && (
            <div className="px-3 py-2.5 border-b border-[#f1f5f9] mb-1">
              <p className="text-[13px] font-semibold text-[#111827] truncate">{user.email}</p>
              {userRole && (
                <p className="text-[11px] text-[#94a3b8] mt-0.5">
                  {ROLE_LABELS[userRole as StaffRole] ?? capitalize(userRole)}
                </p>
              )}
            </div>
          )}
          <DropdownItem icon={ArrowLeftRight} label="Switch Hotel" onClick={() => { setOpen(false); clearActiveHotel(); }} />
          <DropdownDivider />
          <DropdownItem icon={LogOut} label="Sign out" danger onClick={() => { setOpen(false); signOut(); }} />
        </DropdownShell>
      )}
    </div>
  );
}

/* ─── Row 2 link ────────────────────────────────────────────── */
function R2Link({ item, brandColor }: { item: NavItem; brandColor: string }) {
  const isActive = useIsActive();
  const active = isActive(item.to);

  return (
    <NavLink
      to={item.to}
      style={active ? { color: brandColor, backgroundColor: `${brandColor}14` } : undefined}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] whitespace-nowrap flex-shrink-0 transition-colors ${
        active ? 'font-medium' : 'text-[#64748b] hover:text-[#1e293b] hover:bg-[#f8fafc]'
      }`}
    >
      <item.icon className="w-[14px] h-[14px] flex-shrink-0 text-[#94a3b8]" />
      <span>{item.label}</span>
    </NavLink>
  );
}

/* ─── Row 3 link ────────────────────────────────────────────── */
function R3Link({ item, brandColor }: { item: NavItem; brandColor: string }) {
  const isActive = useIsActive();
  const active = isActive(item.to);

  return (
    <NavLink
      to={item.to}
      style={active ? { color: brandColor } : undefined}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-[5px] text-[12px] whitespace-nowrap flex-shrink-0 transition-colors ${
        active ? 'font-medium' : 'text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9]'
      }`}
    >
      <item.icon className="w-3 h-3 flex-shrink-0 text-[#cbd5e1]" />
      <span>{item.label}</span>
    </NavLink>
  );
}

/* ─── Row 3 separator ───────────────────────────────────────── */
function R3Sep() {
  return <div className="flex-shrink-0 w-px h-4 bg-[#e2e8f0] mx-1 self-center" />;
}

/* ─── Channels dropdown ─────────────────────────────────────── */
function ChannelsDropdown({ brandColor }: { brandColor: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { canAccess } = useAuth();
  useClickOutside(ref, () => setOpen(false));

  const visible = CHANNELS.filter(c => canAccess(c.to));
  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-[5px] text-[12px] text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] transition-colors whitespace-nowrap"
      >
        <Link2 className="w-3 h-3 flex-shrink-0 text-[#cbd5e1]" />
        <span>Channels</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <DropdownShell width={175} left>
          <div className="px-3 py-1.5 border-b border-[#f1f5f9] mb-1">
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">Connected channels</p>
          </div>
          {visible.map(ch => (
            <button
              key={ch.to}
              onClick={() => { navigate(ch.to); setOpen(false); }}
              className="flex items-center gap-2 w-[calc(100%-8px)] mx-1 px-2.5 py-1.5 rounded-md text-[13px] text-[#374151] hover:bg-[#f9fafb] transition-colors"
            >
              <Link2 className="w-3.5 h-3.5 flex-shrink-0 text-[#9ca3af]" />
              <span className="flex-1 text-left">{ch.label}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            </button>
          ))}
        </DropdownShell>
      )}
    </div>
  );
}

/* ─── Mobile drawer ─────────────────────────────────────────── */
const DRAWER_SECTIONS = [
  { label: 'DAILY', items: ROW2_GROUPS[0] },
  { label: 'GUESTS & STAFF', items: [...ROW2_GROUPS[1], ...ROW2_GROUPS[2]] },
  { label: 'ANALYTICS', items: ROW2_GROUPS[3] },
  { label: 'FINANCE', items: ROW3_GROUPS[0] },
  { label: 'CHANNELS & REVENUE', items: ROW3_GROUPS[1] },
  { label: 'GUEST EXPERIENCE', items: ROW3_GROUPS[2] },
  { label: 'ACCOUNT', items: ROW3_GROUPS[3] },
];

function MobileDrawer({ onClose, brandColor, hotelName, userRole }: {
  onClose: () => void;
  brandColor: string;
  hotelName: string;
  userRole: string | null;
}) {
  const isActive = useIsActive();
  const { signOut, user, canAccess } = useAuth();
  const { clearActiveHotel } = useActiveHotel();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[300] flex">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <aside className="relative z-10 w-72 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 flex-shrink-0 bg-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {getInitials(hotelName)}
            </div>
            <span className="text-sm font-bold text-white truncate max-w-[160px]">{hotelName}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#334155] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 bg-white overflow-y-auto">
          {DRAWER_SECTIONS.map(section => {
            const visible = section.items.filter(i => canAccess(i.to));
            const channels = section.label === 'CHANNELS & REVENUE' ? CHANNELS.filter(c => canAccess(c.to)) : [];

            if (visible.length === 0 && channels.length === 0) return null;
            return (
              <div key={section.label}>
                <p className="px-4 pt-4 pb-1.5 text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest">{section.label}</p>
                {visible.map(item => {
                  const active = isActive(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        active ? 'font-medium' : 'text-[#374151] hover:bg-[#f9fafb]'
                      }`}
                      style={active ? { color: brandColor, backgroundColor: `${brandColor}10` } : undefined}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0 text-[#94a3b8]" />
                      <span>{item.label}</span>
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: brandColor }} />}
                    </NavLink>
                  );
                })}
                {channels.length > 0 && (
                  <>
                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-[#cbd5e1] uppercase tracking-widest">Channels</p>
                    {channels.map(ch => (
                      <button
                        key={ch.to}
                        onClick={() => { navigate(ch.to); onClose(); }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors"
                      >
                        <Link2 className="w-4 h-4 flex-shrink-0 text-[#94a3b8]" />
                        <span>{ch.label}</span>
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="bg-white border-t border-[#e5e7eb] px-4 py-3 flex-shrink-0">
          {user?.email && (
            <p className="text-xs font-medium text-[#6b7280] truncate mb-2">{user.email}</p>
          )}
          {userRole && (
            <p className="text-[11px] text-[#94a3b8] mb-2">{ROLE_LABELS[userRole as StaffRole] ?? capitalize(userRole)}</p>
          )}
          <button
            onClick={() => { onClose(); clearActiveHotel(); }}
            className="flex items-center gap-2 text-sm font-medium text-[#6b7280] hover:text-[#1e293b] transition-colors mb-1.5 w-full"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" />
            Switch Hotel
          </button>
          <button
            onClick={() => { onClose(); signOut(); }}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors w-full"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ─── Main export ───────────────────────────────────────────── */
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
  const hotelName  = session?.hotelName ?? 'StayWise';
  const hotelLogo  = session?.hotelLogo ?? null;
  const plan       = session?.plan ?? null;
  const userRole   = session?.role ?? staff?.role ?? null;

  /* ── Lobby ── */
  if (variant === 'lobby') {
    return (
      <header className="sticky top-0 z-50 w-full h-[48px] bg-[#1e293b] flex items-center px-6">
        <button onClick={() => navigate('/lobby')} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColor }}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-white">StayWise</span>
        </button>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <UserAvatar brandColor={brandColor} userRole={userRole} dark />
        </div>
      </header>
    );
  }

  /* ── Super Admin ── */
  if (variant === 'superadmin') {
    return (
      <header className="sticky top-0 z-50 w-full h-[48px] bg-[#1e293b] flex items-center px-6 gap-4">
        <button
          onClick={() => navigate('/lobby')}
          className="flex items-center gap-1.5 text-[#94a3b8] hover:text-white text-[13px] font-medium transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Lobby</span>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-[34px] h-[34px] rounded-lg bg-red-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-white leading-tight">StayWise</p>
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider leading-none">Super Admin</p>
          </div>
        </div>
        <div className="ml-auto">
          <UserAvatar brandColor="#dc2626" userRole="super_admin" dark />
        </div>
      </header>
    );
  }

  /* ── Hotel (full 3-row) ── */
  const row2Visible = ROW2_GROUPS.map(g => g.filter(i => canAccess(i.to))).filter(g => g.length > 0);
  const row3Visible = ROW3_GROUPS.map(g => g.filter(i => canAccess(i.to))).filter(g => g.length > 0);
  const hasRow2 = row2Visible.length > 0;
  const hasRow3 = row3Visible.length > 0;

  return (
    <>
      <header className="sticky top-0 z-50 w-full">

        {/* ── ROW 1 — 48px dark identity bar ── */}
        <div className="bg-[#1e293b] h-[48px] flex items-center px-6 gap-3">

          {/* Left: hotel identity */}
          <div className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
            {hotelLogo ? (
              <img src={hotelLogo} alt={hotelName} className="w-9 h-9 rounded-lg object-contain flex-shrink-0" />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {getInitials(hotelName)}
              </div>
            )}
            <div className="min-w-0 hidden sm:block">
              <p className="text-[15px] font-semibold text-white leading-tight truncate max-w-[160px]">{hotelName}</p>
              <div className="flex items-center gap-1.5 mt-px">
                {plan && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none bg-[#3b82f6] text-white">
                    {plan.toUpperCase()}
                  </span>
                )}
                {userRole && (
                  <span className="text-[11px] text-[#94a3b8] leading-none">
                    {ROLE_LABELS[userRole as StaffRole] ?? capitalize(userRole)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: account actions */}
          <div className="ml-auto flex items-center gap-3 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2">
              <LanguageSwitcher />
              <HotelSwitcherBtn brandColor={brandColor} hotelName={hotelName} hotelLogo={hotelLogo} />
            </div>
            <NotificationsBell dark />
            <UserAvatar brandColor={brandColor} userRole={userRole} dark />
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[#94a3b8] hover:text-white hover:bg-[#334155] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── ROW 2 — 44px white primary nav ── */}
        {hasRow2 && (
          <div className="hidden lg:block bg-white border-b border-[#e2e8f0] h-[44px]">
            <div
              className="h-full flex items-center px-6 gap-0"
              style={{ flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none' }}
            >
              {row2Visible.map((group, gi) => (
                <div key={gi} className="flex items-center flex-shrink-0">
                  {gi > 0 && (
                    <div className="flex-shrink-0 w-px h-5 bg-[#e2e8f0] mx-2 self-center" />
                  )}
                  {group.map(item => (
                    <R2Link key={item.to} item={item} brandColor={brandColor} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ROW 3 — 38px light gray secondary nav ── */}
        {hasRow3 && (
          <div className="hidden lg:block bg-[#f8fafc] border-b border-[#e2e8f0] h-[38px]">
            <div
              className="h-full flex items-center px-6"
              style={{ flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none' }}
            >
              {/* Finance group */}
              {row3Visible[0]?.length > 0 && row3Visible[0].map(item => (
                <R3Link key={item.to} item={item} brandColor={brandColor} />
              ))}

              {/* Revenue/channels group */}
              {row3Visible[1]?.length > 0 && (
                <>
                  <R3Sep />
                  {row3Visible[1].map(item => (
                    <R3Link key={item.to} item={item} brandColor={brandColor} />
                  ))}
                </>
              )}

              {/* Guest Portal */}
              {row3Visible[2]?.length > 0 && (
                <>
                  <R3Sep />
                  {row3Visible[2].map(item => (
                    <R3Link key={item.to} item={item} brandColor={brandColor} />
                  ))}
                </>
              )}

              {/* Channels dropdown */}
              <R3Sep />
              <ChannelsDropdown brandColor={brandColor} />

              {/* Settings / User Guide pushed right */}
              {row3Visible[3]?.length > 0 && (
                <>
                  <div className="ml-auto flex items-center flex-shrink-0">
                    <R3Sep />
                    {row3Visible[3].map(item => (
                      <R3Link key={item.to} item={item} brandColor={brandColor} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {mobileOpen && (
        <MobileDrawer
          onClose={() => setMobileOpen(false)}
          brandColor={brandColor}
          hotelName={hotelName}
          userRole={userRole}
        />
      )}
    </>
  );
}
