import { useState, useEffect, useCallback } from 'react';
import { Settings, Building2, Users, Receipt, Mail, CreditCard, Bell, Globe, DollarSign, Save, Plus, CreditCard as Edit, UserX, Trash2 } from 'lucide-react';
import { useHotel } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { StaffMember, RoomType } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

type TabKey = 'hotel' | 'rooms' | 'tax' | 'users' | 'emails' | 'payment' | 'notifications' | 'preferences';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore',
  'Australia/Sydney', 'Pacific/Auckland',
];

const STAFF_ROLES = ['admin', 'manager', 'receptionist', 'housekeeping'] as const;

const ROLE_BADGE_MAP: Record<string, string> = {
  admin: 'badge badge-danger',
  manager: 'badge badge-warning',
  receptionist: 'badge badge-info',
  housekeeping: 'badge badge-success',
};

const TABS: { key: TabKey; label: string; icon: typeof Building2; adminOnly?: boolean }[] = [
  { key: 'hotel', label: 'Hotel Settings', icon: Building2 },
  { key: 'rooms', label: 'Room Types & Rates', icon: DollarSign },
  { key: 'tax', label: 'Tax Configuration', icon: Receipt },
  { key: 'users', label: 'Users & Permissions', icon: Users, adminOnly: true },
  { key: 'emails', label: 'Email Templates', icon: Mail },
  { key: 'payment', label: 'Payment Settings', icon: CreditCard, adminOnly: true },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'preferences', label: 'System Preferences', icon: Globe },
];

function HotelSettingsTab() {
  const { currentHotel, refreshHotels, setCurrentHotel } = useHotel();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', city: '', country: '', phone: '', email: '',
    website: '', star_rating: 3, check_in_time: '14:00', check_out_time: '11:00',
    tax_rate: 0, currency: 'USD', timezone: 'America/New_York',
    cancellation_policy: '', payment_policy: '',
  });

  useEffect(() => {
    if (currentHotel) {
      setForm({
        name: currentHotel.name || '',
        address: currentHotel.address || '',
        city: currentHotel.city || '',
        country: currentHotel.country || '',
        phone: currentHotel.phone || '',
        email: currentHotel.email || '',
        website: currentHotel.website || '',
        star_rating: currentHotel.star_rating || 3,
        check_in_time: currentHotel.check_in_time || '14:00',
        check_out_time: currentHotel.check_out_time || '11:00',
        tax_rate: currentHotel.tax_rate || 0,
        currency: currentHotel.currency || 'USD',
        timezone: currentHotel.timezone || 'America/New_York',
        cancellation_policy: currentHotel.cancellation_policy || '',
        payment_policy: currentHotel.payment_policy || '',
      });
    }
  }, [currentHotel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'star_rating' || name === 'tax_rate' ? Number(value) : value,
    }));
  };

  const handleCreate = async () => {
    if (!user || !form.name.trim()) {
      toast('error', 'Hotel name is required');
      return;
    }
    setSaving(true);
    const { data: newHotel, error: hotelErr } = await supabase
      .from('hotels')
      .insert({
        name: form.name,
        address: form.address,
        city: form.city,
        country: form.country,
        phone: form.phone,
        email: form.email,
        website: form.website,
        star_rating: form.star_rating,
        check_in_time: form.check_in_time,
        check_out_time: form.check_out_time,
        tax_rate: form.tax_rate,
        currency: form.currency,
        timezone: form.timezone,
        cancellation_policy: form.cancellation_policy,
      })
      .select()
      .single();

    if (hotelErr || !newHotel) {
      toast('error', hotelErr?.message || 'Failed to create hotel');
      setSaving(false);
      return;
    }

    const { data: existingStaff } = await supabase
      .from('staff_members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingStaff) {
      await supabase.from('staff_members').insert({
        hotel_id: newHotel.id,
        user_id: user.id,
        first_name: user.user_metadata?.first_name || 'Admin',
        last_name: user.user_metadata?.last_name || '',
        email: user.email || '',
        role: 'admin',
        is_active: true,
      });
    }

    await refreshHotels();
    setCurrentHotel(newHotel as any);
    toast('success', 'Hotel created successfully');
    setSaving(false);
  };

  const handleSave = async () => {
    if (!currentHotel) {
      await handleCreate();
      return;
    }
    if (!form.name.trim()) {
      toast('error', 'Hotel name is required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('hotels').update({
      name: form.name,
      address: form.address,
      city: form.city,
      country: form.country,
      phone: form.phone,
      email: form.email,
      website: form.website,
      star_rating: form.star_rating,
      check_in_time: form.check_in_time,
      check_out_time: form.check_out_time,
      tax_rate: form.tax_rate,
      currency: form.currency,
      timezone: form.timezone,
      cancellation_policy: form.cancellation_policy,
    }).eq('id', currentHotel.id);
    if (error) {
      toast('error', error.message || 'Failed to save settings');
    } else {
      await refreshHotels();
      toast('success', 'Hotel settings saved successfully');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {!currentHotel && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          No hotel configured yet. Fill in your hotel details and click "Create Hotel" to get started.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Star Rating</label>
          <select name="star_rating" value={form.star_rating} onChange={handleChange} className="input-field">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" name="address" value={form.address} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input type="text" name="city" value={form.city} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input type="text" name="country" value={form.country} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input type="url" name="website" value={form.website} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
          <input type="time" name="check_in_time" value={form.check_in_time} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
          <input type="time" name="check_out_time" value={form.check_out_time} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select name="currency" value={form.currency} onChange={handleChange} className="input-field">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
          <select name="timezone" value={form.timezone} onChange={handleChange} className="input-field">
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Policy</label>
        <textarea name="cancellation_policy" value={form.cancellation_policy} onChange={handleChange} rows={3} className="input-field" placeholder="Free cancellation up to 24 hours before check-in..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Policy</label>
        <textarea name="payment_policy" value={form.payment_policy} onChange={handleChange} rows={3} className="input-field" placeholder="Full payment required at check-in..." />
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saving ? (currentHotel ? 'Saving...' : 'Creating...') : (currentHotel ? 'Save Settings' : 'Create Hotel')}
        </button>
      </div>
    </div>
  );
}

