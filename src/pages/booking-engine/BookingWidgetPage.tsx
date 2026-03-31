import { useState, useEffect } from 'react';
import { Building2, ChevronRight, Check, Users, Calendar, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

type Step = 1 | 2 | 3 | 4;

const ROOM_IMAGES = [
  'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg?auto=compress&cs=tinysrgb&w=800',
];

export default function BookingWidgetPage() {
  const [step, setStep] = useState<Step>(1);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [hotelId, setHotelId] = useState('');
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hid = params.get('hotel') ?? '';
    const tid = params.get('tenant') ?? '';
    setHotelId(hid);
    setTenantId(tid);
  }, []);

  const searchRooms = async () => {
    if (!checkIn || !checkOut) return;
    setLoading(true);
    const query = hotelId
      ? supabase.from('room_types').select('*').eq('hotel_id', hotelId)
      : supabase.from('room_types').select('*').limit(10);
    const { data } = await query;
    setRoomTypes(data ?? []);
    setLoading(false);
    setStep(2);
  };

  const submitBooking = async () => {
    if (!selectedRoom) return;
    setLoading(true);
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
    const total = nights * selectedRoom.base_rate;
    const confNum = `SW-${Math.floor(100000 + Math.random() * 900000)}`;

    const payload: Record<string, unknown> = {
      confirmation_number: confNum,
      room_type_id: selectedRoom.id,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      children,
      rate_per_night: selectedRoom.base_rate,
      total_amount: total,
      special_requests: specialRequests,
      status: 'confirmed',
      source: 'direct',
    };
    if (hotelId) payload.hotel_id = hotelId;
    if (tenantId) payload.tenant_id = tenantId;

    await supabase.from('direct_bookings').insert(payload);
    setConfirmationNumber(confNum);
    setLoading(false);
    setStep(4);
  };

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Direct Booking</p>
              <p className="text-blue-200 text-xs">Best rate guaranteed — no commission</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-white text-blue-700' : 'bg-white/20 text-white/60'}`}>
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                {s < 4 && <div className={`h-0.5 w-8 transition-all ${step > s ? 'bg-white' : 'bg-white/20'}`} />}
              </div>
            ))}
            <span className="ml-2 text-white/80 text-xs">{['Select Dates', 'Choose Room', 'Your Details', 'Confirmed'][step - 1]}</span>
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">When are you arriving?</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-in</label>
                  <input type="date" min={today} value={checkIn} onChange={e => setCheckIn(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-out</label>
                  <input type="date" min={checkIn || today} value={checkOut} onChange={e => setCheckOut(e.target.value)} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adults</label>
                  <select value={adults} onChange={e => setAdults(Number(e.target.value))} className="input-field">
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Children</label>
                  <select value={children} onChange={e => setChildren(Number(e.target.value))} className="input-field">
                    {[0, 1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              {nights > 0 && (
                <p className="text-sm text-blue-600 font-medium">{nights} night{nights > 1 ? 's' : ''} selected</p>
              )}
              <button
                onClick={searchRooms}
                disabled={!checkIn || !checkOut || nights <= 0}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Search Available Rooms
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">Choose your room</h2>
              </div>
              <p className="text-sm text-gray-500">{nights} night{nights > 1 ? 's' : ''} · {adults} adult{adults > 1 ? 's' : ''}{children > 0 ? ` · ${children} child${children > 1 ? 'ren' : ''}` : ''}</p>

              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {roomTypes.map((rt, i) => (
                    <div
                      key={rt.id}
                      onClick={() => { setSelectedRoom(rt); setStep(3); }}
                      className="flex gap-4 p-4 border-2 border-gray-100 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                    >
                      <img
                        src={rt.image_url || ROOM_IMAGES[i % ROOM_IMAGES.length]}
                        alt={rt.name}
                        className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).src = ROOM_IMAGES[i % ROOM_IMAGES.length]; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900">{rt.name}</p>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-blue-700">${(rt.base_rate * nights).toFixed(0)}</p>
                            <p className="text-xs text-gray-400">${rt.base_rate}/night</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{rt.description || `${rt.bed_type} · Up to ${rt.max_occupancy} guests`}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Users className="w-3 h-3" /> Up to {rt.max_occupancy}
                          </span>
                          <span className="text-xs text-gray-400">{rt.bed_type}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 self-center flex-shrink-0 transition-colors" />
                    </div>
                  ))}
                  {roomTypes.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No rooms available for selected dates</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && selectedRoom && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(2)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">Your details</h2>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{selectedRoom.name}</p>
                  <p className="text-sm text-gray-500">{nights} nights · {checkIn} → {checkOut}</p>
                </div>
                <p className="text-lg font-bold text-blue-700">${(selectedRoom.base_rate * nights).toFixed(0)}</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                    <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} className="input-field" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                    <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="input-field" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="input-field" placeholder="+1 234 567 8900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Requests</label>
                    <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} className="input-field resize-none" rows={3} placeholder="Early check-in, room preferences..." />
                  </div>
                </div>
              </div>

              <button
                onClick={submitBooking}
                disabled={!guestName || !guestEmail || loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Booking · ${(selectedRoom.base_rate * nights).toFixed(0)}
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
              <p className="text-gray-500 mb-5">A confirmation has been sent to {guestEmail}</p>
              <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Confirmation #</span>
                  <span className="text-sm font-bold text-blue-700 font-mono">{confirmationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Guest</span>
                  <span className="text-sm font-medium text-gray-900">{guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Room</span>
                  <span className="text-sm font-medium text-gray-900">{selectedRoom?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Dates</span>
                  <span className="text-sm font-medium text-gray-900">{checkIn} → {checkOut}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3">
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-base font-bold text-gray-900">${selectedRoom ? (selectedRoom.base_rate * nights).toFixed(2) : '0.00'}</span>
                </div>
              </div>
              <button onClick={() => { setStep(1); setCheckIn(''); setCheckOut(''); setGuestName(''); setGuestEmail(''); }} className="text-sm text-blue-600 font-medium hover:underline">
                Make another booking
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
