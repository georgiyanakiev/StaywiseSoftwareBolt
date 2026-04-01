import { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle, ExternalLink, Globe, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Channel } from './ChannelCard';

export interface CatalogItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  category: string;
  description: string | null;
  website_url: string | null;
  logo_color: string | null;
  logo_letter: string | null;
  commission_typical: number | null;
  regions: string[] | null;
  popularity_rank: number;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  ota:             { label: 'OTA',             color: 'bg-blue-50 text-blue-700 border-blue-100' },
  vacation_rental: { label: 'Vacation Rental', color: 'bg-rose-50 text-rose-700 border-rose-100' },
  metasearch:      { label: 'Metasearch',      color: 'bg-amber-50 text-amber-700 border-amber-100' },
  channel_manager: { label: 'Channel Manager', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  gds:             { label: 'GDS',             color: 'bg-sky-50 text-sky-700 border-sky-100' },
  direct:          { label: 'Direct',          color: 'bg-green-50 text-green-700 border-green-100' },
  corporate:       { label: 'Corporate',       color: 'bg-orange-50 text-orange-700 border-orange-100' },
};

const CATEGORY_FILTERS = [
  { value: 'all',             label: 'All' },
  { value: 'ota',             label: 'OTA' },
  { value: 'vacation_rental', label: 'Vacation Rental' },
  { value: 'metasearch',      label: 'Metasearch' },
  { value: 'channel_manager', label: 'Channel Manager' },
  { value: 'gds',             label: 'GDS' },
  { value: 'direct',          label: 'Direct' },
  { value: 'corporate',       label: 'Corporate' },
];

interface Props {
  hotelChannels: Channel[];
  hotelId: string;
  tenantId: string | null;
  onChannelAdded: () => void;
}

export default function ChannelMarketplace({ hotelChannels, hotelId, tenantId, onChannelAdded }: Props) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchCatalog() {
      const { data } = await supabase
        .from('channel_catalog')
        .select('*')
        .eq('active', true)
        .order('popularity_rank', { ascending: true });
      setCatalog((data ?? []) as CatalogItem[]);
      setLoading(false);
    }
    fetchCatalog();
  }, []);

  const connectedSlugs = new Set(hotelChannels.map(c => c.type));

  const filtered = catalog.filter(item => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const isAdded = (item: CatalogItem) =>
    connectedSlugs.has(item.slug) || connectedSlugs.has(item.type) || added.has(item.slug);

  const handleAdd = async (item: CatalogItem) => {
    setAdding(item.slug);
    try {
      await supabase.from('channels').insert({
        hotel_id: hotelId,
        name: item.name,
        type: item.slug,
        status: 'disconnected',
        commission_pct: item.commission_typical ?? 0,
        sync_enabled: true,
        api_key: '',
        property_id: '',
        client_id: '',
        client_secret: '',
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      setAdded(prev => new Set([...prev, item.slug]));
      onChannelAdded();
    } finally {
      setAdding(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setCategoryFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${
                categoryFilter === f.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500">
        {filtered.length} channel{filtered.length !== 1 ? 's' : ''} available
        {categoryFilter !== 'all' && ` in ${CATEGORY_META[categoryFilter]?.label ?? categoryFilter}`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Globe className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No channels match your search</p>
          <button onClick={() => { setSearch(''); setCategoryFilter('all'); }} className="mt-2 text-sm text-blue-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => {
            const alreadyAdded = isAdded(item);
            const isAdding = adding === item.slug;
            const catMeta = CATEGORY_META[item.category];

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-5 flex flex-col gap-3 transition-all hover:shadow-md ${
                  alreadyAdded ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: item.logo_color ?? '#6b7280' }}
                    >
                      {item.logo_letter ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</p>
                      {item.commission_typical != null && item.commission_typical > 0 ? (
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.commission_typical}% commission</p>
                      ) : (
                        <p className="text-[11px] text-gray-400 mt-0.5">No commission</p>
                      )}
                    </div>
                  </div>
                  {alreadyAdded && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>

                {/* Category badge */}
                {catMeta && (
                  <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catMeta.color}`}>
                    {catMeta.label}
                  </span>
                )}

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">{item.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                  {alreadyAdded ? (
                    <span className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Added
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAdd(item)}
                      disabled={isAdding}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {isAdding ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      {isAdding ? 'Adding...' : 'Add'}
                    </button>
                  )}
                  {item.website_url && (
                    <a
                      href={item.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                      title={`Visit ${item.name}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
