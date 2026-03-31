import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2, ChevronRight, ChevronLeft, User, FileText,
  Star, PenLine, CheckCircle2, Loader2, AlertCircle,
  Bed, Coffee, Car, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

interface PortalSession {
  id: string;
  hotel_id: string;
  reservation_id: string;
  guest_email: string;
  guest_name: string;
  token: string;
  step_completed: number;
  completed_at: string | null;
  expires_at: string;
}

interface Hotel {
  id: string;
  name: string;
  logo_url: string;
  check_in_time: string;
  check_out_time: string;
  address: string;
  city: string;
}

interface Reservation {
  id: string;
  confirmation_code: string;
  check_in: string;
  check_out: string;
  adults: number;
  room?: { number: string };
  room_type?: { name: string };
  guest?: { first_name: string; last_name: string; email: string };
}

const STEPS = [
  { n: 1, label: 'Welcome' },
  { n: 2, label: 'Personal' },
  { n: 3, label: 'Document' },
  { n: 4, label: 'Preferences' },
  { n: 5, label: 'Sign & Submit' },
];

const ROOM_PREFS = ['High floor', 'Low floor', 'Quiet room', 'Extra pillows', 'Extra blankets', 'Away from elevator', 'Near elevator', 'Non-smoking'];

const TERMS = `By completing this digital check-in, you agree to the following hotel policies:

1. Check-in is from the time shown below. Early check-in is subject to availability.
2. Check-out is at 11:00. Late check-out may incur additional charges.
3. Guests are responsible for any damage caused during their stay.
4. Smoking is strictly prohibited in all rooms and indoor areas.
5. Pets are not permitted on the property unless pre-arranged.
6. The hotel accepts no liability for valuables left unattended in rooms.
7. Payment is required at check-in unless a credit card guarantee is on file.`;

