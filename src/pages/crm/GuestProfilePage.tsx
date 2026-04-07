import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Tag, AlertTriangle, Star, CreditCard as Edit2, Plus, FileText, MessageSquare, PhoneCall, Send, Calendar, Euro, TrendingUp, Clock } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';
import { fetchGuestProfile, fetchGuestStays, fetchGuestComms } from './useGuestProfiles';
import GuestFormModal from './GuestFormModal';
import { LOYALTY_COLORS, LOYALTY_LABELS, COMM_TYPE_COLORS } from './types';
import type { GuestProfile, GuestStayHistory, GuestCommunication, CommType } from './types';

type ProfileTab = 'history' | 'communications' | 'preferences' | 'documents';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StarRating({ value, onChange }: { value?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)} className={`w-5 h-5 transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}>
          <Star className={`w-full h-full ${i <= (value || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        </button>
      ))}
    </div>
  );
}

export default function GuestProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentHotel } = useHotel();
  const { toast } = useToast();

  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [stays, setStays] = useState<GuestStayHistory[]>([]);
  const [comms, setComms] = useState<GuestCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('history');
  const [showEditForm, setShowEditForm] = useState(false);

  const [showCommModal, setShowCommModal] = useState(false);
  const [commForm, setCommForm] = useState<{ type: CommType; subject: string; body: string; direction: 'inbound' | 'outbound' }>({ type: 'note', subject: '', body: '', direction: 'outbound' });
  const [savingComm, setSavingComm] = useState(false);

  const [editingRating, setEditingRating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [g, s, c] = await Promise.all([fetchGuestProfile(id), fetchGuestStays(id), fetchGuestComms(id)]);
    setGuest(g);
    setStays(s);
    setComms(c);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const avgSpend = guest && guest.total_stays > 0 ? guest.total_spent / guest.total_stays : 0;
  const avgNights = stays.length > 0 ? stays.reduce((s, h) => s + (h.nights || 0), 0) / stays.length : 0;
  const firstVisit = stays.length > 0 ? stays[stays.length - 1].check_in : null;
  const favRoomType = stays.length > 0
    ? Object.entries(stays.reduce((m, s) => { if (s.room_type) m[s.room_type] = (m[s.room_type] || 0) + 1; return m; }, {} as Record<string, number>)).sort((a,b) => b[1]-a[1])[0]?.[0]
    : null;

  const saveComm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !currentHotel) return;
    setSavingComm(true);
    const { error } = await supabase.from('guest_communications').insert({
      guest_profile_id: id, hotel_id: currentHotel.id, type: commForm.type,
      direction: commForm.direction, subject: commForm.subject, body: commForm.body,
      sent_at: new Date().toISOString(),
    });
    if (error) toast('error', 'Failed to save');
    else { toast('success', 'Communication saved'); setShowCommModal(false); setCommForm({ type: 'note', subject: '', body: '', direction: 'outbound' }); load(); }
    setSavingComm(false);
  };

  const saveRating = async (stayId: string, rating: number) => {
    await supabase.from('guest_stay_history').update({ rating }).eq('id', stayId);
    setStays(prev => prev.map(s => s.id === stayId ? { ...s, rating } : s));
    setEditingRating(null);
  };

  const toggleBlacklist = async () => {
    if (!guest) return;
    const newVal = !guest.blacklisted;
    await supabase.from('guest_profiles').update({ blacklisted: newVal }).eq('id', guest.id);
    setGuest(p => p ? { ...p, blacklisted: newVal } : p);
    toast('success', newVal ? 'Guest blacklisted' : 'Guest removed from blacklist');
  };

  if (loading) return <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (!guest) return <div className="py-20 text-center text-gray-500">Guest not found</div>;

  const initials = guest.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5 max-w-5xl">
      <button onClick={() => navigate('/guests')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" />Back to Guest List
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${guest.blacklisted ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="text-xl font-bold text-gray-900">{guest.full_name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${LOYALTY_COLORS[guest.loyalty_tier]}`}>
                {LOYALTY_LABELS[guest.loyalty_tier]}
              </span>
              {guest.blacklisted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  <AlertTriangle className="w-3 h-3" />Blacklisted
                </span>
              )}
              <span className="text-sm text-gray-400">{guest.loyalty_points} pts</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500 mb-3">
              {guest.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{guest.email}</span>}
              {guest.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{guest.phone}</span>}
              {(guest.city || guest.country) && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{[guest.city, guest.country].filter(Boolean).join(', ')}</span>}
              {guest.company && <span className="font-medium text-gray-700">{guest.company}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(guest.tags || []).map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button onClick={() => setShowEditForm(true)} className="btn-secondary text-sm">
              <Edit2 className="w-3.5 h-3.5" />Edit
            </button>
            <button onClick={() => { setShowCommModal(true); setCommForm(p => ({ ...p, type: 'note' })); }} className="btn-secondary text-sm">
              <MessageSquare className="w-3.5 h-3.5" />Add Note
            </button>
            <button onClick={toggleBlacklist} className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${guest.blacklisted ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {guest.blacklisted ? 'Unblacklist' : 'Blacklist'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { icon: Calendar, label: 'Total Stays', value: guest.total_stays, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Euro, label: 'Total Spent', value: formatCurrency(guest.total_spent, currentHotel?.currency || 'EUR'), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: TrendingUp, label: 'Avg per Stay', value: formatCurrency(avgSpend, currentHotel?.currency || 'EUR'), color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: Clock, label: 'Avg Nights', value: avgNights > 0 ? `${avgNights.toFixed(1)}n` : '-', color: 'text-teal-600', bg: 'bg-teal-50' },
          { icon: Calendar, label: 'First Visit', value: firstVisit ? formatDate(firstVisit) : '-', color: 'text-gray-600', bg: 'bg-gray-50' },
          { icon: Calendar, label: 'Last Visit', value: guest.last_stay_at ? formatDate(guest.last_stay_at) : '-', color: 'text-gray-600', bg: 'bg-gray-50' },
          { icon: Star, label: 'Fav Room Type', value: favRoomType || '-', color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <div className={`w-7 h-7 rounded-lg ${card.bg} ${card.color} flex items-center justify-center mb-2`}>
              <card.icon className="w-4 h-4" />
            </div>
            <div className="text-sm font-semibold text-gray-900 truncate">{card.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-100">
          <nav className="flex overflow-x-auto">
            {([
              { key: 'history', label: 'Stay History', count: stays.length },
              { key: 'communications', label: 'Communications', count: comms.length },
              { key: 'preferences', label: 'Preferences' },
              { key: 'documents', label: 'Documents' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
                {'count' in tab && tab.count !== undefined && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5">
          {activeTab === 'history' && (
            <div>
              {stays.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No stay history recorded</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">Dates</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">Room</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">Nights</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">Amount</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">Source</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stays.map(stay => (
                        <tr key={stay.id} className="hover:bg-gray-50">
                          <td className="py-3 text-sm text-gray-700">
                            {stay.check_in ? formatDate(stay.check_in) : '-'}
                            {stay.check_out && <span className="text-gray-400"> → {formatDate(stay.check_out)}</span>}
                          </td>
                          <td className="py-3">
                            <div className="text-sm font-medium text-gray-900">{stay.room_number || '-'}</div>
                            <div className="text-xs text-gray-400">{stay.room_type || ''}</div>
                          </td>
                          <td className="py-3 text-sm text-gray-600 text-right">{stay.nights || '-'}</td>
                          <td className="py-3 text-sm font-semibold text-gray-900 text-right">{stay.total_amount ? formatCurrency(stay.total_amount, currentHotel?.currency || 'EUR') : '-'}</td>
                          <td className="py-3 text-sm text-gray-500">{stay.source || '-'}</td>
                          <td className="py-3">
                            {editingRating === stay.id ? (
                              <StarRating value={stay.rating} onChange={v => saveRating(stay.id, v)} />
                            ) : (
                              <div className="flex items-center gap-2" onClick={() => setEditingRating(stay.id)}>
                                <StarRating value={stay.rating} />
                                {!stay.rating && <span className="text-xs text-gray-400 cursor-pointer hover:text-blue-500">Rate</span>}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'communications' && (
            <div>
              <div className="flex justify-end mb-4 gap-2">
                <button onClick={() => { setShowCommModal(true); setCommForm({ type: 'note', subject: '', body: '', direction: 'outbound' }); }} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100">
                  <FileText className="w-3.5 h-3.5" />Add Note
                </button>
                <button onClick={() => { setShowCommModal(true); setCommForm({ type: 'call', subject: '', body: '', direction: 'inbound' }); }} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100">
                  <PhoneCall className="w-3.5 h-3.5" />Log Call
                </button>
                <button onClick={() => { setShowCommModal(true); setCommForm({ type: 'email', subject: '', body: '', direction: 'outbound' }); }} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100">
                  <Send className="w-3.5 h-3.5" />Send Email
                </button>
              </div>
              {comms.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No communications yet</div>
              ) : (
                <div className="space-y-3">
                  {comms.map(comm => (
                    <div key={comm.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${COMM_TYPE_COLORS[comm.type]}`}>
                          {comm.type === 'email' && <Mail className="w-4 h-4" />}
                          {comm.type === 'sms' && <MessageSquare className="w-4 h-4" />}
                          {comm.type === 'note' && <FileText className="w-4 h-4" />}
                          {comm.type === 'call' && <PhoneCall className="w-4 h-4" />}
                        </div>
                        <div className="w-px flex-1 bg-gray-100 mt-1" />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COMM_TYPE_COLORS[comm.type]}`}>{comm.type.toUpperCase()}</span>
                          <span className="text-xs text-gray-400">{comm.direction}</span>
                          <span className="text-xs text-gray-400 ml-auto">{comm.sent_at ? format(new Date(comm.sent_at), 'MMM d, yyyy h:mm a') : ''}</span>
                        </div>
                        {comm.subject && <p className="text-sm font-semibold text-gray-900 mb-0.5">{comm.subject}</p>}
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{comm.body}</p>
                        {comm.sent_by && <p className="text-xs text-gray-400 mt-1">by {comm.sent_by}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Room & Stay Preferences</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">Room preferences</span>
                      <span className="text-gray-900 font-medium">{guest.room_preferences || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">Dietary requirements</span>
                      <span className="text-gray-900 font-medium">{guest.dietary_requirements || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">Language preference</span>
                      <span className="text-gray-900 font-medium uppercase">{guest.language_preference || 'en'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-500">Marketing opt-in</span>
                      <span className={`font-medium ${guest.marketing_opt_in ? 'text-emerald-600' : 'text-red-500'}`}>{guest.marketing_opt_in ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Special Occasions</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">Birthday</span>
                      <span className="text-gray-900 font-medium">
                        {guest.birthday_month && guest.birthday_day ? `${MONTH_NAMES[guest.birthday_month - 1]} ${guest.birthday_day}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">Anniversary</span>
                      <span className="text-gray-900 font-medium">{guest.anniversary_date ? formatDate(guest.anniversary_date) : '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-500">Date of birth</span>
                      <span className="text-gray-900 font-medium">{guest.date_of_birth ? formatDate(guest.date_of_birth) : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
              {guest.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Internal Notes</h3>
                  <div className="bg-amber-50 rounded-lg border border-amber-100 p-4 text-sm text-gray-700 whitespace-pre-wrap">{guest.notes}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No documents uploaded</p>
              <p className="text-xs mt-1">Documents uploaded during digital check-in will appear here</p>
            </div>
          )}
        </div>
      </div>

      <GuestFormModal open={showEditForm} onClose={() => setShowEditForm(false)} onSaved={() => { setShowEditForm(false); load(); }} guest={guest} hotelId={currentHotel?.id} />

      <Modal open={showCommModal} onClose={() => setShowCommModal(false)} title="Log Communication" size="md">
        <form onSubmit={saveComm} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={commForm.type} onChange={e => setCommForm(p => ({ ...p, type: e.target.value as CommType }))} className="input-field w-full">
                <option value="note">Note</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="call">Call</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <select value={commForm.direction} onChange={e => setCommForm(p => ({ ...p, direction: e.target.value as 'inbound' | 'outbound' }))} className="input-field w-full">
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
          </div>
          {commForm.type === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input type="text" value={commForm.subject} onChange={e => setCommForm(p => ({ ...p, subject: e.target.value }))} className="input-field w-full" placeholder="Email subject" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {commForm.type === 'note' ? 'Note content' : commForm.type === 'call' ? 'Call summary' : 'Message'} *
            </label>
            <textarea required value={commForm.body} onChange={e => setCommForm(p => ({ ...p, body: e.target.value }))} rows={5} className="input-field w-full" placeholder={commForm.type === 'note' ? 'What happened...' : commForm.type === 'call' ? 'Summary of the call...' : 'Message content...'} />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowCommModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={savingComm} className="btn-primary">{savingComm ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
