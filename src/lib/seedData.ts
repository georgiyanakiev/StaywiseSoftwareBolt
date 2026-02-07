import { supabase } from './supabase';
import { generateConfirmationCode, generateInvoiceNumber } from './utils';
import { format, subDays, addDays } from 'date-fns';

export async function seedHotelData(hotelId: string) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const roomTypes = [
    { hotel_id: hotelId, name: 'Standard', description: 'Comfortable room with modern amenities', base_rate: 129, max_occupancy: 2, bed_type: 'Queen', amenities: ['WiFi', 'TV', 'Air Conditioning', 'Safe', 'Hair Dryer'], image_url: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { hotel_id: hotelId, name: 'Deluxe', description: 'Spacious room with premium furnishings and city view', base_rate: 199, max_occupancy: 2, bed_type: 'King', amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Safe', 'Coffee Maker', 'Bathtub', 'Hair Dryer', 'Desk'], image_url: 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { hotel_id: hotelId, name: 'Suite', description: 'Luxurious suite with separate living area and premium amenities', base_rate: 349, max_occupancy: 3, bed_type: 'King', amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Safe', 'Coffee Maker', 'Bathtub', 'Room Service', 'Desk', 'Iron', 'Hair Dryer'], image_url: 'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { hotel_id: hotelId, name: 'Family Room', description: 'Perfect for families with extra space and twin beds', base_rate: 249, max_occupancy: 4, bed_type: 'Twin', amenities: ['WiFi', 'TV', 'Air Conditioning', 'Safe', 'Coffee Maker', 'Shower', 'Desk', 'Hair Dryer'], image_url: 'https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { hotel_id: hotelId, name: 'Presidential Suite', description: 'The finest accommodation with panoramic views and butler service', base_rate: 599, max_occupancy: 4, bed_type: 'King', amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Sea View', 'Room Service', 'Safe', 'Coffee Maker', 'Bathtub', 'Shower', 'Desk', 'Iron', 'Hair Dryer'], image_url: 'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=600' },
  ];

  const { data: insertedTypes } = await supabase.from('room_types').insert(roomTypes).select();
  if (!insertedTypes) return;

  const typeMap: Record<string, string> = {};
  insertedTypes.forEach(t => { typeMap[t.name] = t.id; });

  const roomsData = [
    ...Array.from({ length: 8 }, (_, i) => ({ hotel_id: hotelId, room_type_id: typeMap['Standard'], number: `${100 + i + 1}`, floor: 1, status: i < 3 ? 'occupied' : i < 5 ? 'available' : i === 5 ? 'dirty' : 'clean' })),
    ...Array.from({ length: 6 }, (_, i) => ({ hotel_id: hotelId, room_type_id: typeMap['Deluxe'], number: `${200 + i + 1}`, floor: 2, status: i < 2 ? 'occupied' : i < 4 ? 'available' : 'clean' })),
    ...Array.from({ length: 4 }, (_, i) => ({ hotel_id: hotelId, room_type_id: typeMap['Suite'], number: `${300 + i + 1}`, floor: 3, status: i === 0 ? 'occupied' : i === 1 ? 'maintenance' : 'available' })),
    ...Array.from({ length: 3 }, (_, i) => ({ hotel_id: hotelId, room_type_id: typeMap['Family Room'], number: `${400 + i + 1}`, floor: 4, status: i === 0 ? 'occupied' : 'available' })),
    { hotel_id: hotelId, room_type_id: typeMap['Presidential Suite'], number: '501', floor: 5, status: 'available' },
    { hotel_id: hotelId, room_type_id: typeMap['Presidential Suite'], number: '502', floor: 5, status: 'occupied' },
  ];

  const { data: insertedRooms } = await supabase.from('rooms').insert(roomsData).select();
  if (!insertedRooms) return;

  const guestsData = [
    { hotel_id: hotelId, first_name: 'James', last_name: 'Wilson', email: 'james.wilson@email.com', phone: '+1 555-0101', country: 'United States', city: 'New York', nationality: 'American', vip_status: 'gold', total_stays: 12, total_spent: 8450 },
    { hotel_id: hotelId, first_name: 'Emma', last_name: 'Thompson', email: 'emma.t@email.com', phone: '+44 20-7946-0958', country: 'United Kingdom', city: 'London', nationality: 'British', vip_status: 'platinum', total_stays: 24, total_spent: 18200 },
    { hotel_id: hotelId, first_name: 'Carlos', last_name: 'Rivera', email: 'carlos.r@email.com', phone: '+34 612-345-678', country: 'Spain', city: 'Madrid', nationality: 'Spanish', vip_status: 'silver', total_stays: 6, total_spent: 3200 },
    { hotel_id: hotelId, first_name: 'Yuki', last_name: 'Tanaka', email: 'yuki.tanaka@email.com', phone: '+81 90-1234-5678', country: 'Japan', city: 'Tokyo', nationality: 'Japanese', vip_status: 'gold', total_stays: 15, total_spent: 12800 },
    { hotel_id: hotelId, first_name: 'Sophie', last_name: 'Martin', email: 'sophie.m@email.com', phone: '+33 6-12-34-56-78', country: 'France', city: 'Paris', nationality: 'French', vip_status: 'regular', total_stays: 2, total_spent: 980 },
    { hotel_id: hotelId, first_name: 'Michael', last_name: 'Chen', email: 'michael.chen@email.com', phone: '+86 138-0013-8000', country: 'China', city: 'Shanghai', nationality: 'Chinese', vip_status: 'gold', total_stays: 8, total_spent: 6700 },
    { hotel_id: hotelId, first_name: 'Anna', last_name: 'Kowalski', email: 'anna.k@email.com', phone: '+48 512-345-678', country: 'Poland', city: 'Warsaw', nationality: 'Polish', vip_status: 'regular', total_stays: 1, total_spent: 450 },
    { hotel_id: hotelId, first_name: 'Ahmed', last_name: 'Al-Rashid', email: 'ahmed.ar@email.com', phone: '+971 50-123-4567', country: 'UAE', city: 'Dubai', nationality: 'Emirati', vip_status: 'platinum', total_stays: 18, total_spent: 22500 },
    { hotel_id: hotelId, first_name: 'Lisa', last_name: 'Anderson', email: 'lisa.a@email.com', phone: '+1 555-0202', country: 'United States', city: 'Chicago', nationality: 'American', vip_status: 'silver', total_stays: 5, total_spent: 2900 },
    { hotel_id: hotelId, first_name: 'Marco', last_name: 'Rossi', email: 'marco.r@email.com', phone: '+39 333-123-4567', country: 'Italy', city: 'Rome', nationality: 'Italian', vip_status: 'regular', total_stays: 3, total_spent: 1250 },
    { hotel_id: hotelId, first_name: 'Sarah', last_name: 'O\'Brien', email: 'sarah.ob@email.com', phone: '+353 87-123-4567', country: 'Ireland', city: 'Dublin', nationality: 'Irish', vip_status: 'gold', total_stays: 10, total_spent: 7800 },
    { hotel_id: hotelId, first_name: 'Hans', last_name: 'Mueller', email: 'hans.m@email.com', phone: '+49 170-1234567', country: 'Germany', city: 'Berlin', nationality: 'German', vip_status: 'regular', total_stays: 2, total_spent: 640 },
    { hotel_id: hotelId, first_name: 'Priya', last_name: 'Sharma', email: 'priya.s@email.com', phone: '+91 98765-43210', country: 'India', city: 'Mumbai', nationality: 'Indian', vip_status: 'silver', total_stays: 4, total_spent: 2100 },
    { hotel_id: hotelId, first_name: 'David', last_name: 'Kim', email: 'david.kim@email.com', phone: '+82 10-1234-5678', country: 'South Korea', city: 'Seoul', nationality: 'Korean', vip_status: 'regular', total_stays: 1, total_spent: 349 },
    { hotel_id: hotelId, first_name: 'Olivia', last_name: 'Brown', email: 'olivia.b@email.com', phone: '+61 412-345-678', country: 'Australia', city: 'Sydney', nationality: 'Australian', vip_status: 'gold', total_stays: 9, total_spent: 5600 },
  ];

  const { data: insertedGuests } = await supabase.from('guests').insert(guestsData).select();
  if (!insertedGuests) return;

  const occupiedRooms = insertedRooms.filter(r => r.status === 'occupied');
  const sources = ['direct', 'website', 'booking.com', 'expedia', 'airbnb', 'corporate'];
  const methods = ['credit_card', 'debit_card', 'cash', 'bank_transfer'];

  const reservationsData = [];

  for (let i = 0; i < Math.min(occupiedRooms.length, insertedGuests.length); i++) {
    const room = occupiedRooms[i];
    const guest = insertedGuests[i];
    const roomType = insertedTypes.find(t => t.id === room.room_type_id);
    const nights = 2 + Math.floor(Math.random() * 5);
    const checkIn = format(subDays(today, Math.floor(Math.random() * 3)), 'yyyy-MM-dd');
    const checkOut = format(addDays(new Date(checkIn), nights), 'yyyy-MM-dd');
    const rate = roomType?.base_rate || 129;
    const taxAmount = Math.round(rate * nights * 0.1);
    const total = rate * nights + taxAmount;

    reservationsData.push({
      hotel_id: hotelId, guest_id: guest.id, room_id: room.id, room_type_id: room.room_type_id,
      check_in: checkIn, check_out: checkOut, adults: 1 + Math.floor(Math.random() * 2), children: 0,
      status: 'checked_in', base_rate: rate, total_amount: total, tax_amount: taxAmount,
      discount_amount: 0, payment_status: Math.random() > 0.3 ? 'paid' : 'partial',
      amount_paid: Math.random() > 0.3 ? total : Math.round(total * 0.5),
      payment_method: methods[Math.floor(Math.random() * methods.length)],
      booking_source: sources[Math.floor(Math.random() * sources.length)],
      confirmation_code: generateConfirmationCode(),
    });
  }

  for (let i = 0; i < 8; i++) {
    const guestIdx = (occupiedRooms.length + i) % insertedGuests.length;
    const guest = insertedGuests[guestIdx];
    const rtIdx = Math.floor(Math.random() * insertedTypes.length);
    const roomType = insertedTypes[rtIdx];
    const availableRooms = insertedRooms.filter(r => r.room_type_id === roomType.id && r.status !== 'occupied' && r.status !== 'maintenance');
    const nights = 1 + Math.floor(Math.random() * 7);
    const checkIn = format(addDays(today, 1 + Math.floor(Math.random() * 14)), 'yyyy-MM-dd');
    const checkOut = format(addDays(new Date(checkIn), nights), 'yyyy-MM-dd');
    const rate = roomType.base_rate;
    const taxAmount = Math.round(rate * nights * 0.1);
    const total = rate * nights + taxAmount;

    reservationsData.push({
      hotel_id: hotelId, guest_id: guest.id, room_id: availableRooms.length > 0 ? availableRooms[0].id : null,
      room_type_id: roomType.id, check_in: checkIn, check_out: checkOut,
      adults: 1 + Math.floor(Math.random() * 2), children: Math.random() > 0.7 ? 1 : 0,
      status: i < 4 ? 'confirmed' : 'pending',
      base_rate: rate, total_amount: total, tax_amount: taxAmount, discount_amount: 0,
      payment_status: i < 2 ? 'paid' : 'pending',
      amount_paid: i < 2 ? total : 0,
      payment_method: i < 2 ? methods[Math.floor(Math.random() * methods.length)] : '',
      booking_source: sources[Math.floor(Math.random() * sources.length)],
      confirmation_code: generateConfirmationCode(),
    });
  }

  for (let i = 0; i < 10; i++) {
    const guestIdx = Math.floor(Math.random() * insertedGuests.length);
    const guest = insertedGuests[guestIdx];
    const rtIdx = Math.floor(Math.random() * insertedTypes.length);
    const roomType = insertedTypes[rtIdx];
    const matchingRooms = insertedRooms.filter(r => r.room_type_id === roomType.id);
    const room = matchingRooms[Math.floor(Math.random() * matchingRooms.length)];
    const nights = 1 + Math.floor(Math.random() * 5);
    const daysAgo = 3 + Math.floor(Math.random() * 25);
    const checkIn = format(subDays(today, daysAgo + nights), 'yyyy-MM-dd');
    const checkOut = format(subDays(today, daysAgo), 'yyyy-MM-dd');
    const rate = roomType.base_rate;
    const taxAmount = Math.round(rate * nights * 0.1);
    const total = rate * nights + taxAmount;

    reservationsData.push({
      hotel_id: hotelId, guest_id: guest.id, room_id: room?.id || null,
      room_type_id: roomType.id, check_in: checkIn, check_out: checkOut,
      adults: 1 + Math.floor(Math.random() * 2), children: 0,
      status: i < 8 ? 'checked_out' : 'cancelled',
      base_rate: rate, total_amount: total, tax_amount: taxAmount, discount_amount: 0,
      payment_status: i < 8 ? 'paid' : 'pending',
      amount_paid: i < 8 ? total : 0,
      payment_method: i < 8 ? methods[Math.floor(Math.random() * methods.length)] : '',
      booking_source: sources[Math.floor(Math.random() * sources.length)],
      confirmation_code: generateConfirmationCode(),
      cancellation_reason: i >= 8 ? 'Change of plans' : '',
    });
  }

  const { data: insertedReservations } = await supabase.from('reservations').insert(reservationsData).select();

  if (insertedReservations) {
    const invoicesData = insertedReservations
      .filter(r => r.status === 'checked_out' || r.status === 'checked_in')
      .slice(0, 12)
      .map(r => ({
        hotel_id: hotelId,
        reservation_id: r.id,
        guest_id: r.guest_id,
        invoice_number: generateInvoiceNumber(),
        issue_date: r.check_in,
        due_date: r.check_out,
        subtotal: r.total_amount - r.tax_amount,
        tax_amount: r.tax_amount,
        discount_amount: 0,
        total_amount: r.total_amount,
        amount_paid: r.amount_paid,
        status: r.payment_status === 'paid' ? 'paid' : 'sent',
      }));

    const { data: insertedInvoices } = await supabase.from('invoices').insert(invoicesData).select();

    if (insertedInvoices) {
      const itemsData = insertedInvoices.map(inv => {
        const res = insertedReservations.find(r => r.id === inv.reservation_id);
        const rt = insertedTypes.find(t => t.id === res?.room_type_id);
        return {
          invoice_id: inv.id,
          description: `${rt?.name || 'Room'} - ${res?.check_in} to ${res?.check_out}`,
          category: 'room',
          quantity: 1,
          unit_price: inv.subtotal,
          total_price: inv.subtotal,
        };
      });
      await supabase.from('invoice_items').insert(itemsData);
    }
  }

  const dirtyRooms = insertedRooms.filter(r => r.status === 'dirty' || r.status === 'clean');
  const staffNames = ['Maria Garcia', 'John Smith', 'Ana Lopez', 'Tom Brown'];
  const housekeepingData = dirtyRooms.map((room, i) => ({
    hotel_id: hotelId, room_id: room.id,
    task_type: 'clean' as const,
    priority: (i === 0 ? 'high' : 'normal') as 'high' | 'normal',
    status: (room.status === 'dirty' ? 'pending' : 'completed') as 'pending' | 'completed',
    assigned_to: staffNames[i % staffNames.length],
    completed_at: room.status === 'clean' ? todayStr + 'T10:00:00Z' : null,
  }));

  const additionalTasks = insertedRooms.slice(0, 4).map((room, i) => ({
    hotel_id: hotelId, room_id: room.id,
    task_type: (['linen_change', 'restock', 'deep_clean', 'inspection'] as const)[i],
    priority: (['normal', 'low', 'high', 'normal'] as const)[i],
    status: (['pending', 'in_progress', 'completed', 'pending'] as const)[i],
    assigned_to: staffNames[i % staffNames.length],
    completed_at: i === 2 ? todayStr + 'T09:30:00Z' : null,
  }));

  await supabase.from('housekeeping_tasks').insert([...housekeepingData, ...additionalTasks]);

  const maintenanceRoom = insertedRooms.find(r => r.status === 'maintenance');
  if (maintenanceRoom) {
    await supabase.from('maintenance_requests').insert([
      { hotel_id: hotelId, room_id: maintenanceRoom.id, description: 'Air conditioning unit making unusual noise', priority: 'high', status: 'in_progress', assigned_to: 'Mike Johnson', cost: 150 },
      { hotel_id: hotelId, room_id: insertedRooms[0].id, description: 'Bathroom faucet dripping', priority: 'medium', status: 'reported', assigned_to: '', cost: 0 },
    ]);
  }
}
