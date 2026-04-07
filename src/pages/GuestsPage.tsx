import { useState, useEffect, useCallback } from 'react';
import { useHotel } from '../contexts/HotelContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useTenantId } from '../hooks/useTenantQuery';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Guest, Reservation, GuestCommunication, GuestDocument } from '../types';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import { Users, Plus, Search, CreditCard as Edit, Eye, Mail, Phone, MapPin, Star, Crown, ChevronLeft, ChevronRight, Download, MessageSquare, Send, FileText, Upload, Trash2, Settings, Heart, Calendar, Euro, Briefcase } from 'lucide-react';

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

const TITLE_OPTIONS = ['', 'Mr', 'Mrs', 'Ms', 'Dr', 'Prof'];
const COMMUNICATION_TYPES: GuestCommunication['type'][] = ['email', 'sms', 'whatsapp', 'phone'];
const DOCUMENT_TYPES = ['passport', 'id_card', 'drivers_license', 'visa', 'other'];

type SortField = 'created_at' | 'last_name' | 'total_stays' | 'total_spent';
type SortDir = 'asc' | 'desc';

const EMPTY_FORM: Omit<Guest, 'id' | 'hotel_id' | 'total_stays' | 'total_spent' | 'created_at' | 'updated_at' | 'preferences' | 'favorite_room_types'> = {
  title: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  mobile: '',
  address: '',
  city: '',
  country: '',
  postal_code: '',
  id_number: '',
  nationality: '',
  date_of_birth: null,
  vip_status: 'regular',
  notes: '',
  room_floor_preference: '',
  room_view_preference: '',
  bed_type_preference: '',
  special_requests: '',
  dietary_restrictions: '',
  allergies: '',
  email_opt_in: true,
  sms_opt_in: false,
  newsletter_opt_in: true,
  communication_preference: 'email',
  complaint_history: '',
};

const PAGE_SIZE = 10;

