import { useState, useEffect, useCallback } from 'react';
import {
  QrCode, Send, Eye, CheckCircle2, Clock, Link2, Copy, Check,
  ChevronDown, ChevronUp, Settings, Users, CalendarDays, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SubmissionViewModal from './SubmissionViewModal';
import PortalSettingsPanel from './PortalSettingsPanel';

interface Reservation {
  id: string;
  confirmation_code: string;
  check_in: string;
  check_out: string;
  guest?: { first_name: string; last_name: string; email: string };
  room?: { number: string };
  room_type?: { name: string };
}

interface PortalSession {
  id: string;
  reservation_id: string;
  guest_email: string;
  guest_name: string;
  token: string;
  step_completed: number;
  completed_at: string | null;
  created_at: string;
  expires_at: string;
}

const PORTAL_STATUS = (session?: PortalSession) => {
  if (!session) return { label: 'Not Sent', color: 'bg-gray-100 text-gray-500', icon: Clock };
  if (session.completed_at) return { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
  if (session.step_completed > 0) return { label: `Partial (step ${session.step_completed})`, color: 'bg-amber-100 text-amber-700', icon: Clock };
  return { label: 'Link Sent', color: 'bg-blue-100 text-blue-700', icon: Send };
};

export default function GuestPortalPage() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [tab, setTab] = useState<'checkins' | 'submissions' | 'settings'>('checkins');
  const [arrivals, setArrivals] = useState<Reservation[]>([]);
  const [sessions, setSessions] = useState<PortalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [viewSession, setViewSession] = useState<PortalSession | null>(null);

  const load = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const [{ data: res }, { data: sess }] = await Promise.all([
      supabase.from('reservations')
        .select('id, confirmation_code, check_in, check_out, guest:guests(first_name,last_name,email), room:rooms(number), room_type:room_types(name)')
        .eq('hotel_id', currentHotel.id)
        .in('check_in', [today, tomorrow])
        .in('status', ['confirmed', 'pending'])
        .order('check_in'),
      supabase.from('guest_portal_sessions')
        .select('*')
        .eq('hotel_id', currentHotel.id)
        .order('created_at', { ascending: false }),
    ]);
    setArrivals((res ?? []) as Reservation[]);
    setSessions((sess ?? []) as PortalSession[]);
    setLoading(false);
  }, [currentHotel]);

  useEffect(() => { load(); }, [load]);

  const sessionByReservation = (resId: string) =>
    sessions.find(s => s.reservation_id === resId);

  const sendLink = async (res: Reservation) => {
    setSendingId(res.id);
    const guestName = res.guest ? `${res.guest.first_name} ${res.guest.last_name}` : 'Guest';
    const guestEmail = res.guest?.email ?? '';
    const { data: existing } = await supabase
      .from('guest_portal_sessions')
      .select('id, token')
      .eq('hotel_id', currentHotel!.id)
      .eq('reservation_id', res.id)
      .maybeSingle();

    let token = existing?.token;
    if (!existing) {
      const { data: newSession } = await supabase
        .from('guest_portal_sessions')
        .insert({
          hotel_id: currentHotel!.id,
          reservation_id: res.id,
          guest_email: guestEmail,
          guest_name: guestName,
        })
        .select()
        .single();
      token = newSession?.token;
    }

    setSendingId(null);
    load();
    if (token) {
      const url = `${window.location.origin}/portal?token=${token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast('success', 'Check-in link copied to clipboard');
    }
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/portal?token=${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast('success', 'Link copied');
  };

  const completedSessions = sessions.filter(s => s.completed_at);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
          <QrCode className="w-6 h-6 text-blue-600" />
          Digital Check-in
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage pre-arrival check-in links and guest submissions</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Arrivals Today & Tomorrow', value: arrivals.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: CalendarDays },
          { label: 'Links Sent', value: sessions.length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Send },
          { label: 'Forms Completed', value: completedSessions.length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'checkins', label: 'Pending Check-ins', icon: CalendarDays },
          { id: 'submissions', label: 'Completed Submissions', icon: Users, badge: completedSessions.length },
          { id: 'settings', label: 'Settings', icon: Settings },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge ? <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'checkins' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {arrivals.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No arrivals today or tomorrow</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-header">Guest</th>
                  <th className="table-header">Booking Ref</th>
                  <th className="table-header">Room</th>
                  <th className="table-header">Check-in</th>
                  <th className="table-header">Portal Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {arrivals.map(res => {
                  const session = sessionByReservation(res.id);
                  const status = PORTAL_STATUS(session);
                  return (
                    <tr key={res.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="table-cell">
                        <p className="font-medium text-gray-900">
                          {res.guest ? `${res.guest.first_name} ${res.guest.last_name}` : '—'}
                        </p>
                        <p className="text-xs text-gray-400">{res.guest?.email}</p>
                      </td>
                      <td className="table-cell font-mono text-sm text-gray-600">{res.confirmation_code}</td>
                      <td className="table-cell text-gray-700">
                        {res.room?.number ? `Room ${res.room.number}` : res.room_type?.name ?? '—'}
                      </td>
                      <td className="table-cell text-gray-600">{formatDate(res.check_in)}</td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                          <status.icon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          {session ? (
                            <>
                              <button
                                onClick={() => copyLink(session.token)}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                {copiedToken === session.token ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                Copy Link
                              </button>
                              {session.step_completed > 0 && (
                                <button
                                  onClick={() => setViewSession(session)}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => sendLink(res)}
                              disabled={sendingId === res.id}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#172e4c] transition-colors disabled:opacity-70"
                            >
                              {sendingId === res.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                              Send Link
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'submissions' && (
        <SubmissionsTab sessions={completedSessions} onView={setViewSession} />
      )}

      {tab === 'settings' && (
        <PortalSettingsPanel hotelId={currentHotel!.id} />
      )}

      {viewSession && (
        <SubmissionViewModal session={viewSession} onClose={() => setViewSession(null)} />
      )}
    </div>
  );
}

function SubmissionsTab({ sessions, onView }: { sessions: PortalSession[]; onView: (s: PortalSession) => void }) {
  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
        <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No completed submissions yet</p>
        <p className="text-sm mt-1">Guests who complete their digital check-in will appear here</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-gray-100">
          <tr>
            <th className="table-header">Guest</th>
            <th className="table-header">Email</th>
            <th className="table-header">Completed</th>
            <th className="table-header">Steps</th>
            <th className="table-header"></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <td className="table-cell font-medium text-gray-900">{s.guest_name || '—'}</td>
              <td className="table-cell text-gray-500 text-sm">{s.guest_email}</td>
              <td className="table-cell text-gray-600">{s.completed_at ? formatDate(s.completed_at) : '—'}</td>
              <td className="table-cell">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
                      s.step_completed >= n ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>{n}</div>
                  ))}
                </div>
              </td>
              <td className="table-cell">
                <button onClick={() => onView(s)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
