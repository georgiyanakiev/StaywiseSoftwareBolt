import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp, BedDouble, CalendarCheck, DollarSign, BarChart2, FileText, Printer, Building2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHotel } from '../../contexts/HotelContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import OwnerAvailabilityCalendar from './OwnerAvailabilityCalendar';
import type { PropertyOwner, OwnerProperty, OwnerStatement } from './types';

interface ReservationRow {
  id: string;
  room_id: string | null;
  check_in: string;
  check_out: string;
  total_amount: number;
  status: string;
  guest?: { first_name: string; last_name: string } | null;
}

type Tab = 'overview' | 'calendar' | 'bookings' | 'statements' | 'expenses';

function nights(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
}

function anonymise(first: string, last: string): string {
  return `${first} ${last.charAt(0)}.`;
}

function printStatement(stmt: OwnerStatement, owner: PropertyOwner) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html>
    <head>
      <title>Statement ${formatDate(stmt.period_start, 'MMM yyyy')}</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; color: #111; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 14px; margin-bottom: 32px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px; }
        td:last-child { text-align: right; }
        .total td { font-weight: 700; font-size: 16px; border-top: 2px solid #111; border-bottom: none; }
        .meta { margin-top: 24px; font-size: 13px; color: #666; }
      </style>
    </head>
    <body>
      <h1>Owner Statement</h1>
      <div class="sub">
        ${owner.full_name} · ${owner.company_name ?? ''}<br/>
        Period: ${formatDate(stmt.period_start)} – ${formatDate(stmt.period_end)}
      </div>
      <table>
        <tr><td>Gross Revenue</td><td>${formatCurrency(stmt.gross_revenue)}</td></tr>
        <tr><td>Management Fee (${owner.commission_rate}%)</td><td>−${formatCurrency(stmt.management_fee)}</td></tr>
        <tr><td>Expenses</td><td>−${formatCurrency(stmt.expenses)}</td></tr>
        <tr class="total"><td>Net Payout</td><td>${formatCurrency(stmt.net_payout)}</td></tr>
      </table>
      <div class="meta">
        Bookings: ${stmt.booking_count} · Occupancy: ${stmt.occupancy_rate.toFixed(1)}% · ADR: ${formatCurrency(stmt.avg_daily_rate)}<br/>
        ${stmt.notes ? `Notes: ${stmt.notes}` : ''}
      </div>
    </body>
    </html>
  `);
  win.document.close();
  win.print();
}

export default function MyOwnerPortal() {
  const { staff } = useAuth();
  const { currentHotel } = useHotel();
  const [searchParams] = useSearchParams();
  const overrideOwnerId = searchParams.get('owner_id');

  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState<PropertyOwner | null>(null);
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [statements, setStatements] = useState<OwnerStatement[]>([]);
  const [tab, setTab] = useState<Tab>('overview');

  const load = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      let ownerRecord: PropertyOwner | null = null;

      if (overrideOwnerId) {
        const { data } = await supabase.from('property_owners').select('*').eq('id', overrideOwnerId).maybeSingle();
        ownerRecord = data as PropertyOwner | null;
      } else if (staff?.user_id) {
        const { data } = await supabase.from('property_owners').select('*').eq('user_id', staff.user_id).maybeSingle();
        ownerRecord = data as PropertyOwner | null;
      }

      if (!ownerRecord) {
        setLoading(false);
        return;
      }

      setOwner(ownerRecord);

      const [{ data: propData }, { data: stmtData }] = await Promise.all([
        supabase.from('owner_properties').select('*').eq('owner_id', ownerRecord.id),
        supabase.from('owner_statements').select('*').eq('owner_id', ownerRecord.id).order('period_start', { ascending: false }),
      ]);

      const props = (propData ?? []) as OwnerProperty[];
      setProperties(props);
      setStatements((stmtData ?? []) as OwnerStatement[]);

      const roomIds = props.map(p => p.room_id).filter(Boolean) as string[];

      if (roomIds.length > 0) {
        const { data: resvData } = await supabase
          .from('reservations')
          .select('id, room_id, check_in, check_out, total_amount, status, guest:guests(first_name, last_name)')
          .eq('hotel_id', currentHotel.id)
          .in('room_id', roomIds)
          .in('status', ['confirmed', 'checked_in', 'checked_out'])
          .order('check_in', { ascending: false });

        setReservations((resvData ?? []) as ReservationRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentHotel, staff, overrideOwnerId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (!owner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">No owner profile found</h2>
          <p className="text-sm text-gray-500 mt-1">Your account is not linked to any property ownership record.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const thisMonthResvs = reservations.filter(r => r.check_in >= monthStart && r.check_in <= monthEnd);
  const thisMonthRevenue = thisMonthResvs.reduce((sum, r) => {
    const prop = properties.find(p => p.room_id === r.room_id);
    return sum + r.total_amount * ((prop?.ownership_pct ?? 100) / 100);
  }, 0);
  const totalNights = thisMonthResvs.reduce((sum, r) => sum + nights(r.check_in, r.check_out), 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const totalPossibleNights = properties.length * daysInMonth;
  const occupancyRate = totalPossibleNights > 0 ? (totalNights / totalPossibleNights) * 100 : 0;
  const avgDailyRate = thisMonthResvs.length > 0 ? thisMonthRevenue / Math.max(1, totalNights) : 0;
  const pendingPayout = statements.filter(s => s.status !== 'paid').reduce((sum, s) => sum + s.net_payout, 0);

  const rooms = properties.map(p => ({ id: p.room_id ?? '', number: p.room_number })).filter(r => r.id);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart2 },
    { key: 'calendar', label: 'Availability', icon: CalendarCheck },
    { key: 'bookings', label: 'Bookings', icon: BedDouble },
    { key: 'statements', label: 'Statements', icon: FileText },
    { key: 'expenses', label: 'Expenses', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{owner.full_name}</h1>
              <p className="text-sm text-gray-500">{owner.company_name || owner.email} · {properties.length} room{properties.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Revenue (This Month)', value: formatCurrency(thisMonthRevenue), icon: TrendingUp, color: 'text-teal-600' },
            { label: 'Occupancy Rate', value: `${occupancyRate.toFixed(1)}%`, icon: BarChart2, color: 'text-blue-600' },
            { label: 'Bookings', value: thisMonthResvs.length, icon: CalendarCheck, color: 'text-emerald-600' },
            { label: 'Avg Daily Rate', value: formatCurrency(avgDailyRate), icon: DollarSign, color: 'text-amber-600' },
            { label: 'Pending Payout', value: formatCurrency(pendingPayout), icon: FileText, color: 'text-orange-600' },
          ].map(card => (
            <div key={card.label} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
              <p className="text-xl font-semibold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Rooms</h3>
              {properties.length === 0 ? (
                <p className="text-sm text-gray-400">No rooms assigned</p>
              ) : (
                <div className="space-y-2">
                  {properties.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-700">Room {p.room_number}</span>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">{p.ownership_pct}% owned</span>
                        {p.monthly_expenses > 0 && (
                          <p className="text-xs text-gray-400">{formatCurrency(p.monthly_expenses)}/mo expenses</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Statements</h3>
              {statements.length === 0 ? (
                <p className="text-sm text-gray-400">No statements yet</p>
              ) : (
                <div className="space-y-2">
                  {statements.slice(0, 4).map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm text-gray-700">{formatDate(s.period_start, 'MMM yyyy')}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          s.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          s.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{s.status}</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700">{formatCurrency(s.net_payout)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'calendar' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">3-Month Availability Calendar</h3>
            <OwnerAvailabilityCalendar
              rooms={rooms}
              reservations={reservations}
              startDate={now}
            />
          </div>
        )}

        {tab === 'bookings' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="table-header">Guest</th>
                  <th className="table-header">Room</th>
                  <th className="table-header">Check In</th>
                  <th className="table-header">Check Out</th>
                  <th className="table-header">Nights</th>
                  <th className="table-header">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.length === 0 ? (
                  <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">No bookings found</td></tr>
                ) : (
                  reservations.map(r => {
                    const prop = properties.find(p => p.room_id === r.room_id);
                    const ownerShare = r.total_amount * ((prop?.ownership_pct ?? 100) / 100);
                    const guestName = r.guest ? anonymise(r.guest.first_name, r.guest.last_name) : 'Guest';
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="table-cell text-sm text-gray-700">{guestName}</td>
                        <td className="table-cell text-sm text-gray-700">{prop?.room_number ?? '—'}</td>
                        <td className="table-cell text-sm text-gray-700">{formatDate(r.check_in)}</td>
                        <td className="table-cell text-sm text-gray-700">{formatDate(r.check_out)}</td>
                        <td className="table-cell text-sm text-gray-700">{nights(r.check_in, r.check_out)}</td>
                        <td className="table-cell text-sm font-medium text-gray-900">{formatCurrency(ownerShare)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'statements' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="table-header">Period</th>
                  <th className="table-header">Revenue</th>
                  <th className="table-header hidden sm:table-cell">Mgmt Fee</th>
                  <th className="table-header hidden sm:table-cell">Expenses</th>
                  <th className="table-header">Net Payout</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statements.length === 0 ? (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No statements yet</td></tr>
                ) : (
                  statements.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="table-cell text-sm text-gray-700">
                        {formatDate(s.period_start, 'MMM d')} – {formatDate(s.period_end, 'MMM d, yyyy')}
                      </td>
                      <td className="table-cell text-sm text-gray-900">{formatCurrency(s.gross_revenue)}</td>
                      <td className="table-cell hidden sm:table-cell text-sm text-red-600">−{formatCurrency(s.management_fee)}</td>
                      <td className="table-cell hidden sm:table-cell text-sm text-red-600">−{formatCurrency(s.expenses)}</td>
                      <td className="table-cell text-sm font-semibold text-emerald-700">{formatCurrency(s.net_payout)}</td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          s.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          s.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{s.status}</span>
                      </td>
                      <td className="table-cell text-right">
                        <button
                          onClick={() => printStatement(s, owner)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Print / Download PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="table-header">Room</th>
                  <th className="table-header">Monthly Expenses</th>
                  <th className="table-header">Ownership %</th>
                  <th className="table-header">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.length === 0 ? (
                  <tr><td colSpan={4} className="table-cell text-center text-gray-400 py-8">No rooms assigned</td></tr>
                ) : (
                  properties.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="table-cell text-sm font-medium text-gray-900">Room {p.room_number}</td>
                      <td className="table-cell text-sm text-gray-700">{formatCurrency(p.monthly_expenses)}</td>
                      <td className="table-cell text-sm text-gray-700">{p.ownership_pct}%</td>
                      <td className="table-cell text-sm text-gray-500">{p.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
