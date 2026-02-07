import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Building2,
  Users,
  Activity,
  Save,
  Plus,
  Edit,
  UserX,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useHotel } from '../contexts/HotelContext';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/utils';
import type { StaffMember, ActivityLogEntry } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

type TabKey = 'property' | 'staff' | 'activity';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'America/Honolulu', 'America/Toronto', 'America/Vancouver',
  'America/Mexico_City', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
  'Europe/Amsterdam', 'Europe/Moscow', 'Europe/Istanbul',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Hong_Kong',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  'Pacific/Auckland', 'Pacific/Fiji', 'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos',
];

const STAFF_ROLES = ['admin', 'manager', 'receptionist', 'housekeeping'] as const;

const ROLE_BADGE_MAP: Record<string, string> = {
  admin: 'badge badge-danger',
  manager: 'badge badge-warning',
  receptionist: 'badge badge-info',
  housekeeping: 'badge badge-success',
};

const ACTION_TYPES = [
  'All Actions', 'check_in', 'check_out', 'reservation_created',
  'reservation_updated', 'reservation_cancelled', 'payment_received',
  'room_status_changed', 'staff_created', 'staff_updated', 'settings_updated',
];

const ITEMS_PER_PAGE = 20;

interface PropertyFormData {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  star_rating: number;
  check_in_time: string;
  check_out_time: string;
  tax_rate: number;
  currency: string;
  timezone: string;
  cancellation_policy: string;
}

interface StaffFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
}

const defaultStaffForm: StaffFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'receptionist',
  is_active: true,
};

function PropertyTab() {
  const { currentHotel, refreshHotels } = useHotel();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PropertyFormData>({
    name: '', address: '', city: '', country: '', phone: '', email: '',
    website: '', star_rating: 3, check_in_time: '14:00', check_out_time: '11:00',
    tax_rate: 0, currency: 'USD', timezone: 'America/New_York', cancellation_policy: '',
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

  const handleSave = async () => {
    if (!currentHotel) return;
    setSaving(true);
    const { error } = await supabase.from('hotels').update(form).eq('id', currentHotel.id);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'Hotel Name', name: 'name', type: 'text' },
          { label: 'Address', name: 'address', type: 'text' },
          { label: 'City', name: 'city', type: 'text' },
          { label: 'Country', name: 'country', type: 'text' },
          { label: 'Phone', name: 'phone', type: 'tel' },
          { label: 'Email', name: 'email', type: 'email' },
          { label: 'Website', name: 'website', type: 'url' },
        ].map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <input type={field.type} name={field.name} value={String((form as unknown as Record<string, string>)[field.name] || '')} onChange={handleChange} className="input-field" />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Star Rating</label>
          <select name="star_rating" value={form.star_rating} onChange={handleChange} className="input-field">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
          </select>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate</label>
          <div className="relative">
            <input type="number" name="tax_rate" value={form.tax_rate} onChange={handleChange} min={0} max={100} step={0.01} className="input-field pr-8" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
          </div>
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
        <textarea name="cancellation_policy" value={form.cancellation_policy} onChange={handleChange} rows={4} className="input-field" />
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

function StaffTab() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(defaultStaffForm);
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
      first_name: member.first_name, last_name: member.last_name,
      email: member.email, phone: member.phone,
      role: member.role, is_active: member.is_active,
    });
    setShowEditModal(true);
  };

  const handleAddStaff = async () => {
    if (!currentHotel) return;
    setSubmitting(true);
    const { error } = await supabase.from('staff_members').insert({ hotel_id: currentHotel.id, ...formData });
    if (error) { toast('error', error.message); }
    else { toast('success', 'Staff member added'); setShowAddModal(false); await fetchStaff(); }
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

  const renderStaffForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <button onClick={() => { setFormData(defaultStaffForm); setShowAddModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Staff
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
                      <button onClick={() => openEditModal(member)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"><Edit className="h-4 w-4" /></button>
                      {member.is_active && (
                        <button onClick={() => { setSelectedStaff(member); setShowDeactivateDialog(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><UserX className="h-4 w-4" /></button>
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
        {renderStaffForm()}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAddStaff} disabled={submitting} className="btn-primary">{submitting ? 'Adding...' : 'Add Staff'}</button>
        </div>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Staff Member">
        {renderStaffForm()}
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

function ActivityLogTab() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('All Actions');

  const fetchLogs = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('hotel_id', currentHotel.id)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (actionFilter !== 'All Actions') query = query.eq('action', actionFilter);
    const { data, error, count } = await query;
    if (error) toast('error', 'Failed to load activity log');
    setLogs((data || []) as ActivityLogEntry[]);
    setTotalCount(count || 0);
    setLoading(false);
  }, [currentHotel, currentPage, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setCurrentPage(1); }, [actionFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Action</label>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="input-field max-w-xs">
          {ACTION_TYPES.map(action => (
            <option key={action} value={action}>
              {action === 'All Actions' ? action : action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </option>
          ))}
        </select>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity found" description="There are no activity log entries yet." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead><tr>
                <th className="table-header">Date/Time</th>
                <th className="table-header">Action</th>
                <th className="table-header">Entity Type</th>
                <th className="table-header">Details</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="table-cell whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {formatDateTime(log.created_at)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-info">
                        {log.action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td className="table-cell">{log.entity_type || '-'}</td>
                    <td className="table-cell max-w-xs truncate text-gray-500">
                      {log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details).slice(0, 60) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="btn-secondary text-sm disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="btn-secondary text-sm disabled:opacity-40">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'property', label: 'Property', icon: <Building2 className="h-4 w-4" /> },
  { key: 'staff', label: 'Staff', icon: <Users className="h-4 w-4" /> },
  { key: 'activity', label: 'Activity Log', icon: <Activity className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('property');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your hotel configuration and staff</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        {activeTab === 'property' && <PropertyTab />}
        {activeTab === 'staff' && <StaffTab />}
        {activeTab === 'activity' && <ActivityLogTab />}
      </div>
    </div>
  );
}
