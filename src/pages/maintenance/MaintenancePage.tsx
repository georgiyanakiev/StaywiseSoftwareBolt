import { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Plus,
  CheckCircle,
  Search,
  Filter,
  Euro,
  Zap,
  Droplets,
  Wind,
  Armchair,
  Cpu,
  Building,
  Package,
  X,
  Calendar,
  User,
  MapPin,
  ArrowUpRight,
  RefreshCw,
  ClipboardCheck,
  Hammer,
} from 'lucide-react';
import { useHotel } from '../../contexts/HotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { useTenantId } from '../../hooks/useTenantQuery';
import { getStatusLabel, formatDate, formatDateTime } from '../../lib/utils';
import type { MaintenanceRequest, MaintenanceCategory, Room, StaffMember } from '../../types';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

const CATEGORIES: { value: MaintenanceCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'plumbing', label: 'Plumbing', icon: Droplets, color: 'text-blue-600 bg-blue-50' },
  { value: 'electrical', label: 'Electrical', icon: Zap, color: 'text-yellow-600 bg-yellow-50' },
  { value: 'hvac', label: 'HVAC', icon: Wind, color: 'text-sky-600 bg-sky-50' },
  { value: 'furniture', label: 'Furniture', icon: Armchair, color: 'text-amber-600 bg-amber-50' },
  { value: 'appliance', label: 'Appliance', icon: Package, color: 'text-orange-600 bg-orange-50' },
  { value: 'structural', label: 'Structural', icon: Building, color: 'text-stone-600 bg-stone-50' },
  { value: 'it', label: 'IT / Tech', icon: Cpu, color: 'text-emerald-600 bg-emerald-50' },
  { value: 'electronics', label: 'Electronics', icon: Cpu, color: 'text-purple-600 bg-purple-50' },
  { value: 'carpentry', label: 'Carpentry', icon: Hammer, color: 'text-amber-700 bg-amber-50' },
  { value: 'cleaning', label: 'Cleaning', icon: Droplets, color: 'text-teal-600 bg-teal-50' },
  { value: 'other', label: 'Other', icon: Wrench, color: 'text-gray-600 bg-gray-50' },
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const STATUSES = ['reported', 'in_progress', 'completed'] as const;

const PRIORITY_STYLES: Record<string, { badge: string; border: string; dot: string }> = {
  low: { badge: 'bg-gray-100 text-gray-700', border: 'border-l-gray-300', dot: 'bg-gray-400' },
  medium: { badge: 'bg-blue-100 text-blue-700', border: 'border-l-blue-400', dot: 'bg-blue-500' },
  high: { badge: 'bg-orange-100 text-orange-700', border: 'border-l-orange-400', dot: 'bg-orange-500' },
  urgent: { badge: 'bg-red-100 text-red-700', border: 'border-l-red-500', dot: 'bg-red-500' },
};

const STATUS_STYLES: Record<string, string> = {
  reported: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const getCategoryMeta = (cat: string) =>
  CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];

interface IssueFormData {
  room_id: string;
  category: MaintenanceCategory;
  priority: MaintenanceRequest['priority'];
  description: string;
  reported_by: string;
  assigned_to: string;
  estimated_cost: string;
  vendor: string;
  scheduled_for: string;
}

interface ResolveFormData {
  resolution_notes: string;
  actual_cost: string;
}

const defaultIssueForm: IssueFormData = {
  room_id: '',
  category: 'other',
  priority: 'medium',
  description: '',
  reported_by: '',
  assigned_to: '',
  estimated_cost: '',
  vendor: '',
  scheduled_for: '',
};

const defaultResolveForm: ResolveFormData = {
  resolution_notes: '',
  actual_cost: '',
};

type ViewTab = 'list' | 'kanban';

