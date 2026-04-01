import { useState, useEffect } from 'react';
import { Building2, ChevronRight, Check, Users, Loader2, ArrowLeft, Tag, CalendarDays, MapPin, Phone, Mail, Star, Plus, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import LegalFooter from '../../components/legal/LegalFooter';

interface RoomType {
  id: string;
  name: string;
  description: string;
  base_rate: number;
  max_occupancy: number;
  bed_type: string;
  amenities: string[];
  image_url: string;
}

interface UpsellItem {
  id: string;
  name: string;
  description: string;
  price: number;
  price_type: string;
  image_url: string;
  category: string;
}

interface Config {
  check_in_time: string;
  check_out_time: string;
  currency: string;
  cancellation_policy: string;
  require_deposit: boolean;
  deposit_percentage: number;
  welcome_message: string;
}

type Step = 1 | 2 | 3 | 4;

const ROOM_IMAGES = [
  'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahamas','Bahrain','Bangladesh','Belarus','Belgium','Belize','Bolivia','Bosnia and Herzegovina',
  'Brazil','Bulgaria','Cambodia','Canada','Chile','China','Colombia','Croatia','Cuba','Cyprus',
  'Czech Republic','Denmark','Ecuador','Egypt','Estonia','Ethiopia','Finland','France','Georgia','Germany',
  'Ghana','Greece','Guatemala','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland',
  'Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kosovo','Kuwait','Latvia','Lebanon',
  'Libya','Lithuania','Luxembourg','Malaysia','Malta','Mexico','Moldova','Monaco','Mongolia','Montenegro',
  'Morocco','Netherlands','New Zealand','Nigeria','North Macedonia','Norway','Oman','Pakistan','Panama',
  'Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Senegal','Serbia',
  'Singapore','Slovakia','Slovenia','Somalia','South Africa','Spain','Sri Lanka','Sudan','Sweden',
  'Switzerland','Syria','Taiwan','Thailand','Tunisia','Turkey','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zimbabwe',
];

function generateICS(booking: {
  confirmationNumber: string;
  guestName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  hotelName: string;
}) {
  const toDate = (d: string) => d.replace(/-/g, '');
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StayWise//BookingEngine//EN',
    'BEGIN:VEVENT',
    `UID:${booking.confirmationNumber}@staywise`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${toDate(booking.checkIn)}`,
    `DTEND;VALUE=DATE:${toDate(booking.checkOut)}`,
    `SUMMARY:${booking.hotelName} – ${booking.roomName}`,
    `DESCRIPTION:Booking confirmation: ${booking.confirmationNumber}\\nGuest: ${booking.guestName}`,
    `LOCATION:${booking.hotelName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

const STEP_LABELS = ['Select Dates', 'Choose Room', 'Your Details', 'Confirmed'];

export default function BookingWidgetPage() {
  const { tenant } = useTenant();
  const primaryColor = tenant?.primary_color ?? '#1d4ed8';
  const hotelName = tenant?.name ?? 'Direct Booking';

  const [step, setStep] = useState<Step>(1);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [config, setConfig] = useState<Config | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCountry, setGuestCountry] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [dateError, setDateError] = useState('');

  const [loading, setLoading] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [hotelId, setHotelId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [upsellItems, setUpsellItems] = useState<UpsellItem[]>([]);
  const [selectedUpsells, setSelectedUpsells] = useState<Set<string>>(new Set());
  const [savingUpsell, setSavingUpsell] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hid = params.get('hotel') ?? '';
    const tid = params.get('tenant') ?? '';
    setHotelId(hid);
    setTenantId(tid);

    if (hid) {
      supabase.from('booking_engine_config').select('*').eq('hotel_id', hid).maybeSingle()
        .then(({ data }) => { if (data) setConfig(data as Config); });
      supabase.from('upsell_items').select('id, name, description, price, price_type, image_url, category')
        .eq('hotel_id', hid).eq('active', true).order('sort_order').limit(3)
        .then(({ data }) => { if (data) setUpsellItems(data as UpsellItem[]); });
    }
  }, []);

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  const today = new Date().toISOString().split('T')[0];
  const currency = config?.currency ?? 'EUR';
  const depositPct = config?.deposit_percentage ?? 30;
  const requireDeposit = config?.require_deposit ?? true;
  const total = selectedRoom ? selectedRoom.base_rate * nights : 0;
  const depositAmount = requireDeposit ? (total * depositPct) / 100 : 0;

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amt);
  };

  const validateDates = () => {
    if (!checkIn || !checkOut) { setDateError('Please select both check-in and check-out dates.'); return false; }
    if (checkIn < today) { setDateError('Check-in date cannot be in the past.'); return false; }
    if (checkOut <= checkIn) { setDateError('Check-out must be after check-in.'); return false; }
    setDateError('');
    return true;
  };

  const searchRooms = async () => {
    if (!validateDates()) return;
    setLoading(true);
    const query = hotelId
      ? supabase.from('room_types').select('*').eq('hotel_id', hotelId)
      : supabase.from('room_types').select('*').limit(10);
    const { data } = await query;
    const filtered = (data ?? []).filter(rt => rt.max_occupancy >= adults);
    setRoomTypes(filtered);
    setLoading(false);
    setStep(2);
  };

  const submitBooking = async () => {
    if (!selectedRoom) return;
    setLoading(true);
    const confNum = `SW-${Math.floor(100000 + Math.random() * 900000)}`;

    const payload: Record<string, unknown> = {
      confirmation_number: confNum,
      room_type_id: selectedRoom.id,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      guest_country: guestCountry,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      children,
      rate_per_night: selectedRoom.base_rate,
      subtotal: total,
      tax_amount: 0,
      total_amount: total,
      deposit_amount: depositAmount,
      special_requests: specialRequests,
      promo_code: promoCode,
      status: 'confirmed',
      source: 'direct',
    };
    if (hotelId) payload.hotel_id = hotelId;
    if (tenantId) payload.tenant_id = tenantId;

    const { data: inserted } = await supabase.from('direct_bookings').insert(payload).select('id').maybeSingle();
    if (inserted?.id) setBookingId(inserted.id);
    setConfirmationNumber(confNum);
    setLoading(false);
    setStep(4);
  };

  const downloadICS = () => {
    const ics = generateICS({
      confirmationNumber,
      guestName,
      roomName: selectedRoom?.name ?? '',
      checkIn,
      checkOut,
      hotelName,
    });
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${confirmationNumber}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleUpsell = async (item: UpsellItem) => {
    const next = new Set(selectedUpsells);
    if (next.has(item.id)) {
      next.delete(item.id);
      setSelectedUpsells(next);
      return;
    }
    next.add(item.id);
    setSelectedUpsells(next);
    if (!hotelId) return;
    setSavingUpsell(true);
    const orderPayload: Record<string, unknown> = {
      hotel_id: hotelId,
      guest_name: guestName,
      upsell_item_id: item.id,
      item_name: item.name,
      quantity: 1,
      unit_price: item.price,
      total_price: item.price,
      status: 'pending',
    };
    if (bookingId) orderPayload.booking_id = bookingId;
    if (tenantId) orderPayload.tenant_id = tenantId;
    await supabase.from('upsell_orders').insert(orderPayload);
    setSavingUpsell(false);
  };

  const resetWidget = () => {
    setStep(1);
    setCheckIn(''); setCheckOut('');
    setAdults(2); setChildren(0);
    setSelectedRoom(null);
    setGuestName(''); setGuestEmail(''); setGuestPhone('');
    setGuestCountry(''); setSpecialRequests(''); setPromoCode('');
    setConfirmationNumber('');
    setBookingId('');
    setSelectedUpsells(new Set());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center p-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, ${primaryColor}ee, ${primaryColor})` }}>
            <div className="flex items-center gap-3 mb-4">
              {tenant?.logo_url ? (
                <img src={tenant.logo_url} alt={hotelName} className="w-9 h-9 rounded-lg object-contain bg-white/10 p-0.5" />
              ) : (
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <p className="text-white font-semibold">{hotelName}</p>
                <p className="text-white/70 text-xs">{config?.welcome_message ?? 'Best rate guaranteed — no commission'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step >= s ? 'bg-white shadow-sm' : 'bg-white/20 text-white/60'
                    }`}
                    style={step >= s ? { color: primaryColor } : undefined}
                  >
                    {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                  </div>
                  {s < 4 && <div className={`h-0.5 w-8 sm:w-12 transition-all ${step > s ? 'bg-white' : 'bg-white/20'}`} />}
                </div>
              ))}
              <span className="ml-2 text-white/80 text-xs whitespace-nowrap">
                Step {step}/4 — {STEP_LABELS[step - 1]}
              </span>
            </div>
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">When are you staying?</h2>
                  <p className="text-sm text-gray-500 mt-1">Select your check-in and check-out dates</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-in Date</label>
                    <input
                      type="date"
                      min={today}
                      value={checkIn}
                      onChange={e => { setCheckIn(e.target.value); setDateError(''); }}
                      className="input-field"
                    />
                    {config?.check_in_time && (
                      <p className="text-xs text-gray-400 mt-1">Check-in from {config.check_in_time}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-out Date</label>
                    <input
                      type="date"
                      min={checkIn || today}
                      value={checkOut}
                      onChange={e => { setCheckOut(e.target.value); setDateError(''); }}
                      className="input-field"
                    />
                    {config?.check_out_time && (
                      <p className="text-xs text-gray-400 mt-1">Check-out by {config.check_out_time}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Adults</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
                      <button
                        type="button"
                        onClick={() => setAdults(a => Math.max(1, a - 1))}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors"
                      >−</button>
                      <span className="flex-1 text-center font-semibold text-gray-900">{adults}</span>
                      <button
                        type="button"
                        onClick={() => setAdults(a => Math.min(8, a + 1))}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors"
                        style={{ color: adults >= 8 ? undefined : undefined }}
                      >+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Children</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
                      <button
                        type="button"
                        onClick={() => setChildren(c => Math.max(0, c - 1))}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors"
                      >−</button>
                      <span className="flex-1 text-center font-semibold text-gray-900">{children}</span>
                      <button
                        type="button"
                        onClick={() => setChildren(c => Math.min(6, c + 1))}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors"
                      >+</button>
                    </div>
                  </div>
                </div>

                {nights > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: primaryColor }}>
                    <CalendarDays className="w-4 h-4" />
                    {nights} night{nights !== 1 ? 's' : ''} · {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''}
                  </div>
                )}

                {dateError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 border border-red-100">{dateError}</p>
                )}

                <button
                  onClick={searchRooms}
                  disabled={!checkIn || !checkOut}
                  className="w-full py-3.5 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                  Search Available Rooms
                </button>

                {config?.cancellation_policy && (
                  <p className="text-xs text-gray-400 text-center">{config.cancellation_policy}</p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep(1)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Choose your room</h2>
                    <p className="text-sm text-gray-500">{nights} night{nights !== 1 ? 's' : ''} · {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''}</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} /></div>
                ) : roomTypes.length === 0 ? (
                  <div className="py-16 text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-gray-500">No rooms available</p>
                    <p className="text-sm text-gray-400 mt-1">No rooms available for {adults} guest{adults !== 1 ? 's' : ''} on those dates</p>
                    <button onClick={() => setStep(1)} className="mt-4 text-sm font-medium underline" style={{ color: primaryColor }}>
                      Change dates
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {roomTypes.map((rt, i) => (
                      <div
                        key={rt.id}
                        className="border-2 border-gray-100 rounded-xl overflow-hidden cursor-pointer hover:border-blue-300 transition-all group"
                        style={{ borderColor: undefined }}
                        onClick={() => { setSelectedRoom(rt); setStep(3); }}
                      >
                        <div className="flex gap-0 sm:gap-4">
                          <div className="relative w-28 sm:w-36 flex-shrink-0">
                            <img
                              src={rt.image_url || ROOM_IMAGES[i % ROOM_IMAGES.length]}
                              alt={rt.name}
                              className="w-full h-full object-cover"
                              style={{ minHeight: '120px' }}
                              onError={e => { (e.target as HTMLImageElement).src = ROOM_IMAGES[i % ROOM_IMAGES.length]; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-900">{rt.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {rt.description || `${rt.bed_type} · Up to ${rt.max_occupancy} guests`}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-bold" style={{ color: primaryColor }}>{formatAmount(rt.base_rate * nights)}</p>
                                <p className="text-xs text-gray-400">{formatAmount(rt.base_rate)}/night</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Users className="w-3 h-3" /> Up to {rt.max_occupancy}
                              </span>
                              {rt.bed_type && <span className="text-xs text-gray-400">{rt.bed_type}</span>}
                              {(rt.amenities ?? []).slice(0, 3).map((a, ai) => (
                                <span key={ai} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a}</span>
                              ))}
                            </div>
                            {requireDeposit && (
                              <p className="text-xs text-gray-400 mt-2">
                                Deposit: {formatAmount((rt.base_rate * nights * depositPct) / 100)} ({depositPct}%)
                              </p>
                            )}
                          </div>
                          <div className="flex items-center pr-3">
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && selectedRoom && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep(2)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Your details</h2>
                    <p className="text-sm text-gray-500">Almost there — we just need a few details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  <div className="lg:col-span-3 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={e => setGuestName(e.target.value)}
                          className="input-field"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={guestEmail}
                            onChange={e => setGuestEmail(e.target.value)}
                            className="input-field pl-9"
                            placeholder="john@example.com"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            value={guestPhone}
                            onChange={e => setGuestPhone(e.target.value)}
                            className="input-field pl-9"
                            placeholder="+1 234 567 8900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <select
                            value={guestCountry}
                            onChange={e => setGuestCountry(e.target.value)}
                            className="input-field pl-9 bg-white"
                          >
                            <option value="">Select country...</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Requests</label>
                        <textarea
                          value={specialRequests}
                          onChange={e => setSpecialRequests(e.target.value)}
                          className="input-field resize-none"
                          rows={3}
                          placeholder="Early check-in, room preferences, dietary requirements..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Promo Code</label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={promoCode}
                            onChange={e => setPromoCode(e.target.value.toUpperCase())}
                            className="input-field pl-9 font-mono uppercase"
                            placeholder="SUMMER25"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 rounded-xl p-4 sticky top-4 space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">Booking Summary</h4>
                      <img
                        src={selectedRoom.image_url || ROOM_IMAGES[0]}
                        alt={selectedRoom.name}
                        className="w-full h-28 object-cover rounded-lg"
                        onError={e => { (e.target as HTMLImageElement).src = ROOM_IMAGES[0]; }}
                      />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Room</span>
                          <span className="font-medium text-gray-900 text-right">{selectedRoom.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Check-in</span>
                          <span className="font-medium text-gray-900">{checkIn}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Check-out</span>
                          <span className="font-medium text-gray-900">{checkOut}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Guests</span>
                          <span className="font-medium text-gray-900">{adults + children}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{nights} night{nights !== 1 ? 's' : ''} × {formatAmount(selectedRoom.base_rate)}</span>
                          <span className="font-medium text-gray-900">{formatAmount(total)}</span>
                        </div>
                        {requireDeposit && (
                          <div className="flex justify-between text-amber-600">
                            <span>Deposit due now ({depositPct}%)</span>
                            <span className="font-semibold">{formatAmount(depositAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900">
                          <span>Total</span>
                          <span style={{ color: primaryColor }}>{formatAmount(total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={submitBooking}
                  disabled={!guestName || !guestEmail || loading}
                  className="w-full py-3.5 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm Booking · {formatAmount(total)}
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-4">
                <div
                  className="w-18 h-18 rounded-full flex items-center justify-center mx-auto mb-4 border-4"
                  style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30`, width: 72, height: 72 }}
                >
                  <Check className="w-9 h-9" style={{ color: primaryColor }} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Booking Confirmed!</h2>
                <p className="text-gray-500 mb-1">A confirmation has been sent to</p>
                <p className="font-medium text-gray-700 mb-6">{guestEmail}</p>

                <div className="text-4xl font-black font-mono tracking-widest mb-6" style={{ color: primaryColor }}>
                  {confirmationNumber}
                </div>

                <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-6 border border-gray-100">
                  {[
                    { label: 'Guest',      value: guestName },
                    { label: 'Room',       value: selectedRoom?.name ?? '' },
                    { label: 'Check-in',   value: checkIn },
                    { label: 'Check-out',  value: checkOut },
                    { label: 'Nights',     value: String(nights) },
                    { label: 'Guests',     value: `${adults} adult${adults !== 1 ? 's' : ''}${children > 0 ? ` + ${children} child${children !== 1 ? 'ren' : ''}` : ''}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                  {requireDeposit && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>Deposit due</span>
                      <span className="font-semibold">{formatAmount(depositAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-3">
                    <span className="font-semibold text-gray-700">Total</span>
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>{formatAmount(total)}</span>
                  </div>
                </div>

                {config?.cancellation_policy && (
                  <p className="text-xs text-gray-400 mb-5 px-2">{config.cancellation_policy}</p>
                )}

                {upsellItems.length > 0 && (
                  <div className="mb-6 text-left">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Enhance your stay</p>
                    <div className="space-y-2">
                      {upsellItems.map(item => {
                        const added = selectedUpsells.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${added ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
                          >
                            {item.image_url && (
                              <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                              {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900">+{formatAmount(item.price)}</p>
                              <button
                                onClick={() => toggleUpsell(item)}
                                disabled={savingUpsell}
                                className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                                  added
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                                }`}
                              >
                                {added ? <><CheckCircle className="w-3 h-3" /> Added</> : <><Plus className="w-3 h-3" /> Add</>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={downloadICS}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all hover:shadow-sm"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <CalendarDays className="w-4 h-4" />
                    Add to Calendar
                  </button>
                  <button
                    onClick={resetWidget}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    Back to Hotel Website
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by StayWise · Secure direct booking
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