export default function GuestsPage() {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const { t } = useLanguage();

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
  const [profileCommunications, setProfileCommunications] = useState<GuestCommunication[]>([]);
  const [profileDocuments, setProfileDocuments] = useState<GuestDocument[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<'overview' | 'bookings' | 'communications' | 'documents' | 'preferences'>('overview');

  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [communicationType, setCommunicationType] = useState<GuestCommunication['type']>('email');
  const [communicationSubject, setCommunicationSubject] = useState('');
  const [communicationMessage, setCommunicationMessage] = useState('');
  const [sendingCommunication, setSendingCommunication] = useState(false);

  const fetchGuests = useCallback(async () => {
    if (!currentHotel) {
      setLoading(false);
      return;
    }
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

  const exportToCSV = async () => {
    if (!currentHotel) return;

    toast('info', 'Preparing export...');

    let query = supabase
      .from('guests')
      .select('*')
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

    query = query.order(sortField, { ascending: sortDir === 'asc' });

    const { data, error } = await query;

    if (error || !data) {
      toast('error', 'Failed to export guests');
      return;
    }

    const csvHeaders = [
      'Guest ID', 'Title', 'First Name', 'Last Name', 'Email', 'Phone', 'Mobile',
      'Address', 'City', 'Country', 'Postal Code', 'ID Number', 'Nationality',
      'Date of Birth', 'VIP Status', 'Total Stays', 'Total Spent', 'Email Opt-in',
      'SMS Opt-in', 'Newsletter', 'Last Updated'
    ];

    const csvRows = data.map((guest: Guest) => [
      guest.id,
      guest.title || '',
      guest.first_name,
      guest.last_name,
      guest.email || '',
      guest.phone || '',
      guest.mobile || '',
      guest.address || '',
      guest.city || '',
      guest.country || '',
      guest.postal_code || '',
      guest.id_number || '',
      guest.nationality || '',
      guest.date_of_birth || '',
      VIP_LABELS[guest.vip_status],
      guest.total_stays,
      guest.total_spent,
      guest.email_opt_in ? 'Yes' : 'No',
      guest.sms_opt_in ? 'Yes' : 'No',
      guest.newsletter_opt_in ? 'Yes' : 'No',
      formatDate(guest.updated_at),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `guests-${currentHotel.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast('success', 'Guest list exported successfully');
  };

  const openAddModal = () => {
    setEditingGuest(null);
    setForm({ ...EMPTY_FORM });
    setShowFormModal(true);
  };

  const openEditModal = (guest: Guest) => {
    setEditingGuest(guest);
    setForm({
      title: guest.title || '',
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      phone: guest.phone,
      mobile: guest.mobile || '',
      address: guest.address,
      city: guest.city,
      country: guest.country,
      postal_code: guest.postal_code,
      id_number: guest.id_number,
      nationality: guest.nationality,
      date_of_birth: guest.date_of_birth,
      vip_status: guest.vip_status,
      notes: guest.notes,
      room_floor_preference: guest.room_floor_preference || '',
      room_view_preference: guest.room_view_preference || '',
      bed_type_preference: guest.bed_type_preference || '',
      special_requests: guest.special_requests || '',
      dietary_restrictions: guest.dietary_restrictions || '',
      allergies: guest.allergies || '',
      email_opt_in: guest.email_opt_in,
      sms_opt_in: guest.sms_opt_in,
      newsletter_opt_in: guest.newsletter_opt_in,
      communication_preference: guest.communication_preference || 'email',
      complaint_history: guest.complaint_history || '',
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
      title: form.title.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      mobile: form.mobile.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      postal_code: form.postal_code.trim(),
      id_number: form.id_number.trim(),
      nationality: form.nationality.trim(),
      date_of_birth: form.date_of_birth || null,
      vip_status: form.vip_status,
      notes: form.notes.trim(),
      room_floor_preference: form.room_floor_preference.trim(),
      room_view_preference: form.room_view_preference.trim(),
      bed_type_preference: form.bed_type_preference.trim(),
      special_requests: form.special_requests.trim(),
      dietary_restrictions: form.dietary_restrictions.trim(),
      allergies: form.allergies.trim(),
      email_opt_in: form.email_opt_in,
      sms_opt_in: form.sms_opt_in,
      newsletter_opt_in: form.newsletter_opt_in,
      communication_preference: form.communication_preference,
      complaint_history: form.complaint_history.trim(),
      ...(tenantId ? { tenant_id: tenantId } : {}),
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
        if (profileGuest?.id === editingGuest.id) {
          openProfile({ ...editingGuest, ...payload } as Guest);
        }
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
    setProfileTab('overview');

    const [reservationsRes, communicationsRes, documentsRes] = await Promise.all([
      supabase
        .from('reservations')
        .select('*, room:rooms(*), room_type:room_types(*)')
        .eq('guest_id', guest.id)
        .order('check_in', { ascending: false }),
      supabase
        .from('guest_communications')
        .select('*')
        .eq('guest_id', guest.id)
        .order('sent_at', { ascending: false }),
      supabase
        .from('guest_documents')
        .select('*')
        .eq('guest_id', guest.id)
        .order('uploaded_at', { ascending: false }),
    ]);

    setProfileReservations((reservationsRes.data || []) as Reservation[]);
    setProfileCommunications((communicationsRes.data || []) as GuestCommunication[]);
    setProfileDocuments((documentsRes.data || []) as GuestDocument[]);
    setProfileLoading(false);
  };

  const closeProfile = () => {
    setShowProfileModal(false);
    setProfileGuest(null);
    setProfileReservations([]);
    setProfileCommunications([]);
    setProfileDocuments([]);
  };

  const openCommunicationModal = (guest: Guest) => {
    setProfileGuest(guest);
    setCommunicationType('email');
    setCommunicationSubject('');
    setCommunicationMessage('');
    setShowCommunicationModal(true);
  };

  const sendCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel || !profileGuest) return;

    if (!communicationMessage.trim()) {
      toast('error', 'Message is required');
      return;
    }

    if (communicationType === 'email' && !communicationSubject.trim()) {
      toast('error', 'Subject is required for emails');
      return;
    }

    setSendingCommunication(true);

    const { error } = await supabase.from('guest_communications').insert({
      guest_id: profileGuest.id,
      hotel_id: currentHotel.id,
      type: communicationType,
      subject: communicationSubject.trim(),
      message: communicationMessage.trim(),
      sent_by: (await supabase.auth.getUser()).data.user?.id || null,
      status: 'sent',
      ...(tenantId ? { tenant_id: tenantId } : {}),
    });

    if (error) {
      toast('error', 'Failed to send communication');
    } else {
      toast('success', `${communicationType.charAt(0).toUpperCase() + communicationType.slice(1)} sent successfully`);
      setShowCommunicationModal(false);

      if (showProfileModal) {
        const { data } = await supabase
          .from('guest_communications')
          .select('*')
          .eq('guest_id', profileGuest.id)
          .order('sent_at', { ascending: false });
        setProfileCommunications((data || []) as GuestCommunication[]);
      }
    }

    setSendingCommunication(false);
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
          <h1 className="text-2xl font-bold text-gray-900">{t.guests.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} {totalCount === 1 ? 'guest' : 'guests'} total
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Guest
          </button>
        </div>
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
                            {guest.title && `${guest.title}. `}
                            {guest.first_name} {guest.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">{guest.email || '-'}</td>
                      <td className="table-cell text-gray-500">{guest.phone || guest.mobile || '-'}</td>
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
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(guest)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openCommunicationModal(guest)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Send Message"
                          >
                            <Send className="w-4 h-4" />
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
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <select
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input-field w-full"
                >
                  {TITLE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t || 'None'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="input-field w-full"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile</label>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Contact</label>
                <select
                  value={form.communication_preference}
                  onChange={e => setForm(f => ({ ...f, communication_preference: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address</label>
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
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Identification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth || ''}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value || null }))}
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Room Preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Floor Preference</label>
                <input
                  type="text"
                  value={form.room_floor_preference}
                  onChange={e => setForm(f => ({ ...f, room_floor_preference: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g., High floor, Low floor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">View Preference</label>
                <input
                  type="text"
                  value={form.room_view_preference}
                  onChange={e => setForm(f => ({ ...f, room_view_preference: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g., Ocean view, City view"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bed Type</label>
                <input
                  type="text"
                  value={form.bed_type_preference}
                  onChange={e => setForm(f => ({ ...f, bed_type_preference: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g., King, Twin"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Special Requirements</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Dietary Restrictions</label>
                <input
                  type="text"
                  value={form.dietary_restrictions}
                  onChange={e => setForm(f => ({ ...f, dietary_restrictions: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g., Vegetarian, Vegan, Halal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Allergies</label>
                <input
                  type="text"
                  value={form.allergies}
                  onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g., Peanuts, Latex"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Requests</label>
                <textarea
                  value={form.special_requests}
                  onChange={e => setForm(f => ({ ...f, special_requests: e.target.value }))}
                  className="input-field w-full"
                  rows={2}
                  placeholder="Any other special requests or notes"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Guest Status & Notes</h3>
            <div className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Internal Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="input-field w-full"
                  rows={3}
                  placeholder="Internal staff notes about this guest"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Marketing Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.email_opt_in}
                  onChange={e => setForm(f => ({ ...f, email_opt_in: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Email marketing opt-in</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sms_opt_in}
                  onChange={e => setForm(f => ({ ...f, sms_opt_in: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">SMS marketing opt-in</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.newsletter_opt_in}
                  onChange={e => setForm(f => ({ ...f, newsletter_opt_in: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Newsletter subscription</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
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
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-lg font-semibold flex-shrink-0">
                  {profileGuest.first_name.charAt(0)}
                  {profileGuest.last_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {profileGuest.title && `${profileGuest.title}. `}
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
                    {(profileGuest.phone || profileGuest.mobile) && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {profileGuest.mobile || profileGuest.phone}
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
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openCommunicationModal(profileGuest)}
                  className="btn-secondary"
                >
                  <Send className="w-4 h-4" />
                  Contact
                </button>
                <button
                  onClick={() => {
                    closeProfile();
                    openEditModal(profileGuest);
                  }}
                  className="btn-secondary"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>

            <div className="flex gap-2 border-b border-gray-200">
              {(['overview', 'bookings', 'communications', 'documents', 'preferences'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setProfileTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    profileTab === tab
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {profileLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="min-h-[400px]">
                {profileTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <p className="text-xs text-gray-500">Total Stays</p>
                        </div>
                        <p className="text-2xl font-semibold text-gray-900">{profileGuest.total_stays}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Euro className="w-4 h-4 text-gray-400" />
                          <p className="text-xs text-gray-500">Total Spent</p>
                        </div>
                        <p className="text-xl font-semibold text-gray-900">
                          {formatCurrency(profileGuest.total_spent, currentHotel.currency)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <p className="text-xs text-gray-500">Nationality</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{profileGuest.nationality || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="w-4 h-4 text-gray-400" />
                          <p className="text-xs text-gray-500">Member Since</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(profileGuest.created_at)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Email:</span>
                            <span className="text-gray-900">{profileGuest.email || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Phone:</span>
                            <span className="text-gray-900">{profileGuest.phone || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Mobile:</span>
                            <span className="text-gray-900">{profileGuest.mobile || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Preferred:</span>
                            <span className="text-gray-900 capitalize">{profileGuest.communication_preference}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Address</h4>
                        <div className="text-sm text-gray-900">
                          {[
                            profileGuest.address,
                            profileGuest.city,
                            profileGuest.postal_code,
                            profileGuest.country
                          ]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Identification</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">ID Number:</span>
                            <span className="text-gray-900">{profileGuest.id_number || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Date of Birth:</span>
                            <span className="text-gray-900">
                              {profileGuest.date_of_birth ? formatDate(profileGuest.date_of_birth) : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Marketing</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Email:</span>
                            <span className={profileGuest.email_opt_in ? 'text-green-600' : 'text-red-600'}>
                              {profileGuest.email_opt_in ? 'Opted In' : 'Opted Out'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">SMS:</span>
                            <span className={profileGuest.sms_opt_in ? 'text-green-600' : 'text-red-600'}>
                              {profileGuest.sms_opt_in ? 'Opted In' : 'Opted Out'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Newsletter:</span>
                            <span className={profileGuest.newsletter_opt_in ? 'text-green-600' : 'text-red-600'}>
                              {profileGuest.newsletter_opt_in ? 'Subscribed' : 'Unsubscribed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {profileGuest.notes && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Internal Notes</h4>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap">
                          {profileGuest.notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'bookings' && (
                  <div>
                    {profileReservations.length === 0 ? (
                      <EmptyState
                        icon={<Calendar className="w-6 h-6" />}
                        title="No bookings yet"
                        description="This guest hasn't made any reservations."
                      />
                    ) : (
                      <div className="space-y-3">
                        {profileReservations.map(res => (
                          <div key={res.id} className="border border-gray-200 rounded-lg p-4 hover:border-brand-300 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-lg font-semibold text-gray-900">
                                    {res.confirmation_code}
                                  </span>
                                  <span className={`badge ${
                                    res.status === 'checked_in' ? 'bg-blue-50 text-blue-700' :
                                    res.status === 'checked_out' ? 'bg-gray-100 text-gray-700' :
                                    res.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                                    res.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                    'bg-amber-50 text-amber-700'
                                  }`}>
                                    {res.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-500">Check-in</p>
                                    <p className="text-gray-900 font-medium">{formatDate(res.check_in)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Check-out</p>
                                    <p className="text-gray-900 font-medium">{formatDate(res.check_out)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Room</p>
                                    <p className="text-gray-900 font-medium">
                                      {res.room?.number || res.room_type?.name || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Total</p>
                                    <p className="text-gray-900 font-medium">
                                      {formatCurrency(res.total_amount, currentHotel.currency)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'communications' && (
                  <div>
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => openCommunicationModal(profileGuest)}
                        className="btn-primary"
                      >
                        <Send className="w-4 h-4" />
                        Send Message
                      </button>
                    </div>
                    {profileCommunications.length === 0 ? (
                      <EmptyState
                        icon={<MessageSquare className="w-6 h-6" />}
                        title="No communications yet"
                        description="No messages have been sent to this guest."
                      />
                    ) : (
                      <div className="space-y-3">
                        {profileCommunications.map(comm => (
                          <div key={comm.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="badge badge-neutral">
                                  {comm.type.toUpperCase()}
                                </span>
                                <span className={`badge ${
                                  comm.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                                  comm.status === 'delivered' ? 'bg-green-50 text-green-700' :
                                  'bg-red-50 text-red-700'
                                }`}>
                                  {comm.status}
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {formatDate(comm.sent_at)}
                              </span>
                            </div>
                            {comm.subject && (
                              <p className="font-medium text-gray-900 mb-1">{comm.subject}</p>
                            )}
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{comm.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'documents' && (
                  <div>
                    <div className="flex justify-end mb-4">
                      <button className="btn-primary" disabled>
                        <Upload className="w-4 h-4" />
                        Upload Document
                      </button>
                    </div>
                    {profileDocuments.length === 0 ? (
                      <EmptyState
                        icon={<FileText className="w-6 h-6" />}
                        title="No documents uploaded"
                        description="No documents have been uploaded for this guest."
                      />
                    ) : (
                      <div className="space-y-2">
                        {profileDocuments.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-brand-300 transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">{doc.file_name}</p>
                                <p className="text-sm text-gray-500">
                                  {doc.type} • Uploaded {formatDate(doc.uploaded_at)}
                                </p>
                              </div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Room Preferences</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Floor Preference</p>
                          <p className="text-gray-900">{profileGuest.room_floor_preference || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">View Preference</p>
                          <p className="text-gray-900">{profileGuest.room_view_preference || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Bed Type</p>
                          <p className="text-gray-900">{profileGuest.bed_type_preference || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Special Requirements</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Dietary Restrictions</p>
                          <p className="text-gray-900">{profileGuest.dietary_restrictions || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Allergies</p>
                          <p className="text-gray-900">{profileGuest.allergies || '-'}</p>
                        </div>
                        {profileGuest.special_requests && (
                          <div>
                            <p className="text-gray-500 mb-1">Special Requests</p>
                            <p className="text-gray-900 whitespace-pre-wrap">{profileGuest.special_requests}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {profileGuest.complaint_history && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Complaint History</h4>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 whitespace-pre-wrap">
                          {profileGuest.complaint_history}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={showCommunicationModal}
        onClose={() => setShowCommunicationModal(false)}
        title="Send Communication"
        size="lg"
      >
        {profileGuest && (
          <form onSubmit={sendCommunication} className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 mb-4">
                Sending to: <span className="font-medium">{profileGuest.first_name} {profileGuest.last_name}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
              <select
                value={communicationType}
                onChange={e => setCommunicationType(e.target.value as GuestCommunication['type'])}
                className="input-field w-full"
              >
                {COMMUNICATION_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {communicationType === 'email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                <input
                  type="text"
                  value={communicationSubject}
                  onChange={e => setCommunicationSubject(e.target.value)}
                  className="input-field w-full"
                  required
                  placeholder="Email subject"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
              <textarea
                value={communicationMessage}
                onChange={e => setCommunicationMessage(e.target.value)}
                className="input-field w-full"
                rows={6}
                required
                placeholder={`Write your ${communicationType} message here...`}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Communication Logging:</strong> This message will be recorded in the guest's communication history. Direct {communicationType} delivery requires an email/SMS integration to be configured by your account administrator.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCommunicationModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={sendingCommunication} className="btn-primary">
                {sendingCommunication ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
