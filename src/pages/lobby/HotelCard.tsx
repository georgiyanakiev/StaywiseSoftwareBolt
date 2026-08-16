import { ArrowRight } from 'lucide-react';
import type { LobbyHotel } from './useLobbyData';

interface HotelCardProps {
  hotel: LobbyHotel;
  onEnter: (hotel: LobbyHotel) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  receptionist: 'Front Desk',
  housekeeping: 'Housekeeping',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-rose-50 text-rose-700 border-rose-100',
  manager: 'bg-blue-50 text-blue-700 border-blue-100',
  receptionist: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  housekeeping: 'bg-amber-50 text-amber-700 border-amber-100',
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-600 border-gray-200',
  pro: 'bg-blue-50 text-blue-700 border-blue-100',
  enterprise: 'bg-slate-800 text-slate-100 border-slate-700',
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function lightenColor(hex: string, amount = 0.9): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr}, ${lg}, ${lb})`;
}

export default function HotelCard({ hotel, onEnter }: HotelCardProps) {
  const primaryColor = hotel.tenant?.primary_color ?? '#1a56db';
  const plan = hotel.tenant?.plan ?? 'starter';
  const subdomain = hotel.tenant?.subdomain;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer group"
      onClick={() => onEnter(hotel)}
    >
      <div className="h-2 w-full flex-shrink-0" style={{ backgroundColor: primaryColor }} />

      <div className="p-5 flex flex-col flex-1 gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: lightenColor(primaryColor, 0.85) }}
          >
            {hotel.logo_url ? (
              <img src={hotel.logo_url} alt={hotel.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-base font-bold" style={{ color: primaryColor }}>
                {getInitials(hotel.name)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-medium text-gray-900 truncate leading-tight">{hotel.name}</h3>
            {subdomain ? (
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {subdomain}.staywisesoftware.com
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Rooms" value={hotel.rooms_count} />
          <StatPill label="Arrivals" value={hotel.todays_arrivals} />
          <StatPill label="Occupancy" value={`${hotel.occupancy_pct}%`} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[hotel.staff_role] ?? ROLE_COLORS.receptionist}`}>
              {ROLE_LABELS[hotel.staff_role] ?? hotel.staff_role}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PLAN_COLORS[plan] ?? PLAN_COLORS.starter}`}>
              {PLAN_LABELS[plan] ?? plan}
            </span>
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onEnter(hotel); }}
          className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-150 group-hover:brightness-110"
          style={{ backgroundColor: primaryColor }}
        >
          Enter Hotel
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-center">
      <div className="text-base font-semibold text-gray-800 leading-tight">{value}</div>
      <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</div>
    </div>
  );
}
