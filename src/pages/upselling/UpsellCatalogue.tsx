import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, ImageOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import UpsellItemModal from './UpsellItemModal';
import { CATEGORY_LABELS, CATEGORY_COLORS, PRICE_TYPE_LABELS, type UpsellItem } from './types';

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&w=800';

export default function UpsellCatalogue() {
  const { currentHotel } = useHotel();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<UpsellItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UpsellItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpsellItem | null>(null);

  const load = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    const { data } = await supabase
      .from('upsell_items')
      .select('*')
      .eq('hotel_id', currentHotel.id)
      .order('sort_order')
      .order('created_at');
    setItems((data ?? []) as UpsellItem[]);
    setLoading(false);
  }, [currentHotel]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('upsell_items').delete().eq('id', deleteTarget.id);
    if (error) { toast('error', error.message); return; }
    toast('success', 'Item deleted');
    setDeleteTarget(null);
    load();
  };

  const toggleActive = async (item: UpsellItem) => {
    await supabase.from('upsell_items').update({ active: !item.active }).eq('id', item.id);
    load();
  };

  const moveItem = async (item: UpsellItem, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const swapItem = items[swapIdx];
    await Promise.all([
      supabase.from('upsell_items').update({ sort_order: swapItem.sort_order }).eq('id', item.id),
      supabase.from('upsell_items').update({ sort_order: item.sort_order }).eq('id', swapItem.id),
    ]);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="md" /></div>;

  const activeCount = items.filter(i => i.active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{items.length} {t.upselling.items} · {activeCount} {t.upselling.active}</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          {t.upselling.addItem}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-sm font-medium text-gray-700 mb-1">{t.upselling.noUpsellItemsYet}</p>
          <p className="text-sm text-gray-400 mb-4">{t.upselling.addItemsDesc}</p>
          <button onClick={() => setAddOpen(true)} className="btn-primary text-sm flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" /> {t.upselling.addYourFirstItem}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item, idx) => (
            <div key={item.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md ${!item.active ? 'opacity-60' : ''}`}>
              <div className="relative h-36 bg-gray-100 overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageOff className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                    {CATEGORY_LABELS[item.category]}
                  </span>
                </div>
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  <button onClick={() => moveItem(item, 'up')} disabled={idx === 0} className="p-1 bg-white/90 rounded-md shadow-sm hover:bg-white disabled:opacity-30 transition-colors">
                    <ChevronUp className="w-3 h-3 text-gray-600" />
                  </button>
                  <button onClick={() => moveItem(item, 'down')} disabled={idx === items.length - 1} className="p-1 bg-white/90 rounded-md shadow-sm hover:bg-white disabled:opacity-30 transition-colors">
                    <ChevronDown className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(item.price)}</span>
                  <span className="text-xs text-gray-400">{PRICE_TYPE_LABELS[item.price_type]}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditTarget(item)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleActive(item)}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                    title={item.active ? 'Deactivate' : 'Activate'}
                  >
                    {item.active
                      ? <><ToggleRight className="w-5 h-5 text-emerald-500" /><span className="text-emerald-600">{t.upselling.active}</span></>
                      : <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-400">{t.upselling.inactive}</span></>
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <UpsellItemModal
        open={addOpen}
        item={null}
        nextSortOrder={items.length + 1}
        onClose={() => setAddOpen(false)}
        onSaved={load}
      />
      <UpsellItemModal
        open={!!editTarget}
        item={editTarget}
        nextSortOrder={items.length + 1}
        onClose={() => setEditTarget(null)}
        onSaved={load}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={t.upselling.deleteUpsellItem}
        message={t.upselling.deleteItemDesc.replace('{name}', deleteTarget?.name || '')}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
