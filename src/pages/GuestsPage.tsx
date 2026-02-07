import { useState, useEffect, useCallback } from 'react';
import { useHotel } from '../contexts/HotelContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Guest, Reservation } from '../types';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import {
  Users,
  Plus,
  Search,
  Edit,
  Eye,
  Mail,
  Phone,
  MapPin,
  Star,
  Crown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const VIP_OPTIONS: Guest['vip_status'][] = ['regular', 'silver', 'gold', 'platinum'];

const VIP_COLORS: Record<Guest['vip_status'], string> = {
  regular: 'badge-neutral',
  silver: 'bg-gray-100 text-gray-700',
  gold: 'bg-amber-50 text-amber-700',
  platinum: 'bg-blue-50 text-blue-700',
};

const VIP_LABELS: Record<Guest['vip_status'], string> = {
  regular: 'Regular',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

type SortField = 'created_at' | 'last_name' | 'total_stays' | 'total_spent';
type SortDir = 'asc' | 'desc';

const EMPTY_FORM: Omit<Guest, 'id' | 'hotel_id' | 'total_stays' | 'total_spent' | 'created_at' | 'updated_at' | 'preferences'> = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  postal_code: '',
  id_number: '',
  nationality: '',
  date_of_birth: null,
  vip_status: 'regular',
  notes: '',
};

const PAGE_SIZE = 10;

