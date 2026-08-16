import { useState, useEffect } from 'react';
import {
  Search, Plus, CheckCircle, Circle, ExternalLink, Globe,
  Settings, X, Zap, Users, Code2, Wrench, FileText, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { storeChannelSecret } from '../../lib/channelSecrets';
import type { Channel } from './ChannelCard';
import { getChannelIcon } from '../../utils/channelCatalog';

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
  connection_type: string;
  features: string[];
  connect_note: string | null;
}

const CATEGORY_META: Record<string, { label: string; pill: string }> = {
  ota:             { label: 'OTA',             pill: 'bg-blue-50 text-blue-700 border-blue-100' },
  vacation_rental: { label: 'Vacation Rental', pill: 'bg-rose-50 text-rose-700 border-rose-100' },
  metasearch:      { label: 'Metasearch',      pill: 'bg-amber-50 text-amber-700 border-amber-100' },
  channel_manager: { label: 'Channel Manager', pill: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  gds:             { label: 'GDS',             pill: 'bg-sky-50 text-sky-700 border-sky-100' },
  direct:          { label: 'Direct',          pill: 'bg-green-50 text-green-700 border-green-100' },
  corporate:       { label: 'Corporate',       pill: 'bg-orange-50 text-orange-700 border-orange-100' },
};

const CONNECTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  direct_api:      { label: 'Direct API',      icon: Zap,      color: 'bg-blue-50 text-blue-700 border-blue-100' },
  oauth:           { label: 'OAuth 2.0',        icon: Code2,    color: 'bg-sky-50 text-sky-700 border-sky-100' },
  xml_api:         { label: 'XML / SOAP API',   icon: Code2,    color: 'bg-gray-100 text-gray-600 border-gray-200' },
  channel_manager: { label: 'Via Channel Mgr',  icon: Users,    color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  manual:          { label: 'Manual',           icon: FileText, color: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const REGION_META: Record<string, string> = {
  global: 'Global',
  europe: 'Europe',
  asia:   'Asia',
  us:     'US',
  latam:  'LatAm',
};

const CATEGORY_FILTERS = [
  { value: 'all',             label: 'All' },
  { value: 'ota',             label: 'OTAs' },
  { value: 'vacation_rental', label: 'Vacation Rentals' },
  { value: 'metasearch',      label: 'Metasearch' },
  { value: 'channel_manager', label: 'Channel Managers' },
  { value: 'gds',             label: 'GDS' },
  { value: 'direct',          label: 'Direct' },
  { value: 'corporate',       label: 'Corporate' },
];

const REGION_FILTERS = [
  { value: 'all',    label: 'All' },
  { value: 'global', label: 'Global' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia',   label: 'Asia' },
  { value: 'us',     label: 'US' },
  { value: 'latam',  label: 'LatAm' },
];

const FEATURED_SLUGS = ['booking_com', 'expedia', 'airbnb'];

interface Props {
  hotelChannels: Channel[];
  hotelId: string;
  tenantId: string | null;
  onChannelAdded: () => void;
  onConfigure: (channelId: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ChannelCatalog({
  hotelChannels, hotelId, tenantId, onChannelAdded, onConfigure, showToast,
}: Props) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [adding, setAdding] = useState<string | null>(null);
  const [locallyAdded, setLocallyAdded] = useState<Map<string, string>>(new Map());
  const [pendingItem, setPendingItem] = useState<CatalogItem | null>(null);

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

  const hotelChannelsByType = new Map(hotelChannels.map(c => [c.type, c]));

  const getHotelChannel = (item: CatalogItem): Channel | undefined =>
    hotelChannelsByType.get(item.slug) ?? hotelChannelsByType.get(item.type);

  const getAddedChannelId = (item: CatalogItem): string | undefined =>
    getHotelChannel(item)?.id ?? locallyAdded.get(item.slug);

  const filtered = catalog.filter(item => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchRegion = regionFilter === 'all' ||
      (item.regions ?? []).includes(regionFilter);
    return matchSearch && matchCat && matchRegion;
  });

  const featuredItems  = filtered.filter(i => FEATURED_SLUGS.includes(i.slug));
  const remainingItems = filtered.filter(i => !FEATURED_SLUGS.includes(i.slug));
  const showFeatured   = !search && categoryFilter === 'all' && regionFilter === 'all';

  const handleAdd = (item: CatalogItem) => {
    setPendingItem(item);
  };

  const handleConfirmAdd = async (credentials: { property_id: string; api_key: string; client_id: string; client_secret: string }) => {
    if (!pendingItem) return;
    const item = pendingItem;
    setAdding(item.slug);
    try {
      const insertPayload: Record<string, unknown> = {
        hotel_id: hotelId,
        name: item.name,
        type: item.slug,
        status: 'disconnected',
        commission_pct: item.commission_typical ?? 0,
        sync_enabled: true,
        property_id: credentials.property_id || null,
        client_id: credentials.client_id || null,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      };

      if (credentials.api_key) {
        insertPayload.api_key = credentials.api_key;
      }

      const { data, error } = await supabase.from('channels')
        .insert(insertPayload)
        .select('id')
        .single();

      if (!error && data?.id && credentials.client_secret) {
        const vaultId = await storeChannelSecret({
          vaultId: null,
          name: `channel_client_secret_${data.id}_${hotelId}`,
          value: credentials.client_secret,
          hotelId,
        });
        if (vaultId) {
          await supabase.from('channels')
            .update({ client_secret_vault_id: vaultId })
            .eq('id', data.id);
        }
      }

      if (error) throw error;

      if (data?.id) {
        setLocallyAdded(prev => new Map([...prev, [item.slug, data.id]]));
      }
      setPendingItem(null);
      onChannelAdded();
      showToast(`${item.name} added. You can configure credentials any time in My Channels.`, 'success');
    } catch {
      showToast('Failed to add channel', 'error');
    } finally {
      setAdding(null);
    }
  };

  const handleConfigure = (item: CatalogItem) => {
    const id = getAddedChannelId(item);
    if (id) onConfigure(id);
  };

  const hasActiveFilters = search || categoryFilter !== 'all' || regionFilter !== 'all';
  const clearFilters = () => { setSearch(''); setCategoryFilter('all'); setRegionFilter('all'); };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96] bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Type</span>
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setCategoryFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                categoryFilter === f.value
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Region</span>
          {REGION_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setRegionFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                regionFilter === f.value
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{filtered.length}</span>
          {' '}channel{filtered.length !== 1 ? 's' : ''} available
        </p>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <Globe className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No channels match your filters</p>
          <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 hover:underline">
            Clear all filters
          </button>
        </div>
      )}

      {/* Featured row — Booking.com, Expedia, Airbnb */}
      {showFeatured && featuredItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">Most Popular</h3>
            <span className="text-xs text-gray-400">Direct API integrations</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {featuredItems.map(item => (
              <ChannelCard
                key={item.id}
                item={item}
                hotelChannel={getHotelChannel(item)}
                addedId={getAddedChannelId(item)}
                isAdding={adding === item.slug}
                featured
                onAdd={handleAdd}
                onConfigure={handleConfigure}
              />
            ))}
          </div>
        </div>
      )}

      {/* All channels grid */}
      {(showFeatured ? remainingItems : filtered).length > 0 && (
        <div className="space-y-3">
          {showFeatured && <h3 className="text-sm font-semibold text-gray-700">All Channels</h3>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(showFeatured ? remainingItems : filtered).map(item => (
              <ChannelCard
                key={item.id}
                item={item}
                hotelChannel={getHotelChannel(item)}
                addedId={getAddedChannelId(item)}
                isAdding={adding === item.slug}
                featured={false}
                onAdd={handleAdd}
                onConfigure={handleConfigure}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Channel modal */}
      {pendingItem && (
        <AddChannelModal
          item={pendingItem}
          adding={adding === pendingItem.slug}
          onClose={() => setPendingItem(null)}
          onConfirm={handleConfirmAdd}
        />
      )}
    </div>
  );
}

function ChannelCard({
  item,
  hotelChannel,
  addedId,
  isAdding,
  featured,
  onAdd,
  onConfigure,
}: {
  item: CatalogItem;
  hotelChannel: Channel | undefined;
  addedId: string | undefined;
  isAdding: boolean;
  featured: boolean;
  onAdd: (item: CatalogItem) => void;
  onConfigure: (item: CatalogItem) => void;
}) {
  const isAdded     = !!addedId;
  const isConnected = hotelChannel?.status === 'connected';
  const catMeta     = CATEGORY_META[item.category];
  const connMeta    = CONNECTION_META[item.connection_type] ?? CONNECTION_META.direct_api;
  const ConnIcon    = connMeta.icon;
  const fallback    = getChannelIcon(item.slug ?? item.type);
  const logoColor   = item.logo_color ?? fallback.color;
  const logoLetter  = item.logo_letter ?? fallback.letter;

  return (
    <div
      className={`group relative bg-white rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg ${
        isAdded ? 'border-emerald-200' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <div
        className="h-1.5 w-full flex-shrink-0"
        style={{ backgroundColor: isAdded ? '#10b981' : logoColor }}
      />

      <div className={`p-5 flex flex-col gap-3 flex-1 ${featured ? 'p-5' : ''}`}>
        {/* Logo + name */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm"
              style={{ backgroundColor: logoColor }}
            >
              {logoLetter}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-[14px] leading-tight">{item.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{catMeta?.label ?? item.category}</p>
            </div>
          </div>
          {item.website_url && (
            <a
              href={item.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
              title={`Visit ${item.name}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Connection type + commission */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${connMeta.color}`}>
            <ConnIcon className="w-2.5 h-2.5" />
            {connMeta.label}
          </span>
          {item.commission_typical != null && item.commission_typical > 0 && (
            <span className="text-[11px] text-gray-400">{item.commission_typical}% commission</span>
          )}
          {item.commission_typical === 0 && (
            <span className="text-[11px] text-emerald-600 font-medium">No commission</span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Features list (featured cards show all, others show 3) */}
        {(item.features ?? []).length > 0 && (
          <ul className="space-y-0.5">
            {(featured ? item.features : item.features.slice(0, 3)).map((f, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: logoColor }} />
                {f}
              </li>
            ))}
          </ul>
        )}

        {/* Region tags */}
        {(item.regions ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(item.regions ?? []).map(r => (
              <span
                key={r}
                className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-gray-500 uppercase tracking-wide"
              >
                <Globe className="w-2.5 h-2.5" />
                {REGION_META[r] ?? r}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-1 space-y-2">
          {isAdded ? (
            <div className="flex gap-2">
              <div
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {isConnected ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5" />
                )}
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <button
                onClick={() => onConfigure(item)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                title="Configure credentials"
              >
                <Settings className="w-3.5 h-3.5" />
                Configure
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAdd(item)}
              disabled={isAdding}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: logoColor }}
            >
              {isAdding ? (
                <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {isAdding ? 'Adding...' : 'Add Channel'}
            </button>
          )}

          {/* Connect note */}
          {!isAdded && item.connect_note && (
            <p className="text-[10px] text-gray-400 leading-snug flex items-start gap-1">
              <Wrench className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
              {item.connect_note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddChannelModal({
  item,
  adding,
  onClose,
  onConfirm,
}: {
  item: CatalogItem;
  adding: boolean;
  onClose: () => void;
  onConfirm: (credentials: { property_id: string; api_key: string; client_id: string; client_secret: string }) => void;
}) {
  const [propertyId, setPropertyId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const fallback = getChannelIcon(item.slug ?? item.type);
  const logoColor = item.logo_color ?? fallback.color;
  const logoLetter = item.logo_letter ?? fallback.letter;
  const catMeta = CATEGORY_META[item.category];
  const connMeta = CONNECTION_META[item.connection_type] ?? CONNECTION_META.direct_api;
  const ConnIcon = connMeta.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ property_id: propertyId, api_key: apiKey, client_id: clientId, client_secret: clientSecret });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        {/* Colour bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: logoColor }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: logoColor }}
            >
              {logoLetter}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Add {item.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${connMeta.color}`}>
                  <ConnIcon className="w-2.5 h-2.5" />
                  {connMeta.label}
                </span>
                {catMeta && (
                  <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catMeta.pill}`}>
                    {catMeta.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {item.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Property ID</label>
              <input
                type="text"
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                placeholder="e.g. 12345678"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Your API key"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Client Secret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 flex items-start gap-1.5">
            <Wrench className="w-3 h-3 flex-shrink-0 mt-0.5" />
            Credentials are optional — you can add or update them later in My Channels.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-60 hover:opacity-90"
              style={{ backgroundColor: logoColor }}
            >
              {adding ? (
                <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {adding ? 'Adding...' : 'Add Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
