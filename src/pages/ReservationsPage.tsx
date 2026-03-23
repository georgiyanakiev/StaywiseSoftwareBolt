import { useState, useEffect, useCallback, useMemo } from 'react';
import { useHotel } from '../contexts/HotelContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
  nightsBetween,
  generateConfirmationCode,
} from '../lib/utils';
import type { Reservation, Guest, Room, RoomType } from '../types';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import { CalendarCheck, Plus, Search, Filter, MoreVertical, Eye, CreditCard as Edit, XCircle, LogIn, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

const BOOKING_SOURCES = [
  'direct',
  'website',
  'booking.com',
  'expedia',
  'airbnb',
  'corporate',
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface ReservationForm {
  guest_id: string;
  new_guest_name: string;
  room_type_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  base_rate: number;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  payment_status: string;
  amount_paid: number;
  booking_source: string;
  special_requests: string;
  confirmation_code: string;
}

const emptyForm: ReservationForm = {
  guest_id: '',
  new_guest_name: '',
  room_type_id: '',
  room_id: '',
  check_in: '',
  check_out: '',
  adults: 1,
  children: 0,
  base_rate: 0,
  total_amount: 0,
  tax_amount: 0,
  discount_amount: 0,
  payment_method: '',
  payment_status: 'pending',
  amount_paid: 0,
  booking_source: 'direct',
  special_requests: '',
  confirmation_code: '',
};

export default function ReservationsPage() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    if (!currentHotel) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('reservations')
        .select('*, guest:guests(*), room:rooms(*, room_type:room_types(*)), room_type:room_types(*)', { count: 'exact' })
        .eq('hotel_id', currentHotel.id)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (dateFrom) {
        query = query.gte('check_in', dateFrom);
      }

      if (dateTo) {
        query = query.lte('check_out', dateTo);
      }

      const { data, count, error: queryError } = await query;

      if (queryError) {
        console.error('Error fetching reservations:', queryError);
        setError(queryError.message);
        toast('error', 'Failed to load reservations');
        return;
      }

      let results = (data || []) as Reservation[];

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        results = results.filter(
          r =>
            r.guest?.first_name?.toLowerCase().includes(q) ||
            r.guest?.last_name?.toLowerCase().includes(q) ||
            `${r.guest?.first_name} ${r.guest?.last_name}`.toLowerCase().includes(q) ||
            r.confirmation_code?.toLowerCase().includes(q)
        );
      }

      setReservations(results);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error in fetchReservations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
      toast('error', 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [currentHotel, page, statusFilter, dateFrom, dateTo, searchQuery, toast]);

  const fetchReferenceData = useCallback(async () => {
    if (!currentHotel) return;

    try {
      const [guestsRes, roomsRes, roomTypesRes] = await Promise.all([
        supabase.from('guests').select('*').eq('hotel_id', currentHotel.id).order('last_name'),
        supabase.from('rooms').select('*, room_type:room_types(*)').eq('hotel_id', currentHotel.id).order('number'),
        supabase.from('room_types').select('*').eq('hotel_id', currentHotel.id).order('name'),
      ]);

      if (guestsRes.error) console.error('Error fetching guests:', guestsRes.error);
      if (roomsRes.error) console.error('Error fetching rooms:', roomsRes.error);
      if (roomTypesRes.error) console.error('Error fetching room types:', roomTypesRes.error);

      setGuests((guestsRes.data || []) as Guest[]);
      setRooms((roomsRes.data || []) as Room[]);
      setRoomTypes((roomTypesRes.data || []) as RoomType[]);
    } catch (err) {
      console.error('Error in fetchReferenceData:', err);
    }
  }, [currentHotel]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchQuery, dateFrom, dateTo]);

  const filteredRooms = useMemo(() => {
    if (!form.room_type_id) return rooms;
    return rooms.filter(r => r.room_type_id === form.room_type_id);
  }, [rooms, form.room_type_id]);

  const nights = useMemo(() => {
    if (form.check_in && form.check_out) {
      const n = nightsBetween(form.check_in, form.check_out);
      return n > 0 ? n : 0;
    }
    return 0;
  }, [form.check_in, form.check_out]);

  const recalculate = useCallback(
    (updates: Partial<ReservationForm>) => {
      const merged = { ...form, ...updates };
      const n =
        merged.check_in && merged.check_out
          ? Math.max(nightsBetween(merged.check_in, merged.check_out), 0)
          : 0;
      const subtotal = n * merged.base_rate;
      const taxRate = currentHotel?.tax_rate || 0;
      const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
      const total = subtotal + tax - merged.discount_amount;
      return {
        ...merged,
        tax_amount: tax,
        total_amount: Math.max(total, 0),
      };
    },
    [form, currentHotel]
  );

  const updateForm = (updates: Partial<ReservationForm>) => {
    const needsRecalc =
      'base_rate' in updates ||
      'check_in' in updates ||
      'check_out' in updates ||
      'discount_amount' in updates;

    if (needsRecalc) {
      setForm(prev => recalculate({ ...prev, ...updates }));
    } else {
      setForm(prev => ({ ...prev, ...updates }));
    }
  };

  const handleRoomTypeChange = (roomTypeId: string) => {
    const rt = roomTypes.find(t => t.id === roomTypeId);
    updateForm({
      room_type_id: roomTypeId,
      room_id: '',
      base_rate: rt?.base_rate || 0,
    });
  };

  const openCreateModal = () => {
    setEditingReservation(null);
    setForm({ ...emptyForm, confirmation_code: generateConfirmationCode() });
    setModalOpen(true);
  };

  const openEditModal = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setForm({
      guest_id: reservation.guest_id,
      new_guest_name: '',
      room_type_id: reservation.room_type_id,
      room_id: reservation.room_id || '',
      check_in: reservation.check_in,
      check_out: reservation.check_out,
      adults: reservation.adults,
      children: reservation.children,
      base_rate: reservation.base_rate,
      total_amount: reservation.total_amount,
      tax_amount: reservation.tax_amount,
      discount_amount: reservation.discount_amount,
      payment_method: reservation.payment_method || '',
      payment_status: reservation.payment_status,
      amount_paid: reservation.amount_paid,
      booking_source: reservation.booking_source || 'direct',
      special_requests: reservation.special_requests || '',
      confirmation_code: reservation.confirmation_code,
    });
    setModalOpen(true);
    setActionMenuId(null);
  };

  const openViewModal = (reservation: Reservation) => {
    setViewingReservation(reservation);
    setActionMenuId(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingReservation(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!currentHotel) return;

    if (!form.guest_id && !form.new_guest_name.trim()) {
      toast('error', 'Please select or enter a guest');
      return;
    }

    if (!form.room_type_id) {
      toast('error', 'Please select a room type');
      return;
    }

    if (!form.check_in || !form.check_out) {
      toast('error', 'Please select check-in and check-out dates');
      return;
    }

    if (nightsBetween(form.check_in, form.check_out) < 1) {
      toast('error', 'Check-out must be after check-in');
      return;
    }

    const checkInDate = new Date(form.check_in);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!editingReservation && checkInDate < today) {
      toast('error', 'Check-in date cannot be in the past');
      return;
    }

    if (form.room_id) {
      const { data: conflictingReservations, error: checkError } = await supabase
        .from('reservations')
        .select('id, confirmation_code')
        .eq('hotel_id', currentHotel.id)
        .eq('room_id', form.room_id)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .or(`check_in.lte.${form.check_out},check_out.gte.${form.check_in}`);

      if (checkError) {
        toast('error', 'Failed to check room availability');
        return;
      }

      const conflicts = editingReservation
        ? (conflictingReservations || []).filter(r => r.id !== editingReservation.id)
        : (conflictingReservations || []);

      if (conflicts.length > 0) {
        toast('error', `Room is not available for the selected dates (Conflict with ${conflicts[0].confirmation_code})`);
        return;
      }
    }

    setSaving(true);

    let guestId = form.guest_id;

    if (!guestId && form.new_guest_name.trim()) {
      const parts = form.new_guest_name.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      const { data: newGuest, error: guestError } = await supabase
        .from('guests')
        .insert({
          hotel_id: currentHotel.id,
          first_name: firstName,
          last_name: lastName,
          email: '',
          phone: '',
          address: '',
          city: '',
          country: '',
          postal_code: '',
          id_number: '',
          nationality: '',
          notes: '',
          preferences: {},
        })
        .select()
        .single();

      if (guestError || !newGuest) {
        toast('error', 'Failed to create guest');
        setSaving(false);
        return;
      }

      guestId = newGuest.id;
      setGuests(prev => [...prev, newGuest as Guest]);
    }

    const payload = {
      hotel_id: currentHotel.id,
      guest_id: guestId,
      room_type_id: form.room_type_id,
      room_id: form.room_id || null,
      check_in: form.check_in,
      check_out: form.check_out,
      adults: form.adults,
      children: form.children,
      status: editingReservation ? editingReservation.status : ('pending' as const),
      base_rate: form.base_rate,
      total_amount: form.total_amount,
      tax_amount: form.tax_amount,
      discount_amount: form.discount_amount,
      payment_status: form.payment_status,
      amount_paid: form.amount_paid,
      payment_method: form.payment_method,
      booking_source: form.booking_source,
      special_requests: form.special_requests,
      confirmation_code: form.confirmation_code,
    };

    if (editingReservation) {
      const { error } = await supabase
        .from('reservations')
        .update(payload)
        .eq('id', editingReservation.id);

      if (error) {
        toast('error', 'Failed to update reservation');
        setSaving(false);
        return;
      }

      toast('success', 'Reservation updated');
    } else {
      const { error } = await supabase.from('reservations').insert(payload);

      if (error) {
        toast('error', 'Failed to create reservation');
        setSaving(false);
        return;
      }

      toast('success', 'Reservation created');
    }

    setSaving(false);
    closeModal();
    fetchReservations();
    fetchReferenceData();
  };

  const updateStatus = async (
    reservation: Reservation,
    newStatus: Reservation['status']
  ) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status: newStatus })
      .eq('id', reservation.id);

    if (error) {
      toast('error', 'Failed to update status');
      return;
    }

    if (newStatus === 'checked_in' && reservation.room_id) {
      await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', reservation.room_id);
    }

    if (newStatus === 'checked_out' && reservation.room_id) {
      await supabase
        .from('rooms')
        .update({ status: 'dirty' })
        .eq('id', reservation.room_id);

      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('reservation_id', reservation.id)
        .maybeSingle();

      if (!existingInvoice && currentHotel) {
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        const subtotal = reservation.total_amount - reservation.tax_amount;

        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            hotel_id: currentHotel.id,
            reservation_id: reservation.id,
            guest_id: reservation.guest_id,
            invoice_number: invoiceNumber,
            issue_date: reservation.check_in,
            due_date: reservation.check_out,
            subtotal: subtotal,
            tax_amount: reservation.tax_amount,
            discount_amount: reservation.discount_amount,
            total_amount: reservation.total_amount,
            amount_paid: reservation.amount_paid,
            status: reservation.payment_status === 'paid' ? ('paid' as const) : ('sent' as const),
          })
          .select()
          .single();

        if (!invoiceError && newInvoice) {
          await supabase.from('invoice_items').insert({
            invoice_id: newInvoice.id,
            description: `${reservation.room_type?.name || 'Room'} - ${reservation.check_in} to ${reservation.check_out}`,
            category: 'room',
            quantity: 1,
            unit_price: subtotal,
            total_price: subtotal,
          });
        }
      }

      await supabase.from('housekeeping_tasks').insert({
        hotel_id: currentHotel!.id,
        room_id: reservation.room_id,
        task_type: 'clean',
        priority: 'high',
        status: 'pending',
        assigned_to: '',
      });
    }

    toast('success', `Reservation ${getStatusLabel(newStatus).toLowerCase()}`);
    setActionMenuId(null);
    fetchReservations();
    fetchReferenceData();
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;

    const { error } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: cancelReason,
      })
      .eq('id', cancelTarget.id);

    if (error) {
      toast('error', 'Failed to cancel reservation');
      return;
    }

    if (cancelTarget.room_id) {
      await supabase
        .from('rooms')
        .update({ status: 'available' })
        .eq('id', cancelTarget.room_id);
    }

    toast('success', 'Reservation cancelled');
    setCancelDialogOpen(false);
    setCancelTarget(null);
    setCancelReason('');
    setActionMenuId(null);
    fetchReservations();
    fetchReferenceData();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const guestName = (reservation: Reservation) => {
    if (reservation.guest) {
      return `${reservation.guest.first_name} ${reservation.guest.last_name}`;
    }
    return 'Unknown Guest';
  };

  const roomLabel = (reservation: Reservation) => {
    if (reservation.room) {
      return `${reservation.room.number}`;
    }
    if (reservation.room_type) {
      return reservation.room_type.name;
    }
    return 'Unassigned';
  };

  useEffect(() => {
    const handleClickOutside = () => setActionMenuId(null);
    if (actionMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuId]);

  if (!currentHotel) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-gray-600 text-lg">No hotel selected</div>
        <p className="text-gray-500 text-sm mt-2">Please select a hotel to view reservations</p>
      </div>
    );
  }

  if (error && reservations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.reservations.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Manage bookings and guest stays</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-gray-200">
          <div className="text-red-600 text-lg font-semibold mb-2">{t.dashboard.errorLoading}</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchReservations()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t.dashboard.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage bookings and guest stays
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t.reservations.newReservation}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t.reservations.search}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-9 w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{t.common.filter}</span>
            </button>
          </div>
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 mt-3 pt-3 border-t border-gray-100">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setStatusFilter('');
                    setSearchQuery('');
                  }}
                  className="btn-secondary text-sm"
                >
                  {t.common.filter} ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : reservations.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="w-6 h-6" />}
            title={t.reservations.noReservations}
            description={t.reservations.noReservationsSub}
            action={
              <button onClick={openCreateModal} className="btn-primary">
                <Plus className="w-4 h-4" />
                {t.reservations.newReservation}
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">{t.reservations.confirmationCode}</th>
                    <th className="table-header">{t.reservations.guest}</th>
                    <th className="table-header">{t.reservations.room}</th>
                    <th className="table-header">{t.reservations.checkIn}</th>
                    <th className="table-header">{t.reservations.checkOut}</th>
                    <th className="table-header">{t.reservations.status}</th>
                    <th className="table-header">{t.reservations.amount}</th>
                    <th className="table-header">{t.reservations.paymentStatus}</th>
                    <th className="table-header">{t.reservations.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reservations.map(reservation => (
                    <tr
                      key={reservation.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="table-cell font-mono text-sm font-medium text-brand-600">
                        {reservation.confirmation_code}
                      </td>
                      <td className="table-cell">
                        <div className="font-medium text-gray-900">
                          {guestName(reservation)}
                        </div>
                      </td>
                      <td className="table-cell text-gray-600">
                        {roomLabel(reservation)}
                      </td>
                      <td className="table-cell text-gray-600">
                        {formatDate(reservation.check_in)}
                      </td>
                      <td className="table-cell text-gray-600">
                        {formatDate(reservation.check_out)}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge ${getStatusColor(reservation.status)}`}
                        >
                          {getStatusLabel(reservation.status)}
                        </span>
                      </td>
                      <td className="table-cell font-medium text-gray-900">
                        {formatCurrency(
                          reservation.total_amount,
                          currentHotel.currency
                        )}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge ${getStatusColor(reservation.payment_status)}`}
                        >
                          {getStatusLabel(reservation.payment_status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="relative">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setActionMenuId(
                                actionMenuId === reservation.id
                                  ? null
                                  : reservation.id
                              );
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuId === reservation.id && (
                            <div
                              className="absolute right-0 top-8 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={() => openViewModal(reservation)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              {reservation.status !== 'cancelled' &&
                                reservation.status !== 'checked_out' && (
                                  <button
                                    onClick={() => openEditModal(reservation)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                )}
                              {reservation.status === 'pending' && (
                                <button
                                  onClick={() =>
                                    updateStatus(reservation, 'confirmed')
                                  }
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                >
                                  <CalendarCheck className="w-4 h-4" />
                                  Confirm
                                </button>
                              )}
                              {reservation.status === 'confirmed' && (
                                <button
                                  onClick={() =>
                                    updateStatus(reservation, 'checked_in')
                                  }
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50"
                                >
                                  <LogIn className="w-4 h-4" />
                                  Check In
                                </button>
                              )}
                              {reservation.status === 'checked_in' && (
                                <button
                                  onClick={() =>
                                    updateStatus(reservation, 'checked_out')
                                  }
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                                >
                                  <LogOut className="w-4 h-4" />
                                  Check Out
                                </button>
                              )}
                              {reservation.status !== 'cancelled' &&
                                reservation.status !== 'checked_out' && (
                                  <button
                                    onClick={() => {
                                      setCancelTarget(reservation);
                                      setCancelDialogOpen(true);
                                      setActionMenuId(null);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Cancel
                                  </button>
                                )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {page * PAGE_SIZE + 1} to{' '}
                  {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}{' '}
                  reservations
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage(p => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingReservation ? 'Edit Reservation' : 'New Reservation'}
        size="xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Guest
              </label>
              <select
                value={form.guest_id}
                onChange={e => updateForm({ guest_id: e.target.value, new_guest_name: '' })}
                className="input-field w-full"
              >
                <option value="">Select a guest or type new name below</option>
                {guests.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.first_name} {g.last_name}
                    {g.email ? ` (${g.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {!form.guest_id && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Guest Name
                </label>
                <input
                  type="text"
                  value={form.new_guest_name}
                  onChange={e =>
                    updateForm({ new_guest_name: e.target.value })
                  }
                  className="input-field w-full"
                  placeholder="Enter full name for a new guest"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Room Type
              </label>
              <select
                value={form.room_type_id}
                onChange={e => handleRoomTypeChange(e.target.value)}
                className="input-field w-full"
              >
                <option value="">Select room type</option>
                {roomTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} - {formatCurrency(rt.base_rate, currentHotel.currency)}/night
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Room
              </label>
              <select
                value={form.room_id}
                onChange={e => updateForm({ room_id: e.target.value })}
                className="input-field w-full"
              >
                <option value="">Assign later</option>
                {filteredRooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.number} - {getStatusLabel(r.status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Check-in
              </label>
              <input
                type="date"
                value={form.check_in}
                onChange={e => updateForm({ check_in: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Check-out
              </label>
              <input
                type="date"
                value={form.check_out}
                onChange={e => updateForm({ check_out: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Adults
              </label>
              <input
                type="number"
                min={1}
                value={form.adults}
                onChange={e =>
                  updateForm({ adults: parseInt(e.target.value) || 1 })
                }
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Children
              </label>
              <input
                type="number"
                min={0}
                value={form.children}
                onChange={e =>
                  updateForm({ children: parseInt(e.target.value) || 0 })
                }
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nights
              </label>
              <input
                type="text"
                value={nights}
                readOnly
                className="input-field w-full bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Base Rate
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.base_rate}
                onChange={e =>
                  updateForm({
                    base_rate: parseFloat(e.target.value) || 0,
                  })
                }
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tax
              </label>
              <input
                type="text"
                value={formatCurrency(form.tax_amount, currentHotel.currency)}
                readOnly
                className="input-field w-full bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Discount
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.discount_amount}
                onChange={e =>
                  updateForm({
                    discount_amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="input-field w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Total Amount
              </label>
              <input
                type="text"
                value={formatCurrency(form.total_amount, currentHotel.currency)}
                readOnly
                className="input-field w-full bg-gray-50 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Payment Method
              </label>
              <select
                value={form.payment_method}
                onChange={e =>
                  updateForm({ payment_method: e.target.value })
                }
                className="input-field w-full"
              >
                <option value="">Select method</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Payment Status
              </label>
              <select
                value={form.payment_status}
                onChange={e =>
                  updateForm({ payment_status: e.target.value })
                }
                className="input-field w-full"
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount Paid
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.amount_paid}
                onChange={e =>
                  updateForm({
                    amount_paid: parseFloat(e.target.value) || 0,
                  })
                }
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Booking Source
              </label>
              <select
                value={form.booking_source}
                onChange={e =>
                  updateForm({ booking_source: e.target.value })
                }
                className="input-field w-full"
              >
                {BOOKING_SOURCES.map(src => (
                  <option key={src} value={src}>
                    {src.charAt(0).toUpperCase() + src.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmation Code
              </label>
              <input
                type="text"
                value={form.confirmation_code}
                readOnly
                className="input-field w-full bg-gray-50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Special Requests
            </label>
            <textarea
              value={form.special_requests}
              onChange={e =>
                updateForm({ special_requests: e.target.value })
              }
              rows={3}
              className="input-field w-full resize-none"
              placeholder="Any special requests or notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving
                ? 'Saving...'
                : editingReservation
                  ? 'Update Reservation'
                  : 'Create Reservation'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!viewingReservation}
        onClose={() => setViewingReservation(null)}
        title="Reservation Details"
        size="lg"
      >
        {viewingReservation && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-semibold text-brand-600">
                {viewingReservation.confirmation_code}
              </span>
              <span
                className={`badge ${getStatusColor(viewingReservation.status)}`}
              >
                {getStatusLabel(viewingReservation.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Guest Information
                </h4>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {guestName(viewingReservation)}
                  </p>
                  {viewingReservation.guest?.email && (
                    <p className="text-sm text-gray-500">
                      {viewingReservation.guest.email}
                    </p>
                  )}
                  {viewingReservation.guest?.phone && (
                    <p className="text-sm text-gray-500">
                      {viewingReservation.guest.phone}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Room Details
                </h4>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {roomLabel(viewingReservation)}
                  </p>
                  {viewingReservation.room_type && (
                    <p className="text-sm text-gray-500">
                      {viewingReservation.room_type.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Check-in
                </h4>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(viewingReservation.check_in)}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Check-out
                </h4>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(viewingReservation.check_out)}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Nights
                </h4>
                <p className="text-sm font-medium text-gray-900">
                  {nightsBetween(
                    viewingReservation.check_in,
                    viewingReservation.check_out
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Guests
                </h4>
                <p className="text-sm font-medium text-gray-900">
                  {viewingReservation.adults} Adults
                  {viewingReservation.children > 0 &&
                    `, ${viewingReservation.children} Children`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Base Rate
                </h4>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(
                    viewingReservation.base_rate,
                    currentHotel.currency
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Tax
                </h4>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(
                    viewingReservation.tax_amount,
                    currentHotel.currency
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Discount
                </h4>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(
                    viewingReservation.discount_amount,
                    currentHotel.currency
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Total
                </h4>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(
                    viewingReservation.total_amount,
                    currentHotel.currency
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Payment Status
                </h4>
                <span
                  className={`badge ${getStatusColor(viewingReservation.payment_status)}`}
                >
                  {getStatusLabel(viewingReservation.payment_status)}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Amount Paid
                </h4>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(
                    viewingReservation.amount_paid,
                    currentHotel.currency
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Booking Source
                </h4>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {viewingReservation.booking_source || 'N/A'}
                </p>
              </div>
            </div>

            {viewingReservation.special_requests && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Special Requests
                </h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {viewingReservation.special_requests}
                </p>
              </div>
            )}

            {viewingReservation.cancellation_reason && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Cancellation Reason
                </h4>
                <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">
                  {viewingReservation.cancellation_reason}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={() => setViewingReservation(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => {
              setCancelDialogOpen(false);
              setCancelTarget(null);
              setCancelReason('');
            }}
          />
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl animate-fade-in p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Cancel Reservation
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to cancel reservation{' '}
              <span className="font-mono font-medium">
                {cancelTarget?.confirmation_code}
              </span>
              ? This action cannot be undone.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Cancellation Reason
            </label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
              className="input-field w-full resize-none mb-4"
              placeholder="Enter reason for cancellation..."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelTarget(null);
                  setCancelReason('');
                }}
                className="btn-secondary"
              >
                Keep Reservation
              </button>
              <button onClick={handleCancel} className="btn-danger">
                Cancel Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
