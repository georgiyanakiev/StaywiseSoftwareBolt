import { useState, useEffect } from 'react';
import { Save, Plus } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useHotel } from '../../contexts/HotelContext';
import { useTenantId } from '../../hooks/useTenantQuery';
import { supabase } from '../../lib/supabase';
import {
  CATEGORY_LABELS, PRICE_TYPE_LABELS,
  type UpsellItem, type UpsellCategory, type PriceType,
} from './types';

interface Props {
  open: boolean;
  item: UpsellItem | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

const PLACEHOLDER_IMAGE = 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&w=800';

const empty = {
  name: '',
  description: '',
  category: 'other' as UpsellCategory,
  price: '',
  price_type: 'per_stay' as PriceType,
  max_quantity: '1',
  available_from_days_before: '30',
  available_until_hours_before: '2',
  image_url: '',
  sort_order: '0',
  active: true,
};

export default function UpsellItemModal({ open, item, nextSortOrder, onClose, onSaved }: Props) {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        description: item.description,
        category: item.category,
        price: String(item.price),
        price_type: item.price_type,
        max_quantity: String(item.max_quantity),
        available_from_days_before: String(item.available_from_days_before),
        available_until_hours_before: String(item.available_until_hours_before),
        image_url: item.image_url,
        sort_order: String(item.sort_order),
        active: item.active,
      });
    } else {
      setForm({ ...empty, sort_order: String(nextSortOrder) });
    }
  }, [item, nextSortOrder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        hotel_id: currentHotel.id,
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        price: parseFloat(form.price) || 0,
        price_type: form.price_type,
        max_quantity: parseInt(form.max_quantity) || 1,
        available_from_days_before: parseInt(form.available_from_days_before) || 30,
        available_until_hours_before: parseInt(form.available_until_hours_before) || 2,
        image_url: form.image_url.trim(),
        sort_order: parseInt(form.sort_order) || 0,
        active: form.active,
      };
      if (tenantId) payload.tenant_id = tenantId;

      if (item) {
        const { error } = await supabase.from('upsell_items').update(payload).eq('id', item.id);
        if (error) throw new Error(error.message);
        toast('success', 'Item updated');
      } else {
        const { error } = await supabase.from('upsell_items').insert(payload);
        if (error) throw new Error(error.message);
        toast('success', 'Upsell item created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const f = (field: keyof typeof form, val: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: val }));

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit Upsell Item' : 'Add Upsell Item'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input className="input-field" value={form.name} onChange={e => f('name', e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field min-h-[72px] resize-none" value={form.description} onChange={e => f('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="input-field" value={form.category} onChange={e => f('category', e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
            <select className="input-field" value={form.price_type} onChange={e => f('price_type', e.target.value)}>
              {Object.entries(PRICE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.price} onChange={e => f('price', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Quantity</label>
            <input type="number" min="1" className="input-field" value={form.max_quantity} onChange={e => f('max_quantity', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Available from (days before arrival)</label>
            <input type="number" min="0" className="input-field" value={form.available_from_days_before} onChange={e => f('available_from_days_before', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Available until (hours before check-in)</label>
            <input type="number" min="0" className="input-field" value={form.available_until_hours_before} onChange={e => f('available_until_hours_before', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
          <input type="url" className="input-field" value={form.image_url} onChange={e => f('image_url', e.target.value)} placeholder={PLACEHOLDER_IMAGE} />
          {form.image_url && (
            <img src={form.image_url} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <input type="number" className="input-field" value={form.sort_order} onChange={e => f('sort_order', e.target.value)} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm text-gray-700">Active (visible to guests)</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            {item ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
