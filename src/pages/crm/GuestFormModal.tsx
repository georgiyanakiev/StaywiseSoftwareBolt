import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import type { GuestProfile, LoyaltyTier } from './types';

const TIER_OPTIONS: LoyaltyTier[] = ['standard', 'silver', 'gold', 'platinum'];
const TIER_LABELS = { standard: 'Standard', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  guest?: GuestProfile | null;
  hotelId?: string;
}

const EMPTY: Partial<GuestProfile> = {
  full_name: '', email: '', phone: '', nationality: '', country: '', city: '', address: '',
  company: '', vat_number: '', loyalty_tier: 'standard', loyalty_points: 0,
  marketing_opt_in: false, tags: [], notes: '', blacklisted: false,
  dietary_requirements: '', room_preferences: '', language_preference: 'en',
  special_occasions: '',
};

export default function GuestFormModal({ open, onClose, onSaved, guest, hotelId }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<GuestProfile>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (guest) setForm({ ...guest });
    else setForm({ ...EMPTY });
  }, [guest, open]);

  const f = (key: keyof GuestProfile, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !(form.tags || []).includes(t)) {
      f('tags', [...(form.tags || []), t]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => f('tags', (form.tags || []).filter(t => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name?.trim()) { toast('error', 'Full name is required'); return; }
    setSaving(true);

    const { id: _id, created_at: _ca, updated_at: _ua, total_stays: _ts, total_spent: _sp, last_stay_at: _ls, guest_id: _gi, ...rest } = form as Record<string, unknown>;
    const payload: Record<string, unknown> = { ...rest, hotel_id: hotelId };

    if (!payload.date_of_birth) payload.date_of_birth = null;
    if (!payload.anniversary_date) payload.anniversary_date = null;
    if (!payload.birthday_month) payload.birthday_month = null;
    if (!payload.birthday_day) payload.birthday_day = null;

    const { error } = guest
      ? await supabase.from('guest_profiles').update(payload).eq('id', guest.id)
      : await supabase.from('guest_profiles').insert(payload);
    if (error) { console.error('guest save error:', error); toast('error', 'Failed to save guest'); }
    else { toast('success', guest ? 'Guest updated' : 'Guest added'); onSaved(); onClose(); }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={guest ? 'Edit Guest Profile' : 'Add Guest Profile'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" value={form.full_name || ''} onChange={e => f('full_name', e.target.value)} className="input-field w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" value={form.date_of_birth || ''} onChange={e => f('date_of_birth', e.target.value || undefined)} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
              <input type="text" value={form.nationality || ''} onChange={e => f('nationality', e.target.value)} className="input-field w-full" placeholder="e.g. British" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select value={form.language_preference || 'en'} onChange={e => f('language_preference', e.target.value)} className="input-field w-full">
                <option value="en">English</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="it">Italian</option>
                <option value="ar">Arabic</option>
                <option value="zh">Chinese</option>
                <option value="bg">Bulgarian</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Contact & Address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email || ''} onChange={e => f('email', e.target.value)} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone || ''} onChange={e => f('phone', e.target.value)} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={form.city || ''} onChange={e => f('city', e.target.value)} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" value={form.country || ''} onChange={e => f('country', e.target.value)} className="input-field w-full" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={form.address || ''} onChange={e => f('address', e.target.value)} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input type="text" value={form.company || ''} onChange={e => f('company', e.target.value)} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
              <input type="text" value={form.vat_number || ''} onChange={e => f('vat_number', e.target.value)} className="input-field w-full" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Loyalty & Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loyalty Tier</label>
              <select value={form.loyalty_tier || 'standard'} onChange={e => f('loyalty_tier', e.target.value as LoyaltyTier)} className="input-field w-full">
                {TIER_OPTIONS.map(t => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loyalty Points</label>
              <input type="number" min={0} value={form.loyalty_points || 0} onChange={e => f('loyalty_points', parseInt(e.target.value) || 0)} className="input-field w-full" />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.marketing_opt_in || false} onChange={e => f('marketing_opt_in', e.target.checked)} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Marketing opt-in</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.blacklisted || false} onChange={e => f('blacklisted', e.target.checked)} className="rounded border-gray-300 accent-red-500" />
                <span className="text-sm text-red-600">Blacklisted</span>
              </label>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Tags</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {(form.tags || []).map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900 ml-0.5">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); }}} placeholder="Add tag and press Enter" className="input-field flex-1 text-sm" />
            <button type="button" onClick={addTag} className="btn-secondary text-sm">Add</button>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Preferences</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Requirements</label>
              <input type="text" value={form.dietary_requirements || ''} onChange={e => f('dietary_requirements', e.target.value)} className="input-field w-full" placeholder="e.g. Vegetarian, Gluten-free" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Preferences</label>
              <input type="text" value={form.room_preferences || ''} onChange={e => f('room_preferences', e.target.value)} className="input-field w-full" placeholder="e.g. High floor, sea view" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birthday (Month/Day)</label>
              <div className="flex gap-2">
                <select value={form.birthday_month || ''} onChange={e => f('birthday_month', e.target.value ? parseInt(e.target.value) : undefined)} className="input-field flex-1">
                  <option value="">Month</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={form.birthday_day || ''} onChange={e => f('birthday_day', e.target.value ? parseInt(e.target.value) : undefined)} className="input-field flex-1">
                  <option value="">Day</option>
                  {Array.from({length:31},(_,i)=> <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anniversary Date</label>
              <input type="date" value={form.anniversary_date || ''} onChange={e => f('anniversary_date', e.target.value || undefined)} className="input-field w-full" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes || ''} onChange={e => f('notes', e.target.value)} rows={3} className="input-field w-full" placeholder="Internal notes about this guest" />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : guest ? 'Save Changes' : 'Add Guest'}</button>
        </div>
      </form>
    </Modal>
  );
}