export default function MaintenancePage() {
  const { currentHotel } = useHotel();
  const { t } = useLanguage();
  const tenantId = useTenantId();
  const { toast } = useToast();

  const [issues, setIssues] = useState<MaintenanceRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewTab, setViewTab] = useState<ViewTab>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueFormData>(defaultIssueForm);
  const [saving, setSaving] = useState(false);

  const [selectedIssue, setSelectedIssue] = useState<MaintenanceRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveForm, setResolveForm] = useState<ResolveFormData>(defaultResolveForm);
  const [resolving, setResolving] = useState(false);

  const [showFilters, setShowFilters] = useState(false);

  const fetchAll = async () => {
    if (!currentHotel) { setLoading(false); return; }
    setLoading(true);
    const [issuesRes, roomsRes, staffRes] = await Promise.all([
      supabase
        .from('maintenance_requests')
        .select('*, room:rooms(*, room_type:room_types(*))')
        .eq('hotel_id', currentHotel.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('rooms')
        .select('*, room_type:room_types(*)')
        .eq('hotel_id', currentHotel.id)
        .order('number'),
      supabase
        .from('staff_members')
        .select('*')
        .eq('hotel_id', currentHotel.id)
        .eq('is_active', true)
        .order('first_name'),
    ]);
    setIssues((issuesRes.data || []) as MaintenanceRequest[]);
    setRooms((roomsRes.data || []) as Room[]);
    setStaff((staffRes.data || []) as StaffMember[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [currentHotel?.id]);

  const filtered = useMemo(() => {
    return issues.filter(i => {
      if (categoryFilter && i.category !== categoryFilter) return false;
      if (priorityFilter && i.priority !== priorityFilter) return false;
      if (statusFilter && i.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          i.description.toLowerCase().includes(q) ||
          i.room?.number?.toLowerCase().includes(q) ||
          i.assigned_to?.toLowerCase().includes(q) ||
          i.reported_by?.toLowerCase().includes(q) ||
          i.vendor?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [issues, categoryFilter, priorityFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const open = issues.filter(i => i.status !== 'completed');
    const totalCost = issues.filter(i => i.status === 'completed').reduce((s, i) => s + (i.actual_cost || i.cost || 0), 0);
    const urgent = open.filter(i => i.priority === 'urgent' || i.priority === 'high');
    const scheduled = open.filter(i => i.scheduled_for);
    return {
      open: open.length,
      inProgress: issues.filter(i => i.status === 'in_progress').length,
      completedMonth: issues.filter(i => {
        if (i.status !== 'completed' || !i.resolved_at) return false;
        const d = new Date(i.resolved_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      totalCost,
      urgent: urgent.length,
      scheduled: scheduled.length,
    };
  }, [issues]);

  const openCreate = () => {
    setIssueForm({ ...defaultIssueForm, room_id: rooms[0]?.id || '' });
    setShowCreateModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSaving(true);
    const { error } = await supabase.from('maintenance_requests').insert({
      hotel_id: currentHotel.id,
      room_id: issueForm.room_id,
      category: issueForm.category,
      priority: issueForm.priority,
      description: issueForm.description.trim(),
      status: 'reported',
      assigned_to: issueForm.assigned_to.trim(),
      reported_by: issueForm.reported_by.trim(),
      estimated_cost: parseFloat(issueForm.estimated_cost) || 0,
      actual_cost: 0,
      cost: 0,
      vendor: issueForm.vendor.trim(),
      scheduled_for: issueForm.scheduled_for || null,
      resolution_notes: '',
      ...(tenantId ? { tenant_id: tenantId } : {}),
    });
    if (error) { toast('error', 'Failed to create issue'); setSaving(false); return; }
    toast('success', 'Maintenance issue created');
    setSaving(false);
    setShowCreateModal(false);
    fetchAll();
  };

  const advanceStatus = async (issue: MaintenanceRequest) => {
    const next = issue.status === 'reported' ? 'in_progress' : null;
    if (!next) return;
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: next })
      .eq('id', issue.id);
    if (error) { toast('error', 'Failed to update status'); return; }
    toast('success', 'Issue moved to In Progress');
    fetchAll();
  };

  const openResolve = (issue: MaintenanceRequest) => {
    setSelectedIssue(issue);
    setResolveForm({ resolution_notes: issue.resolution_notes || '', actual_cost: String(issue.actual_cost || issue.cost || '') });
    setShowResolveModal(true);
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setResolving(true);
    const { error } = await supabase
      .from('maintenance_requests')
      .update({
        status: 'completed',
        resolved_at: new Date().toISOString(),
        resolution_notes: resolveForm.resolution_notes.trim(),
        actual_cost: parseFloat(resolveForm.actual_cost) || 0,
        cost: parseFloat(resolveForm.actual_cost) || 0,
      })
      .eq('id', selectedIssue.id);
    if (error) { toast('error', 'Failed to resolve issue'); setResolving(false); return; }
    if (selectedIssue.room_id) {
      await supabase.from('rooms').update({ status: 'available' }).eq('id', selectedIssue.room_id);
    }
    toast('success', 'Issue resolved');
    setResolving(false);
    setShowResolveModal(false);
    if (showDetailModal) setShowDetailModal(false);
    fetchAll();
  };

  const openDetail = (issue: MaintenanceRequest) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
  };

  const kanbanColumns: { status: MaintenanceRequest['status']; label: string; color: string; headerBg: string }[] = [
    { status: 'reported', label: 'Reported', color: 'bg-amber-50 border-amber-200', headerBg: 'bg-amber-100 text-amber-800' },
    { status: 'in_progress', label: 'In Progress', color: 'bg-blue-50 border-blue-200', headerBg: 'bg-blue-100 text-blue-800' },
    { status: 'completed', label: 'Resolved', color: 'bg-emerald-50 border-emerald-200', headerBg: 'bg-emerald-100 text-emerald-800' },
  ];

  const activeFiltersCount = [categoryFilter, priorityFilter, statusFilter].filter(Boolean).length;

  if (loading) return <LoadingSpinner size="lg" />;
  if (!currentHotel) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.maintenance.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.maintenance.trackIssues}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="btn-secondary p-2.5" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            {t.maintenance.reportIssue}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500">{t.maintenance.openIssues}</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.open}</span>
          {stats.urgent > 0 && (
            <p className="text-xs text-red-600 font-medium mt-1">{stats.urgent} high/urgent</p>
          )}
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Hammer className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500">{t.maintenance.inProgressIssues}</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.inProgress}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-500">{t.maintenance.resolvedThisMonth}</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.completedMonth}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500">{t.maintenance.totalRepairCost}</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{currentHotel.currency} {stats.totalCost.toFixed(0)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search issues, rooms, staff..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field pl-9 w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary relative ${activeFiltersCount > 0 ? 'ring-2 ring-brand-300' : ''}`}
        >
          <Filter className="w-4 h-4" />
          {t.maintenance.filters}
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewTab('kanban')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${viewTab === 'kanban' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {t.maintenance.board}
          </button>
          <button
            onClick={() => setViewTab('list')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${viewTab === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {t.maintenance.list}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field w-full text-sm">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input-field w-full text-sm">
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{getStatusLabel(p)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-full text-sm">
              <option value="">All Statuses</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setCategoryFilter(''); setPriorityFilter(''); setStatusFilter(''); }}
              className="btn-secondary w-full text-sm"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>
      )}

      {viewTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map(col => {
            const colIssues = filtered.filter(i => i.status === col.status);
            return (
              <div key={col.status} className={`rounded-xl border ${col.color} min-h-[300px]`}>
                <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${col.headerBg}`}>
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="text-sm font-bold">{colIssues.length}</span>
                </div>
                <div className="p-3 space-y-2">
                  {colIssues.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">No issues</div>
                  )}
                  {colIssues.map(issue => (
                    <KanbanCard
                      key={issue.id}
                      issue={issue}
                      onOpen={() => openDetail(issue)}
                      onAdvance={() => advanceStatus(issue)}
                      onResolve={() => openResolve(issue)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewTab === 'list' && (
        <>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Wrench className="w-6 h-6" />}
              title="No issues found"
              description={issues.length === 0 ? 'Report your first maintenance issue to get started.' : 'Try adjusting your filters.'}
              action={issues.length === 0 ? (
                <button onClick={openCreate} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Report Issue
                </button>
              ) : undefined}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Room</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Priority</th>
                    <th className="table-header">Assigned</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Est. Cost</th>
                    <th className="table-header">Reported</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(issue => {
                    const cat = getCategoryMeta(issue.category);
                    const Icon = cat.icon;
                    return (
                      <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell font-semibold text-gray-900">
                          {issue.room?.number || 'N/A'}
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${cat.color}`}>
                            <Icon className="w-3 h-3" />
                            {cat.label}
                          </span>
                        </td>
                        <td className="table-cell text-gray-600 max-w-[240px]">
                          <p className="truncate">{issue.description}</p>
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[issue.priority]?.badge || 'bg-gray-100 text-gray-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_STYLES[issue.priority]?.dot || 'bg-gray-400'}`} />
                            {getStatusLabel(issue.priority)}
                          </span>
                        </td>
                        <td className="table-cell text-gray-600 text-sm">
                          {issue.assigned_to || <span className="text-gray-400 italic">Unassigned</span>}
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${STATUS_STYLES[issue.status] || ''}`}>
                            {getStatusLabel(issue.status)}
                          </span>
                        </td>
                        <td className="table-cell text-gray-600 text-sm">
                          {issue.estimated_cost > 0 ? `${currentHotel.currency} ${issue.estimated_cost}` : '—'}
                        </td>
                        <td className="table-cell text-gray-500 text-sm">
                          {formatDate(issue.created_at)}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openDetail(issue)} className="btn-secondary text-xs">
                              View
                            </button>
                            {issue.status === 'reported' && (
                              <button onClick={() => advanceStatus(issue)} className="btn-secondary text-xs text-blue-600">
                                Start
                              </button>
                            )}
                            {issue.status === 'in_progress' && (
                              <button onClick={() => openResolve(issue)} className="btn-secondary text-xs text-emerald-600">
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Report Maintenance Issue" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Room</label>
              <select
                value={issueForm.room_id}
                onChange={e => setIssueForm(prev => ({ ...prev, room_id: e.target.value }))}
                className="input-field w-full"
                required
              >
                <option value="">Select room</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.number} — {r.room_type?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={issueForm.category}
                onChange={e => setIssueForm(prev => ({ ...prev, category: e.target.value as MaintenanceCategory }))}
                className="input-field w-full"
                required
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select
                value={issueForm.priority}
                onChange={e => setIssueForm(prev => ({ ...prev, priority: e.target.value as MaintenanceRequest['priority'] }))}
                className="input-field w-full"
                required
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{getStatusLabel(p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reported By</label>
              <input
                type="text"
                value={issueForm.reported_by}
                onChange={e => setIssueForm(prev => ({ ...prev, reported_by: e.target.value }))}
                className="input-field w-full"
                placeholder="Name or department"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={issueForm.description}
              onChange={e => setIssueForm(prev => ({ ...prev, description: e.target.value }))}
              className="input-field w-full"
              rows={3}
              placeholder="Describe the issue in detail..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign To</label>
              {staff.length > 0 ? (
                <select
                  value={issueForm.assigned_to}
                  onChange={e => setIssueForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => (
                    <option key={s.id} value={`${s.first_name} ${s.last_name}`}>
                      {s.first_name} {s.last_name} ({s.role})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={issueForm.assigned_to}
                  onChange={e => setIssueForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Staff or contractor"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor / Contractor</label>
              <input
                type="text"
                value={issueForm.vendor}
                onChange={e => setIssueForm(prev => ({ ...prev, vendor: e.target.value }))}
                className="input-field w-full"
                placeholder="Optional external vendor"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Cost ({currentHotel.currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={issueForm.estimated_cost}
                onChange={e => setIssueForm(prev => ({ ...prev, estimated_cost: e.target.value }))}
                className="input-field w-full"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule Repair</label>
              <input
                type="datetime-local"
                value={issueForm.scheduled_for}
                onChange={e => setIssueForm(prev => ({ ...prev, scheduled_for: e.target.value }))}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Reporting...' : 'Report Issue'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title="Issue Details" size="lg">
        {selectedIssue && <IssueDetail
          issue={selectedIssue}
          currency={currentHotel.currency}
          onAdvance={() => { advanceStatus(selectedIssue); setShowDetailModal(false); }}
          onResolve={() => { setShowDetailModal(false); openResolve(selectedIssue); }}
        />}
      </Modal>

      <Modal open={showResolveModal} onClose={() => setShowResolveModal(false)} title="Resolve Issue">
        <form onSubmit={handleResolve} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Resolution Notes</label>
            <textarea
              value={resolveForm.resolution_notes}
              onChange={e => setResolveForm(prev => ({ ...prev, resolution_notes: e.target.value }))}
              className="input-field w-full"
              rows={4}
              placeholder="Describe what was done to fix the issue..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Actual Cost ({currentHotel.currency})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={resolveForm.actual_cost}
              onChange={e => setResolveForm(prev => ({ ...prev, actual_cost: e.target.value }))}
              className="input-field w-full"
              placeholder="0.00"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowResolveModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={resolving} className="btn-primary">
              <CheckCircle className="w-4 h-4" />
              {resolving ? 'Resolving...' : 'Mark Resolved'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface KanbanCardProps {
  issue: MaintenanceRequest;
  onOpen: () => void;
  onAdvance: () => void;
  onResolve: () => void;
}

function KanbanCard({ issue, onOpen, onAdvance, onResolve }: KanbanCardProps) {
  const cat = getCategoryMeta(issue.category);
  const Icon = cat.icon;
  const prStyle = PRIORITY_STYLES[issue.priority] || PRIORITY_STYLES.medium;

  return (
    <div
      className={`bg-white rounded-lg border-l-4 border border-gray-100 ${prStyle.border} shadow-sm cursor-pointer hover:shadow-md transition-all group`}
      onClick={onOpen}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${cat.color}`}>
              <Icon className="w-3 h-3" />
              {cat.label}
            </span>
          </div>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${prStyle.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${prStyle.dot}`} />
            {getStatusLabel(issue.priority)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900">Room {issue.room?.number || 'N/A'}</span>
        </div>

        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{issue.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {issue.assigned_to ? (
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-3 h-3 text-gray-500" />
                </div>
                <span className="text-xs text-gray-500 truncate max-w-[80px]">{issue.assigned_to.split(' ')[0]}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">Unassigned</span>
            )}
          </div>
          {issue.scheduled_for && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {formatDate(issue.scheduled_for)}
            </div>
          )}
        </div>
      </div>

      {issue.status !== 'completed' && (
        <div
          className="border-t border-gray-100 grid divide-x divide-gray-100"
          style={{ gridTemplateColumns: issue.status === 'in_progress' ? '1fr' : '1fr 1fr' }}
          onClick={e => e.stopPropagation()}
        >
          {issue.status === 'reported' && (
            <button
              onClick={onAdvance}
              className="flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors rounded-bl-lg"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Start
            </button>
          )}
          <button
            onClick={onResolve}
            className="flex items-center justify-center gap-1 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors rounded-br-lg"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Resolve
          </button>
        </div>
      )}
    </div>
  );
}

interface IssueDetailProps {
  issue: MaintenanceRequest;
  currency: string;
  onAdvance: () => void;
  onResolve: () => void;
}

function IssueDetail({ issue, currency, onAdvance, onResolve }: IssueDetailProps) {
  const cat = getCategoryMeta(issue.category);
  const Icon = cat.icon;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-base font-bold text-gray-900">Room {issue.room?.number}</span>
            <span className="text-sm text-gray-500">— {issue.room?.room_type?.name}</span>
            <span className={`badge ${STATUS_STYLES[issue.status] || ''}`}>{getStatusLabel(issue.status)}</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[issue.priority]?.badge || 'bg-gray-100 text-gray-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_STYLES[issue.priority]?.dot || 'bg-gray-400'}`} />
            {getStatusLabel(issue.priority)} Priority
          </span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
        <p className="text-sm text-gray-900">{issue.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Reported By</p>
          <p className="text-gray-900">{issue.reported_by || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Assigned To</p>
          <p className="text-gray-900">{issue.assigned_to || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Vendor</p>
          <p className="text-gray-900">{issue.vendor || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Scheduled For</p>
          <p className="text-gray-900">{issue.scheduled_for ? formatDateTime(issue.scheduled_for) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Estimated Cost</p>
          <p className="text-gray-900">{issue.estimated_cost > 0 ? `${currency} ${issue.estimated_cost.toFixed(2)}` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Actual Cost</p>
          <p className="text-gray-900">{(issue.actual_cost || issue.cost) > 0 ? `${currency} ${(issue.actual_cost || issue.cost).toFixed(2)}` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Reported</p>
          <p className="text-gray-900">{formatDateTime(issue.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Resolved</p>
          <p className="text-gray-900">{issue.resolved_at ? formatDateTime(issue.resolved_at) : '—'}</p>
        </div>
      </div>

      {issue.resolution_notes && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide mb-1">Resolution Notes</p>
          <p className="text-sm text-emerald-900">{issue.resolution_notes}</p>
        </div>
      )}

      {issue.status !== 'completed' && (
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          {issue.status === 'reported' && (
            <button onClick={onAdvance} className="btn-secondary flex-1">
              <ArrowUpRight className="w-4 h-4" />
              Move to In Progress
            </button>
          )}
          {issue.status === 'in_progress' && (
            <button onClick={onResolve} className="btn-primary flex-1">
              <CheckCircle className="w-4 h-4" />
              Resolve Issue
            </button>
          )}
          {issue.status === 'reported' && (
            <button onClick={onResolve} className="btn-primary flex-1">
              <CheckCircle className="w-4 h-4" />
              Resolve Issue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