function RoomTypesTab() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<RoomType | null>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', base_rate: 0, max_occupancy: 2, amenities: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchRoomTypes = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('room_types')
      .select('*')
      .eq('hotel_id', currentHotel.id)
      .order('base_rate', { ascending: true });
    if (error) toast('error', 'Failed to load room types');
    setRoomTypes((data || []) as RoomType[]);
    setLoading(false);
  }, [currentHotel]);

  useEffect(() => { fetchRoomTypes(); }, [fetchRoomTypes]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'base_rate' || name === 'max_occupancy' ? Number(value) : value,
    }));
  };

  const openEditModal = (type: RoomType) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      description: type.description || '',
      base_rate: type.base_rate,
      max_occupancy: type.max_occupancy || 2,
      amenities: Array.isArray(type.amenities) ? type.amenities.join(', ') : '',
    });
    setShowEditModal(true);
  };

  const handleAddRoomType = async () => {
    if (!currentHotel) return;
    setSubmitting(true);
    const amenitiesArray = formData.amenities.split(',').map(a => a.trim()).filter(Boolean);
    const { error } = await supabase.from('room_types').insert({
      hotel_id: currentHotel.id,
      name: formData.name,
      description: formData.description,
      base_rate: formData.base_rate,
      max_occupancy: formData.max_occupancy,
      amenities: amenitiesArray,
    });
    if (error) { toast('error', error.message); }
    else { toast('success', 'Room type added'); setShowAddModal(false); setFormData({ name: '', description: '', base_rate: 0, max_occupancy: 2, amenities: '' }); await fetchRoomTypes(); }
    setSubmitting(false);
  };

  const handleEditRoomType = async () => {
    if (!selectedType) return;
    setSubmitting(true);
    const amenitiesArray = formData.amenities.split(',').map(a => a.trim()).filter(Boolean);
    const { error } = await supabase.from('room_types').update({
      name: formData.name,
      description: formData.description,
      base_rate: formData.base_rate,
      max_occupancy: formData.max_occupancy,
      amenities: amenitiesArray,
    }).eq('id', selectedType.id);
    if (error) { toast('error', error.message); }
    else { toast('success', 'Room type updated'); setShowEditModal(false); await fetchRoomTypes(); }
    setSubmitting(false);
  };

  const handleDeleteRoomType = async () => {
    if (!selectedType) return;
    const { error } = await supabase.from('room_types').delete().eq('id', selectedType.id);
    if (error) { toast('error', error.message); }
    else { toast('success', 'Room type deleted'); setShowDeleteDialog(false); await fetchRoomTypes(); }
  };

  const renderForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
        <input type="text" name="name" value={formData.name} onChange={handleFormChange} className="input-field" placeholder="Standard, Deluxe, Suite..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea name="description" value={formData.description} onChange={handleFormChange} rows={2} className="input-field" placeholder="Comfortable room with..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate ($)</label>
          <input type="number" name="base_rate" value={formData.base_rate} onChange={handleFormChange} min={0} step={0.01} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Occupancy</label>
          <input type="number" name="max_occupancy" value={formData.max_occupancy} onChange={handleFormChange} min={1} className="input-field" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amenities (comma separated)</label>
        <input type="text" name="amenities" value={formData.amenities} onChange={handleFormChange} className="input-field" placeholder="WiFi, TV, Mini Bar..." />
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setFormData({ name: '', description: '', base_rate: 0, max_occupancy: 2, amenities: '' }); setShowAddModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Room Type
        </button>
      </div>

      {roomTypes.length === 0 ? (
        <EmptyState icon={<DollarSign className="h-6 w-6" />} title="No room types" description="Add your first room type to get started." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead><tr>
              <th className="table-header">Type Name</th>
              <th className="table-header">Description</th>
              <th className="table-header">Base Rate</th>
              <th className="table-header">Max Occupancy</th>
              <th className="table-header">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {roomTypes.map(type => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{type.name}</td>
                  <td className="table-cell text-gray-600 max-w-xs truncate">{type.description || '-'}</td>
                  <td className="table-cell">${type.base_rate.toFixed(2)}</td>
                  <td className="table-cell">{type.max_occupancy} guests</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(type)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setSelectedType(type); setShowDeleteDialog(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Room Type">
        {renderForm()}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAddRoomType} disabled={submitting} className="btn-primary">{submitting ? 'Adding...' : 'Add Room Type'}</button>
        </div>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Room Type">
        {renderForm()}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleEditRoomType} disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteRoomType}
        title="Delete Room Type"
        message={`Are you sure you want to delete ${selectedType?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function TaxConfigurationTab() {
  const { currentHotel, refreshHotels } = useHotel();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tax_rate: 0,
    vat_rate: 0,
    city_tax: 0,
    service_charge: 0,
    tax_inclusive: false,
  });

  useEffect(() => {
    if (currentHotel) {
      setForm({
        tax_rate: currentHotel.tax_rate || 0,
        vat_rate: currentHotel.vat_rate || 0,
        city_tax: currentHotel.city_tax || 0,
        service_charge: currentHotel.service_charge || 0,
        tax_inclusive: currentHotel.tax_inclusive || false,
      });
    }
  }, [currentHotel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value),
    }));
  };

  const handleSave = async () => {
    if (!currentHotel) return;
    setSaving(true);
    const { error } = await supabase.from('hotels').update(form).eq('id', currentHotel.id);
    if (error) {
      toast('error', error.message || 'Failed to save tax configuration');
    } else {
      await refreshHotels();
      toast('success', 'Tax configuration saved successfully');
    }
    setSaving(false);
  };

  const totalTax = form.tax_rate + form.vat_rate + form.city_tax + form.service_charge;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Standard Tax Rate (%)</label>
          <input type="number" name="tax_rate" value={form.tax_rate} onChange={handleChange} min={0} max={100} step={0.01} className="input-field" />
          <p className="text-xs text-gray-500 mt-1">General sales tax or hotel tax</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">VAT/GST Rate (%)</label>
          <input type="number" name="vat_rate" value={form.vat_rate} onChange={handleChange} min={0} max={100} step={0.01} className="input-field" />
          <p className="text-xs text-gray-500 mt-1">Value-added tax or goods & services tax</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City Tax (%)</label>
          <input type="number" name="city_tax" value={form.city_tax} onChange={handleChange} min={0} max={100} step={0.01} className="input-field" />
          <p className="text-xs text-gray-500 mt-1">Local city or tourism tax</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Charge (%)</label>
          <input type="number" name="service_charge" value={form.service_charge} onChange={handleChange} min={0} max={100} step={0.01} className="input-field" />
          <p className="text-xs text-gray-500 mt-1">Additional service charge</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Total Tax Rate</p>
            <p className="text-xs text-blue-700">Combined rate for all taxes and charges</p>
          </div>
          <div className="text-2xl font-bold text-blue-900">{totalTax.toFixed(2)}%</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" name="tax_inclusive" checked={form.tax_inclusive} onChange={handleChange} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
        <div>
          <label className="text-sm font-medium text-gray-700">Tax Inclusive Pricing</label>
          <p className="text-xs text-gray-500">Show prices with tax included</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

function UsersPermissionsTab() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', role: 'receptionist', is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('hotel_id', currentHotel.id)
      .order('created_at', { ascending: false });
    if (error) toast('error', 'Failed to load staff');
    setStaffMembers((data || []) as StaffMember[]);
    setLoading(false);
  }, [currentHotel]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleActive = () => {
    setFormData(prev => ({ ...prev, is_active: !prev.is_active }));
  };

  const openEditModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      is_active: member.is_active,
    });
    setShowEditModal(true);
  };

  const handleAddStaff = async () => {
    if (!currentHotel) return;
    setSubmitting(true);
    const { error } = await supabase.from('staff_members').insert({ hotel_id: currentHotel.id, ...formData });
    if (error) { toast('error', error.message); }
    else {
      toast('success', 'Staff member added');
      setShowAddModal(false);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'receptionist', is_active: true });
      await fetchStaff();
    }
    setSubmitting(false);
  };

  const handleEditStaff = async () => {
    if (!selectedStaff) return;
    setSubmitting(true);
    const { error } = await supabase.from('staff_members').update(formData).eq('id', selectedStaff.id);
    if (error) { toast('error', error.message); }
    else { toast('success', 'Staff member updated'); setShowEditModal(false); await fetchStaff(); }
    setSubmitting(false);
  };

  const handleDeactivateStaff = async () => {
    if (!selectedStaff) return;
    const { error } = await supabase.from('staff_members').update({ is_active: false }).eq('id', selectedStaff.id);
    if (error) { toast('error', error.message); }
    else { toast('success', 'Staff member deactivated'); setShowDeactivateDialog(false); await fetchStaff(); }
  };

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input type="text" name="first_name" value={formData.first_name} onChange={handleFormChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input type="text" name="last_name" value={formData.last_name} onChange={handleFormChange} className="input-field" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleFormChange} className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleFormChange} className="input-field" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <select name="role" value={formData.role} onChange={handleFormChange} className="input-field">
          {STAFF_ROLES.map(role => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {formData.role === 'admin' && 'Full access to all features'}
          {formData.role === 'manager' && 'All operations except user management'}
          {formData.role === 'receptionist' && 'Reservations, check-in/out, basic reports'}
          {formData.role === 'housekeeping' && 'View and update housekeeping tasks only'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={handleToggleActive} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_active ? 'bg-brand-600' : 'bg-gray-300'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm font-medium text-gray-700">{formData.is_active ? 'Active' : 'Inactive'}</span>
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setFormData({ first_name: '', last_name: '', email: '', phone: '', role: 'receptionist', is_active: true }); setShowAddModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Staff Member
        </button>
      </div>

      {staffMembers.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No staff members" description="Add your first staff member to get started." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead><tr>
              <th className="table-header">Name</th>
              <th className="table-header">Email</th>
              <th className="table-header">Role</th>
              <th className="table-header">Status</th>
              <th className="table-header">Phone</th>
              <th className="table-header">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {staffMembers.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{member.first_name} {member.last_name}</td>
                  <td className="table-cell">{member.email}</td>
                  <td className="table-cell"><span className={ROLE_BADGE_MAP[member.role] || 'badge badge-neutral'}>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span></td>
                  <td className="table-cell"><span className={member.is_active ? 'badge badge-success' : 'badge badge-danger'}>{member.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="table-cell">{member.phone || '-'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(member)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                        <Edit className="h-4 w-4" />
                      </button>
                      {member.is_active && (
                        <button onClick={() => { setSelectedStaff(member); setShowDeactivateDialog(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Staff Member">
        {renderForm()}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAddStaff} disabled={submitting} className="btn-primary">{submitting ? 'Adding...' : 'Add Staff'}</button>
        </div>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Staff Member">
        {renderForm()}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleEditStaff} disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        onConfirm={handleDeactivateStaff}
        title="Deactivate Staff Member"
        message={`Are you sure you want to deactivate ${selectedStaff?.first_name} ${selectedStaff?.last_name}?`}
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}

function EmailTemplatesTab() {
  const { currentHotel, refreshHotels } = useHotel();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    booking_confirmation_template: '',
    checkin_reminder_template: '',
    thankyou_template: '',
  });

  useEffect(() => {
    if (currentHotel) {
      setForm({
        booking_confirmation_template: currentHotel.booking_confirmation_template || '',
        checkin_reminder_template: currentHotel.checkin_reminder_template || '',
        thankyou_template: currentHotel.thankyou_template || '',
      });
    }
  }, [currentHotel]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!currentHotel) return;
    setSaving(true);
    const { error } = await supabase.from('hotels').update(form).eq('id', currentHotel.id);
    if (error) {
      toast('error', error.message || 'Failed to save email templates');
    } else {
      await refreshHotels();
      toast('success', 'Email templates saved successfully');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium mb-2">Available Variables</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700">
          <span className="font-mono bg-white px-2 py-1 rounded">{'{guest_name}'}</span>
          <span className="font-mono bg-white px-2 py-1 rounded">{'{hotel_name}'}</span>
          <span className="font-mono bg-white px-2 py-1 rounded">{'{reservation_number}'}</span>
          <span className="font-mono bg-white px-2 py-1 rounded">{'{check_in_date}'}</span>
          <span className="font-mono bg-white px-2 py-1 rounded">{'{check_out_date}'}</span>
          <span className="font-mono bg-white px-2 py-1 rounded">{'{room_type}'}</span>
          <span className="font-mono bg-white px-2 py-1 rounded">{'{room_number}'}</span>
          <span className="font-mono bg-white px-2 py-1 rounded">{'{total_amount}'}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Booking Confirmation Email</label>
        <textarea name="booking_confirmation_template" value={form.booking_confirmation_template} onChange={handleChange} rows={6} className="input-field font-mono text-sm" placeholder="Dear {guest_name},&#10;&#10;Thank you for your reservation at {hotel_name}!&#10;&#10;Confirmation Number: {reservation_number}&#10;Check-in: {check_in_date}&#10;Check-out: {check_out_date}&#10;Room Type: {room_type}&#10;Total Amount: {total_amount}&#10;&#10;We look forward to welcoming you!&#10;&#10;Best regards,&#10;{hotel_name}" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Reminder Email</label>
        <textarea name="checkin_reminder_template" value={form.checkin_reminder_template} onChange={handleChange} rows={6} className="input-field font-mono text-sm" placeholder="Dear {guest_name},&#10;&#10;This is a reminder that your stay at {hotel_name} begins tomorrow!&#10;&#10;Check-in Time: 2:00 PM&#10;Reservation: {reservation_number}&#10;Room: {room_type}&#10;&#10;Please contact us if you need any assistance.&#10;&#10;See you soon!&#10;{hotel_name}" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Thank You Email</label>
        <textarea name="thankyou_template" value={form.thankyou_template} onChange={handleChange} rows={6} className="input-field font-mono text-sm" placeholder="Dear {guest_name},&#10;&#10;Thank you for staying with us at {hotel_name}!&#10;&#10;We hope you enjoyed your visit and we would love to welcome you back soon.&#10;&#10;If you have any feedback, please don't hesitate to reach out.&#10;&#10;Best regards,&#10;{hotel_name}" />
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Templates'}
        </button>
      </div>
    </div>
  );
}

function PaymentSettingsTab() {
  const { currentHotel, refreshHotels } = useHotel();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accepts_credit_card: true,
    accepts_debit_card: true,
    accepts_cash: true,
    accepts_bank_transfer: false,
    deposit_required: false,
    deposit_percentage: 0,
    stripe_enabled: false,
  });

  useEffect(() => {
    if (currentHotel) {
      setForm({
        accepts_credit_card: currentHotel.accepts_credit_card ?? true,
        accepts_debit_card: currentHotel.accepts_debit_card ?? true,
        accepts_cash: currentHotel.accepts_cash ?? true,
        accepts_bank_transfer: currentHotel.accepts_bank_transfer ?? false,
        deposit_required: currentHotel.deposit_required ?? false,
        deposit_percentage: currentHotel.deposit_percentage || 0,
        stripe_enabled: currentHotel.stripe_enabled ?? false,
      });
    }
  }, [currentHotel]);

  const handleToggle = (field: keyof typeof form) => {
    setForm(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleSave = async () => {
    if (!currentHotel) return;
    setSaving(true);
    const { error } = await supabase.from('hotels').update(form).eq('id', currentHotel.id);
    if (error) {
      toast('error', error.message || 'Failed to save payment settings');
    } else {
      await refreshHotels();
      toast('success', 'Payment settings saved successfully');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Accepted Payment Methods</h3>
        <div className="space-y-3">
          {[
            { key: 'accepts_credit_card' as const, label: 'Credit Card', description: 'Visa, Mastercard, Amex' },
            { key: 'accepts_debit_card' as const, label: 'Debit Card', description: 'Direct debit cards' },
            { key: 'accepts_cash' as const, label: 'Cash', description: 'Cash payments at property' },
            { key: 'accepts_bank_transfer' as const, label: 'Bank Transfer', description: 'Direct bank transfers' },
          ].map(method => (
            <div key={method.key} className="flex items-start gap-3">
              <button type="button" onClick={() => handleToggle(method.key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form[method.key] ? 'bg-brand-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form[method.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{method.label}</p>
                <p className="text-xs text-gray-500">{method.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Deposit Requirements</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => handleToggle('deposit_required')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.deposit_required ? 'bg-brand-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.deposit_required ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Require Deposit</p>
              <p className="text-xs text-gray-500">Require a deposit payment at booking</p>
            </div>
          </div>
          {form.deposit_required && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Percentage (%)</label>
              <input type="number" name="deposit_percentage" value={form.deposit_percentage} onChange={handleChange} min={0} max={100} step={1} className="input-field max-w-xs" />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Online Payment Integration</h3>
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => handleToggle('stripe_enabled')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.stripe_enabled ? 'bg-brand-600' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.stripe_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Enable Stripe Payments</p>
            <p className="text-xs text-gray-500">Accept online payments via Stripe (Test mode)</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { currentHotel, refreshHotels } = useHotel();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email_booking_confirmation: true,
    email_checkin_reminder: true,
    email_checkout_reminder: true,
    email_payment_received: true,
    sms_booking_confirmation: false,
    sms_checkin_reminder: false,
    inapp_new_booking: true,
    inapp_payment_received: true,
    inapp_task_assigned: true,
  });

  useEffect(() => {
    if (currentHotel) {
      setForm({
        email_booking_confirmation: currentHotel.email_booking_confirmation ?? true,
        email_checkin_reminder: currentHotel.email_checkin_reminder ?? true,
        email_checkout_reminder: currentHotel.email_checkout_reminder ?? true,
        email_payment_received: currentHotel.email_payment_received ?? true,
        sms_booking_confirmation: currentHotel.sms_booking_confirmation ?? false,
        sms_checkin_reminder: currentHotel.sms_checkin_reminder ?? false,
        inapp_new_booking: currentHotel.inapp_new_booking ?? true,
        inapp_payment_received: currentHotel.inapp_payment_received ?? true,
        inapp_task_assigned: currentHotel.inapp_task_assigned ?? true,
      });
    }
  }, [currentHotel]);

  const handleToggle = (field: keyof typeof form) => {
    setForm(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    if (!currentHotel) return;
    setSaving(true);
    const { error } = await supabase.from('hotels').update(form).eq('id', currentHotel.id);
    if (error) {
      toast('error', error.message || 'Failed to save notification settings');
    } else {
      await refreshHotels();
      toast('success', 'Notification settings saved successfully');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Email Notifications</h3>
        <div className="space-y-3">
          {[
            { key: 'email_booking_confirmation' as const, label: 'Booking Confirmation', description: 'Send email when new booking is created' },
            { key: 'email_checkin_reminder' as const, label: 'Check-in Reminder', description: 'Send reminder 1 day before check-in' },
            { key: 'email_checkout_reminder' as const, label: 'Check-out Reminder', description: 'Send reminder on check-out day' },
            { key: 'email_payment_received' as const, label: 'Payment Received', description: 'Send email when payment is received' },
          ].map(notif => (
            <div key={notif.key} className="flex items-start gap-3">
              <button type="button" onClick={() => handleToggle(notif.key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form[notif.key] ? 'bg-brand-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form[notif.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{notif.label}</p>
                <p className="text-xs text-gray-500">{notif.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">SMS Notifications</h3>
        <div className="space-y-3">
          {[
            { key: 'sms_booking_confirmation' as const, label: 'Booking Confirmation', description: 'Send SMS when new booking is created' },
            { key: 'sms_checkin_reminder' as const, label: 'Check-in Reminder', description: 'Send SMS 1 day before check-in' },
          ].map(notif => (
            <div key={notif.key} className="flex items-start gap-3">
              <button type="button" onClick={() => handleToggle(notif.key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form[notif.key] ? 'bg-brand-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form[notif.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{notif.label}</p>
                <p className="text-xs text-gray-500">{notif.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">In-App Alerts</h3>
        <div className="space-y-3">
          {[
            { key: 'inapp_new_booking' as const, label: 'New Booking', description: 'Show alert when new booking arrives' },
            { key: 'inapp_payment_received' as const, label: 'Payment Received', description: 'Show alert when payment is received' },
            { key: 'inapp_task_assigned' as const, label: 'Task Assigned', description: 'Show alert when task is assigned to you' },
          ].map(notif => (
            <div key={notif.key} className="flex items-start gap-3">
              <button type="button" onClick={() => handleToggle(notif.key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form[notif.key] ? 'bg-brand-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form[notif.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{notif.label}</p>
                <p className="text-xs text-gray-500">{notif.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const { currentHotel, refreshHotels } = useHotel();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    language: 'en',
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    first_day_of_week: '0',
    theme: 'light',
  });

  useEffect(() => {
    if (currentHotel) {
      setForm({
        language: currentHotel.language || 'en',
        date_format: currentHotel.date_format || 'MM/DD/YYYY',
        time_format: currentHotel.time_format || '12h',
        first_day_of_week: currentHotel.first_day_of_week?.toString() || '0',
        theme: currentHotel.theme || 'light',
      });
    }
  }, [currentHotel]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!currentHotel) return;
    setSaving(true);
    const { error } = await supabase.from('hotels').update({
      ...form,
      first_day_of_week: Number(form.first_day_of_week),
    }).eq('id', currentHotel.id);
    if (error) {
      toast('error', error.message || 'Failed to save preferences');
    } else {
      await refreshHotels();
      toast('success', 'Preferences saved successfully');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select name="language" value={form.language} onChange={handleChange} className="input-field">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
          <select name="date_format" value={form.date_format} onChange={handleChange} className="input-field">
            <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
            <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
          <select name="time_format" value={form.time_format} onChange={handleChange} className="input-field">
            <option value="12h">12-hour (2:30 PM)</option>
            <option value="24h">24-hour (14:30)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Day of Week</label>
          <select name="first_day_of_week" value={form.first_day_of_week} onChange={handleChange} className="input-field">
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="6">Saturday</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
          <select name="theme" value={form.theme} onChange={handleChange} className="input-field">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { staff } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('hotel');

  const visibleTabs = TABS.filter(tab => {
    if (tab.adminOnly && staff?.role !== 'admin') return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your hotel configuration and preferences</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4 overflow-x-auto">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        {activeTab === 'hotel' && <HotelSettingsTab />}
        {activeTab === 'rooms' && <RoomTypesTab />}
        {activeTab === 'tax' && <TaxConfigurationTab />}
        {activeTab === 'users' && <UsersPermissionsTab />}
        {activeTab === 'emails' && <EmailTemplatesTab />}
        {activeTab === 'payment' && <PaymentSettingsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
      </div>
    </div>
  );
}