export default function GuestsPage() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [vipFilter, setVipFilter] = useState<Guest['vip_status'] | ''>('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileGuest, setProfileGuest] = useState<Guest | null>(null);
  const [profileReservations, setProfileReservations] = useState<Reservation[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchGuests = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);

    let query = supabase
      .from('guests')
      .select('*', { count: 'exact' })
      .eq('hotel_id', currentHotel.id);

    if (searchQuery.trim()) {
      query = query.or(
        `first_name.ilike.%${searchQuery.trim()}%,last_name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%,phone.ilike.%${searchQuery.trim()}%`
      );
    }

    if (vipFilter) {
      query = query.eq('vip_status', vipFilter);
    }

    if (countryFilter.trim()) {
      query = query.ilike('country', `%${countryFilter.trim()}%`);
    }

    query = query
      .order(sortField, { ascending: sortDir === 'asc' })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;

    if (error) {
      toast('error', 'Failed to load guests');
    } else {
      setGuests((data || []) as Guest[]);
      setTotalCount(count || 0);
    }

    setLoading(false);
  }, [currentHotel, searchQuery, vipFilter, countryFilter, sortField, sortDir, page, toast]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, vipFilter, countryFilter, sortField, sortDir]);

  const openAddModal = () => {
    setEditingGuest(null);
    setForm({ ...EMPTY_FORM });
    setShowFormModal(true);
  };

  const openEditModal = (guest: Guest) => {
    setEditingGuest(guest);
    setForm({
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      phone: guest.phone,
      address: guest.address,
      city: guest.city,
      country: guest.country,
      postal_code: guest.postal_code,
      id_number: guest.id_number,
      nationality: guest.nationality,
      date_of_birth: guest.date_of_birth,
      vip_status: guest.vip_status,
      notes: guest.notes,
    });
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingGuest(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;

    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast('error', 'First and last name are required');
      return;
    }

    setSaving(true);

    const payload = {
      hotel_id: currentHotel.id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      postal_code: form.postal_code.trim(),
      id_number: form.id_number.trim(),
      nationality: form.nationality.trim(),
      date_of_birth: form.date_of_birth || null,
      vip_status: form.vip_status,
      notes: form.notes.trim(),
    };

    if (editingGuest) {
      const { error } = await supabase
        .from('guests')
        .update(payload)
        .eq('id', editingGuest.id);

      if (error) {
        toast('error', 'Failed to update guest');
      } else {
        toast('success', 'Guest updated successfully');
        closeFormModal();
        fetchGuests();
      }
    } else {
      const { error } = await supabase.from('guests').insert(payload);

      if (error) {
        toast('error', 'Failed to create guest');
      } else {
        toast('success', 'Guest added successfully');
        closeFormModal();
        fetchGuests();
      }
    }

    setSaving(false);
  };

  const openProfile = async (guest: Guest) => {
    setProfileGuest(guest);
    setShowProfileModal(true);
    setProfileLoading(true);

    const { data } = await supabase
      .from('reservations')
      .select('*, room:rooms(*), room_type:room_types(*)')
      .eq('guest_id', guest.id)
      .order('check_in', { ascending: false });

    setProfileReservations((data || []) as Reservation[]);
    setProfileLoading(false);
  };

  const closeProfile = () => {
    setShowProfileModal(false);
    setProfileGuest(null);
    setProfileReservations([]);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getLastVisit = (guest: Guest): string => {
    return guest.updated_at ? formatDate(guest.updated_at) : '-';
  };

  if (!currentHotel) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guests</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} {totalCount === 1 ? 'guest' : 'guests'} total
          </p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Guest
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search guests by name, email, or phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-9 w-full"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={vipFilter}
                onChange={e => setVipFilter(e.target.value as Guest['vip_status'] | '')}
                className="input-field"
              >
                <option value="">All VIP Levels</option>
                {VIP_OPTIONS.map(v => (
                  <option key={v} value={v}>
                    {VIP_LABELS[v]}
                  </option>
                ))}
              </select>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by country"
                  value={countryFilter}
                  onChange={e => setCountryFilter(e.target.value)}
                  className="input-field pl-9"
                />
              </div>
              <select
                value={`${sortField}:${sortDir}`}
                onChange={e => {
                  const [field, dir] = e.target.value.split(':') as [SortField, SortDir];
                  setSortField(field);
                  setSortDir(dir);
                }}
                className="input-field"
              >
                <option value="created_at:desc">Newest First</option>
                <option value="created_at:asc">Oldest First</option>
                <option value="last_name:asc">Name A-Z</option>
                <option value="last_name:desc">Name Z-A</option>
                <option value="total_stays:desc">Most Stays</option>
                <option value="total_spent:desc">Highest Spent</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : guests.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No guests found"
            description={
              searchQuery || vipFilter || countryFilter
                ? 'Try adjusting your search or filters.'
                : 'Add your first guest to get started.'
            }
            action={
              !searchQuery && !vipFilter && !countryFilter ? (
                <button onClick={openAddModal} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Add Guest
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Name</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header">Country</th>
                    <th className="table-header">Total Stays</th>
                    <th className="table-header">Total Spent</th>
                    <th className="table-header">VIP Status</th>
                    <th className="table-header">Last Visit</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map(guest => (
                    <tr key={guest.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-medium">
                            {guest.first_name.charAt(0)}
                            {guest.last_name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">
                            {guest.first_name} {guest.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">{guest.email || '-'}</td>
                      <td className="table-cell text-gray-500">{guest.phone || '-'}</td>
                      <td className="table-cell text-gray-500">{guest.country || '-'}</td>
                      <td className="table-cell text-gray-500">{guest.total_stays}</td>
                      <td className="table-cell text-gray-500">
                        {formatCurrency(guest.total_spent, currentHotel.currency)}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${VIP_COLORS[guest.vip_status]}`}>
                          {guest.vip_status === 'gold' || guest.vip_status === 'platinum' ? (
                            <Crown className="w-3 h-3" />
                          ) : guest.vip_status === 'silver' ? (
                            <Star className="w-3 h-3" />
                          ) : null}
                          {VIP_LABELS[guest.vip_status]}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">{getLastVisit(guest)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openProfile(guest)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(guest)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
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
                  {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} guests
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="btn-secondary p-2 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700 px-2">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="btn-secondary p-2 disabled:opacity-50"
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
        open={showFormModal}
        onClose={closeFormModal}
        title={editingGuest ? 'Edit Guest' : 'Add Guest'}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="input-field w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Postal Code</label>
              <input
                type="text"
                value={form.postal_code}
                onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ID / Passport Number</label>
              <input
                type="text"
                value={form.id_number}
                onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nationality</label>
              <input
                type="text"
                value={form.nationality}
                onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth || ''}
                onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value || null }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">VIP Status</label>
              <select
                value={form.vip_status}
                onChange={e => setForm(f => ({ ...f, vip_status: e.target.value as Guest['vip_status'] }))}
                className="input-field w-full"
              >
                {VIP_OPTIONS.map(v => (
                  <option key={v} value={v}>
                    {VIP_LABELS[v]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field w-full"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeFormModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editingGuest ? 'Update Guest' : 'Add Guest'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showProfileModal}
        onClose={closeProfile}
        title="Guest Profile"
        size="xl"
      >
        {profileGuest && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-lg font-semibold flex-shrink-0">
                {profileGuest.first_name.charAt(0)}
                {profileGuest.last_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profileGuest.first_name} {profileGuest.last_name}
                  </h3>
                  <span className={`badge ${VIP_COLORS[profileGuest.vip_status]}`}>
                    {profileGuest.vip_status === 'gold' || profileGuest.vip_status === 'platinum' ? (
                      <Crown className="w-3 h-3" />
                    ) : profileGuest.vip_status === 'silver' ? (
                      <Star className="w-3 h-3" />
                    ) : null}
                    {VIP_LABELS[profileGuest.vip_status]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                  {profileGuest.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {profileGuest.email}
                    </span>
                  )}
                  {profileGuest.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {profileGuest.phone}
                    </span>
                  )}
                  {profileGuest.country && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {[profileGuest.city, profileGuest.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  closeProfile();
                  openEditModal(profileGuest);
                }}
                className="btn-secondary flex-shrink-0"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Total Stays</p>
                <p className="text-xl font-semibold text-gray-900">{profileGuest.total_stays}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Total Spent</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(profileGuest.total_spent, currentHotel.currency)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Nationality</p>
                <p className="text-sm font-medium text-gray-900">{profileGuest.nationality || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                <p className="text-sm font-medium text-gray-900">
                  {profileGuest.date_of_birth ? formatDate(profileGuest.date_of_birth) : '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Address</p>
                <p className="text-gray-900 mt-0.5">
                  {[profileGuest.address, profileGuest.city, profileGuest.postal_code, profileGuest.country]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">ID / Passport Number</p>
                <p className="text-gray-900 mt-0.5">{profileGuest.id_number || '-'}</p>
              </div>
            </div>

            {profileGuest.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap">
                  {profileGuest.notes}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Booking History</h4>
              {profileLoading ? (
                <LoadingSpinner size="sm" />
              ) : profileReservations.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  No reservations found for this guest.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="table-header">Confirmation</th>
                        <th className="table-header">Check In</th>
                        <th className="table-header">Check Out</th>
                        <th className="table-header">Room</th>
                        <th className="table-header">Status</th>
                        <th className="table-header">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileReservations.map(res => (
                        <tr key={res.id} className="border-b border-gray-50">
                          <td className="table-cell font-medium text-gray-900">
                            {res.confirmation_code}
                          </td>
                          <td className="table-cell text-gray-500">{formatDate(res.check_in)}</td>
                          <td className="table-cell text-gray-500">{formatDate(res.check_out)}</td>
                          <td className="table-cell text-gray-500">
                            {res.room?.number || res.room_type?.name || '-'}
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${
                              res.status === 'checked_in' ? 'bg-blue-50 text-blue-700' :
                              res.status === 'checked_out' ? 'bg-gray-100 text-gray-700' :
                              res.status === 'confirmed' ? 'bg-blue-50 text-blue-700' :
                              res.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {res.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                          </td>
                          <td className="table-cell text-gray-500">
                            {formatCurrency(res.total_amount, currentHotel.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
