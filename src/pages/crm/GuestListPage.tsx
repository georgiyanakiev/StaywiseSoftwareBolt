import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Download, Filter, Tag, AlertTriangle, ChevronLeft, ChevronRight, X, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { useHotel } from '../../contexts/HotelContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useGuestProfiles, applyAutoTags, DEFAULT_FILTERS } from './useGuestProfiles';
import GuestFormModal from './GuestFormModal';
import { LOYALTY_COLORS, LOYALTY_LABELS } from './types';
import type { GuestProfile, LoyaltyTier } from './types';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

const TIER_OPTIONS: LoyaltyTier[] = ['standard', 'silver', 'gold', 'platinum'];
const ALL_AUTO_TAGS = ['Loyal', 'High Value', 'Lapsed', 'New'];

export default function GuestListPage() {
  const { currentHotel } = useHotel();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editGuest, setEditGuest] = useState<GuestProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [applyingAutoTags, setApplyingAutoTags] = useState(false);

  const { guests, total, loading, page, setPage, filters, setFilters, fetchGuests, PAGE_SIZE } = useGuestProfiles(currentHotel?.id);

  const currency = currentHotel?.currency || 'USD';
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const activeFilterCount = [
    filters.loyaltyTier, filters.nationality, filters.lastStayFrom, filters.lastStayTo,
    filters.minStays, filters.maxStays, filters.tag,
  ].filter(Boolean).length + (filters.blacklisted !== null ? 1 : 0);

  const handleAutoTag = async () => {
    if (!currentHotel) return;
    setApplyingAutoTags(true);
    const { data: allGuests } = await supabase.from('guest_profiles').select('*').eq('hotel_id', currentHotel.id);
    if (!allGuests) { setApplyingAutoTags(false); return; }
    const tagged = applyAutoTags(allGuests as GuestProfile[]);
    let updated = 0;
    for (const g of tagged) {
      const original = allGuests.find(og => og.id === g.id);
      if (JSON.stringify(original?.tags) !== JSON.stringify(g.tags)) {
        await supabase.from('guest_profiles').update({ tags: g.tags }).eq('id', g.id);
        updated++;
      }
    }
    toast('success', `Auto-tagged ${updated} guest${updated !== 1 ? 's' : ''}`);
    fetchGuests();
    setApplyingAutoTags(false);
  };

  const exportCSV = async () => {
    if (!currentHotel) return;
    const { data } = await supabase.from('guest_profiles').select('*').eq('hotel_id', currentHotel.id);
    if (!data) return;
    const rows = data as GuestProfile[];
    const headers = ['Name', 'Email', 'Phone', 'Country', 'Loyalty Tier', 'Total Stays', 'Total Spent', 'Last Stay', 'Tags', 'Marketing Opt-in', 'Blacklisted'];
    const csv = [headers.join(','), ...rows.map(g => [
      `"${g.full_name}"`, `"${g.email || ''}"`, `"${g.phone || ''}"`, `"${g.country || ''}"`,
      LOYALTY_LABELS[g.loyalty_tier], g.total_stays, g.total_spent,
      g.last_stay_at || '', `"${(g.tags || []).join('; ')}"`, g.marketing_opt_in ? 'Yes' : 'No', g.blacklisted ? 'Yes' : 'No',
    ].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `guest-profiles-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast('success', 'Exported guest profiles');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Profiles</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} guests in CRM</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleAutoTag} disabled={applyingAutoTags} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50">
            <Zap className="w-4 h-4" />{applyingAutoTags ? 'Tagging...' : 'Auto-tag'}
          </button>
          <button onClick={exportCSV} className="btn-secondary">
            <Download className="w-4 h-4" />Export CSV
          </button>
          <button onClick={() => { setEditGuest(null); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />Add Guest
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by name, email, phone..." value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} className="input-field pl-9 w-full" />
            </div>
            <button onClick={() => setShowFilters(p => !p)} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />Clear all
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Loyalty Tier</label>
                <select value={filters.loyaltyTier} onChange={e => setFilters(p => ({ ...p, loyaltyTier: e.target.value }))} className="input-field w-full text-sm">
                  <option value="">All Tiers</option>
                  {TIER_OPTIONS.map(t => <option key={t} value={t}>{LOYALTY_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nationality</label>
                <input type="text" placeholder="e.g. British" value={filters.nationality} onChange={e => setFilters(p => ({ ...p, nationality: e.target.value }))} className="input-field w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Last Stay From</label>
                <input type="date" value={filters.lastStayFrom} onChange={e => setFilters(p => ({ ...p, lastStayFrom: e.target.value }))} className="input-field w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Last Stay To</label>
                <input type="date" value={filters.lastStayTo} onChange={e => setFilters(p => ({ ...p, lastStayTo: e.target.value }))} className="input-field w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min Stays</label>
                <input type="number" min="0" placeholder="0" value={filters.minStays} onChange={e => setFilters(p => ({ ...p, minStays: e.target.value }))} className="input-field w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Stays</label>
                <input type="number" min="0" placeholder="100" value={filters.maxStays} onChange={e => setFilters(p => ({ ...p, maxStays: e.target.value }))} className="input-field w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tag</label>
                <select value={filters.tag} onChange={e => setFilters(p => ({ ...p, tag: e.target.value }))} className="input-field w-full text-sm">
                  <option value="">All Tags</option>
                  {ALL_AUTO_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select value={filters.blacklisted === null ? '' : filters.blacklisted ? 'true' : 'false'} onChange={e => setFilters(p => ({ ...p, blacklisted: e.target.value === '' ? null : e.target.value === 'true' }))} className="input-field w-full text-sm">
                  <option value="">All Guests</option>
                  <option value="false">Active</option>
                  <option value="true">Blacklisted</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : guests.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No guests found"
            description={activeFilterCount > 0 ? 'Try adjusting your filters' : 'Add your first guest to the CRM'}
            action={!activeFilterCount ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" />Add Guest</button> : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Guest</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Contact</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Country</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Loyalty</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Stays</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Total Spent</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Last Stay</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {guests.map(g => (
                    <tr
                      key={g.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/guests/${g.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${g.blacklisted ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            {g.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-gray-900">{g.full_name}</span>
                              {g.blacklisted && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                            </div>
                            {g.company && <span className="text-xs text-gray-400">{g.company}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600">{g.email || '-'}</div>
                        <div className="text-xs text-gray-400">{g.phone || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{g.country || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LOYALTY_COLORS[g.loyalty_tier]}`}>
                          {LOYALTY_LABELS[g.loyalty_tier]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right font-medium">{g.total_stays}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(g.total_spent, currency)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{g.last_stay_at ? formatDate(g.last_stay_at) : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(g.tags || []).slice(0, 3).map(tag => (
                            <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                              <Tag className="w-2.5 h-2.5" />{tag}
                            </span>
                          ))}
                          {(g.tags || []).length > 3 && <span className="text-xs text-gray-400">+{(g.tags || []).length - 3}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary p-1.5 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary p-1.5 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <GuestFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={fetchGuests} guest={editGuest} hotelId={currentHotel?.id} />
    </div>
  );
}