export default function GuestPortal() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [session, setSession] = useState<PortalSession | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [personal, setPersonal] = useState({ fullName: '', dateOfBirth: '', nationality: '', phone: '', email: '' });
  const [docData, setDocData] = useState({ type: 'passport', number: '', nationality: '', dob: '', issueDate: '', expiryDate: '' });
  const [prefs, setPrefs] = useState({ arrivalTime: '', transport: '', specialRequests: '', dietary: '', celebration: '', roomPrefs: [] as string[] });
  const [terms, setTerms] = useState({ agreed: false });
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [upsells, setUpsells] = useState({ lateCheckout: false, breakfast: false, parking: false });

  const load = useCallback(async () => {
    if (!token) { setError('Invalid or missing check-in link.'); setLoading(false); return; }
    const { data: sess } = await supabase.from('guest_portal_sessions').select('*').eq('token', token).maybeSingle();
    if (!sess) { setError('This check-in link is invalid or has expired.'); setLoading(false); return; }
    if (new Date(sess.expires_at) < new Date()) { setError('This check-in link has expired. Please contact the hotel for a new link.'); setLoading(false); return; }

    setSession(sess as PortalSession);
    if (sess.completed_at) { setSubmitted(true); setStep(6); }
    else if (sess.step_completed > 0) setStep(sess.step_completed + 1);

    const [{ data: h }, { data: r }] = await Promise.all([
      supabase.from('hotels').select('id,name,logo_url,check_in_time,check_out_time,address,city').eq('id', sess.hotel_id).maybeSingle(),
      sess.reservation_id
        ? supabase.from('reservations')
            .select('id,confirmation_code,check_in,check_out,adults,room:rooms(number),room_type:room_types(name),guest:guests(first_name,last_name,email)')
            .eq('id', sess.reservation_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setHotel(h as Hotel | null);
    setReservation(r as Reservation | null);

    if (r?.guest) {
      setPersonal(p => ({
        ...p,
        fullName: p.fullName || `${r.guest!.first_name} ${r.guest!.last_name}`,
        email: p.email || r.guest!.email,
      }));
    }

    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveStep = async (stepNum: number) => {
    if (!session) return;
    await supabase.from('guest_portal_sessions').update({ step_completed: stepNum }).eq('id', session.id);
  };

  const advanceTo = async (n: number) => {
    await saveStep(n - 1);
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitForm = async () => {
    if (!session) return;
    setSubmitting(true);
    const sigData = signatureRef.current?.toDataURL() ?? '';

    await Promise.all([
      supabase.from('guest_documents').upsert({
        session_id: session.id,
        hotel_id: hotel?.id,
        reservation_id: session.reservation_id,
        guest_name: personal.fullName,
        document_type: docData.type,
        document_number: docData.number,
        nationality: docData.nationality || personal.nationality,
        date_of_birth: docData.dob || null,
        issue_date: docData.issueDate || null,
        expiry_date: docData.expiryDate || null,
      }, { onConflict: 'session_id' }),

      supabase.from('pre_arrival_forms').upsert({
        session_id: session.id,
        hotel_id: hotel?.id,
        reservation_id: session.reservation_id,
        arrival_time: prefs.arrivalTime,
        departure_transport: prefs.transport,
        special_requests: prefs.specialRequests,
        dietary_requirements: prefs.dietary,
        celebration_type: prefs.celebration,
        room_preferences: prefs.roomPrefs,
        agreed_to_terms: terms.agreed,
        signature_data: sigData,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'session_id' }),

      supabase.from('guest_portal_sessions').update({
        step_completed: 5,
        completed_at: new Date().toISOString(),
        guest_name: personal.fullName,
      }).eq('id', session.id),
    ]);

    setSubmitting(false);
    setSubmitted(true);
    setStep(6);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePref = (p: string) => {
    setPrefs(f => ({
      ...f,
      roomPrefs: f.roomPrefs.includes(p) ? f.roomPrefs.filter(x => x !== p) : [...f.roomPrefs, p],
    }));
  };

  const initCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = signatureRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    initCanvas(canvas);
    const r = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - r.left : e.clientX - r.left;
    const y = 'touches' in e ? e.touches[0].clientY - r.top : e.clientY - r.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = signatureRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const r = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - r.left : e.clientX - r.left;
    const y = 'touches' in e ? e.touches[0].clientY - r.top : e.clientY - r.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDraw = () => { isDrawing.current = false; };

  const clearSignature = () => {
    const canvas = signatureRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Check-in Unavailable</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const guestFirstName = personal.fullName.split(' ')[0] || (reservation?.guest?.first_name ?? 'Guest');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-lg mx-auto px-4 py-8 pb-20">
        <div className="text-center mb-6">
          {hotel?.logo_url ? (
            <img src={hotel.logo_url} alt={hotel.name} className="h-12 mx-auto mb-2 object-contain" />
          ) : (
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          )}
          <h1 className="text-lg font-bold text-gray-900">{hotel?.name ?? 'Hotel'}</h1>
        </div>

        {step < 6 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    step > s.n ? 'bg-emerald-500 text-white' :
                    step === s.n ? 'bg-blue-600 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${step > s.n ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center text-xs text-gray-400">Step {step} of 5 — {STEPS.find(s => s.n === step)?.label}</div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {step === 1 && (
            <StepWelcome hotel={hotel} reservation={reservation} guestFirstName={guestFirstName} onStart={() => advanceTo(2)} />
          )}
          {step === 2 && (
            <StepPersonal data={personal} onChange={setPersonal} onNext={() => advanceTo(3)} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <StepDocument data={docData} onChange={setDocData} nationality={personal.nationality} onNext={() => advanceTo(4)} onBack={() => setStep(2)} />
          )}
          {step === 4 && (
            <StepPreferences data={prefs} onChange={setPrefs} roomPrefs={ROOM_PREFS} togglePref={togglePref} onNext={() => advanceTo(5)} onBack={() => setStep(3)} />
          )}
          {step === 5 && (
            <StepSignature
              terms={TERMS}
              agreed={terms.agreed}
              onAgreeChange={v => setTerms({ agreed: v })}
              signatureRef={signatureRef}
              hasSignature={hasSignature}
              onClear={clearSignature}
              onStart={startDraw}
              onDraw={draw}
              onEnd={endDraw}
              onBack={() => setStep(4)}
              onSubmit={submitForm}
              submitting={submitting}
            />
          )}
          {step === 6 && (
            <StepDone hotel={hotel} reservation={reservation} upsells={upsells} setUpsells={setUpsells} />
          )}
        </div>
      </div>
    </div>
  );
}

function StepWelcome({ hotel, reservation, guestFirstName, onStart }: {
  hotel: Hotel | null; reservation: Reservation | null; guestFirstName: string; onStart: () => void;
}) {
  return (
    <div className="p-6 text-center space-y-5">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
        <Building2 className="w-8 h-8 text-blue-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Welcome, {guestFirstName}!</h2>
        <p className="text-gray-500 text-sm mt-1">Complete your digital check-in in just a few steps.</p>
      </div>
      {reservation && (
        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your Booking</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Confirmation</p>
              <p className="font-mono font-semibold text-gray-800">{reservation.confirmation_code}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Room</p>
              <p className="font-semibold text-gray-800">
                {reservation.room?.number ? `Room ${reservation.room.number}` : reservation.room_type?.name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Check-in</p>
              <p className="font-semibold text-gray-800">{formatDate(reservation.check_in)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Check-out</p>
              <p className="font-semibold text-gray-800">{formatDate(reservation.check_out)}</p>
            </div>
          </div>
          {hotel?.check_in_time && (
            <p className="text-xs text-gray-400 mt-1">Check-in from {hotel.check_in_time}</p>
          )}
        </div>
      )}
      <button onClick={onStart} className="w-full btn-primary py-3 text-base">
        Start Check-in <ChevronRight className="w-5 h-5 ml-1" />
      </button>
    </div>
  );
}

function StepPersonal({ data, onChange, onNext, onBack }: {
  data: { fullName: string; dateOfBirth: string; nationality: string; phone: string; email: string };
  onChange: (d: typeof data) => void;
  onNext: () => void; onBack: () => void;
}) {
  const set = (k: string, v: string) => onChange({ ...data, [k]: v });
  const valid = data.fullName && data.dateOfBirth && data.nationality;
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Personal Details</h2>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
        <input value={data.fullName} onChange={e => set('fullName', e.target.value)} className="input-field" placeholder="As shown on ID" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
          <input type="date" value={data.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nationality</label>
          <input value={data.nationality} onChange={e => set('nationality', e.target.value)} className="input-field" placeholder="e.g. Portuguese" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
        <input type="tel" value={data.phone} onChange={e => set('phone', e.target.value)} className="input-field" placeholder="+351 912 345 678" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
        <input type="email" value={data.email} onChange={e => set('email', e.target.value)} className="input-field" placeholder="your@email.com" />
      </div>
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!valid} />
    </div>
  );
}

function StepDocument({ data, onChange, nationality, onNext, onBack }: {
  data: { type: string; number: string; nationality: string; dob: string; issueDate: string; expiryDate: string };
  onChange: (d: typeof data) => void;
  nationality: string;
  onNext: () => void; onBack: () => void;
}) {
  const set = (k: string, v: string) => onChange({ ...data, [k]: v });
  const valid = data.type && data.number;
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <FileText className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">ID Document</h2>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Type</label>
        <select value={data.type} onChange={e => set('type', e.target.value)} className="input-field">
          <option value="passport">Passport</option>
          <option value="id_card">National ID Card</option>
          <option value="drivers_license">Driver's License</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Number</label>
        <input value={data.number} onChange={e => set('number', e.target.value)} className="input-field" placeholder="AB123456" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nationality (on document)</label>
        <input value={data.nationality || nationality} onChange={e => set('nationality', e.target.value)} className="input-field" placeholder="e.g. Portuguese" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
          <input type="date" value={data.dob} onChange={e => set('dob', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Issue Date</label>
          <input type="date" value={data.issueDate} onChange={e => set('issueDate', e.target.value)} className="input-field" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date</label>
        <input type="date" value={data.expiryDate} onChange={e => set('expiryDate', e.target.value)} className="input-field" />
      </div>
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!valid} />
    </div>
  );
}

function StepPreferences({ data, onChange, roomPrefs, togglePref, onNext, onBack }: {
  data: { arrivalTime: string; transport: string; specialRequests: string; dietary: string; celebration: string; roomPrefs: string[] };
  onChange: (d: typeof data) => void;
  roomPrefs: string[];
  togglePref: (p: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const set = (k: string, v: string) => onChange({ ...data, [k]: v });
  const CELEBRATIONS = ['None', 'Birthday', 'Anniversary', 'Honeymoon', 'Baby shower', 'Other'];
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <Star className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Preferences & Requests</h2>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Estimated Arrival Time
        </label>
        <input type="time" value={data.arrivalTime} onChange={e => set('arrivalTime', e.target.value)} className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode of Transport to Hotel</label>
        <select value={data.transport} onChange={e => set('transport', e.target.value)} className="input-field">
          <option value="">Select...</option>
          <option value="car">Car</option>
          <option value="taxi">Taxi / Rideshare</option>
          <option value="public_transport">Public Transport</option>
          <option value="plane">Arriving by plane</option>
          <option value="train">Train</option>
          <option value="walk">Walking</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Room Preferences</label>
        <div className="flex flex-wrap gap-2">
          {roomPrefs.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => togglePref(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                data.roomPrefs.includes(p)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Requests</label>
        <textarea value={data.specialRequests} onChange={e => set('specialRequests', e.target.value)} className="input-field resize-none" rows={3} placeholder="Any special requirements..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Dietary Requirements</label>
        <input value={data.dietary} onChange={e => set('dietary', e.target.value)} className="input-field" placeholder="e.g. vegetarian, gluten-free, nut allergy" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Are you celebrating anything special?</label>
        <div className="grid grid-cols-3 gap-2">
          {CELEBRATIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('celebration', c === 'None' ? '' : c)}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors border ${
                (c === 'None' ? !data.celebration : data.celebration === c)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function StepSignature({ terms, agreed, onAgreeChange, signatureRef, hasSignature, onClear, onStart, onDraw, onEnd, onBack, onSubmit, submitting }: {
  terms: string; agreed: boolean; onAgreeChange: (v: boolean) => void;
  signatureRef: React.RefObject<HTMLCanvasElement>;
  hasSignature: boolean; onClear: () => void;
  onStart: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  onDraw: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  onEnd: () => void;
  onBack: () => void; onSubmit: () => void; submitting: boolean;
}) {
  const canSubmit = agreed && hasSignature;
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <PenLine className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Terms & Signature</h2>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{terms}</pre>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={e => onAgreeChange(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600" />
        <span className="text-sm text-gray-700">I have read and agree to the hotel's terms and conditions</span>
      </label>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Your Signature</label>
          {hasSignature && (
            <button onClick={onClear} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear</button>
          )}
        </div>
        <canvas
          ref={signatureRef}
          width={400}
          height={150}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
          onMouseDown={onStart}
          onMouseMove={onDraw}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          onTouchStart={onStart}
          onTouchMove={onDraw}
          onTouchEnd={onEnd}
        />
        {!hasSignature && (
          <p className="text-xs text-gray-400 text-center mt-1">Sign using your finger or mouse</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={onSubmit} disabled={!canSubmit || submitting} className="btn-primary flex-1">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Submit Check-in
        </button>
      </div>
    </div>
  );
}

function StepDone({ hotel, reservation, upsells, setUpsells }: {
  hotel: Hotel | null;
  reservation: Reservation | null;
  upsells: { lateCheckout: boolean; breakfast: boolean; parking: boolean };
  setUpsells: (u: typeof upsells) => void;
}) {
  const UPSELL_OPTIONS = [
    { key: 'lateCheckout', icon: Clock, label: 'Late Check-out', desc: 'Extend your stay until 14:00', price: 25 },
    { key: 'breakfast',    icon: Coffee, label: 'Breakfast',     desc: 'Continental breakfast daily',  price: 15 },
    { key: 'parking',      icon: Car,    label: 'Parking',       desc: 'Secure car park on-site',      price: 10 },
  ] as const;

  return (
    <div className="p-6 space-y-6 text-center">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-fade-in">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">You're all set!</h2>
        <p className="text-gray-500 mt-2">Your digital check-in is complete. We look forward to welcoming you.</p>
        {hotel?.check_in_time && (
          <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Your room will be ready from {hotel.check_in_time}
          </div>
        )}
      </div>

      <div className="text-left space-y-3">
        <p className="text-sm font-semibold text-gray-700">Enhance your stay</p>
        {UPSELL_OPTIONS.map(opt => {
          const active = upsells[opt.key];
          return (
            <div key={opt.key} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${active ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-blue-600' : 'bg-white border border-gray-200'}`}>
                <opt.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <p className="text-sm font-bold text-gray-900">+€{opt.price}</p>
                <button
                  onClick={() => setUpsells({ ...upsells, [opt.key]: !active })}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    active ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {active ? 'Added' : 'Add to stay'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 text-left">
        <p className="font-medium text-gray-700 mb-1">What happens next?</p>
        <p>You'll receive a confirmation email shortly. When you arrive, head straight to reception — your details are already with us.</p>
        {reservation?.confirmation_code && (
          <p className="mt-2 font-mono text-xs bg-white border border-gray-100 rounded px-2 py-1 inline-block">Ref: {reservation.confirmation_code}</p>
        )}
      </div>
    </div>
  );
}

function NavButtons({ onBack, onNext, nextDisabled }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onBack} className="btn-secondary flex-1">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <button onClick={onNext} disabled={nextDisabled} className="btn-primary flex-1">
        Continue <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
