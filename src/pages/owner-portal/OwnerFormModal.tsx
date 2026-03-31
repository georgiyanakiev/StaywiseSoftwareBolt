import { useState, useEffect } from 'react';
import { Save, UserPlus } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useHotel } from '../../contexts/HotelContext';
import { useTenantId } from '../../hooks/useTenantQuery';
import { supabase } from '../../lib/supabase';
import type { PropertyOwner } from './types';

interface Props {
  open: boolean;
  owner: PropertyOwner | null;
  onClose: () => void;
  onSaved: () => void;
}

const empty = {
  full_name: '',
  email: '',
  phone: '',
  company_name: '',
  bank_iban: '',
  commission_rate: 20,
  notes: '',
};

export default function OwnerFormModal({ open, owner, onClose, onSaved }: Props) {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (owner) {
      setForm({
        full_name: owner.full_name,
        email: owner.email,
        phone: owner.phone ?? '',
        company_name: owner.company_name ?? '',
        bank_iban: owner.bank_iban ?? '',
        commission_rate: owner.commission_rate,
        notes: owner.notes ?? '',
      });
    } else {
      setForm(empty);
    }
  }, [owner, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        hotel_id: currentHotel.id,
      };
      if (tenantId) payload.tenant_id = tenantId;

      if (owner) {
        const { error } = await supabase.from('property_owners').update(form).eq('id', owner.id);
        if (error) throw new Error(error.message);
        toast('success', 'Owner updated');
      } else {
        const { error } = await supabase.from('property_owners').insert(payload);
        if (error) throw new Error(error.message);
        toast('success', `${form.full_name} added as property owner`);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save owner');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, opts?: { type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={opts?.type ?? 'text'}
        placeholder={opts?.placeholder}
        className="input-field"
        value={String(form[key])}
        onChange={e => setForm(f => ({ ...f, [key]: opts?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
        required={key === 'full_name' || key === 'email'}
      />
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={owner ? 'Edit Owner' : 'Add Property Owner'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {field('full_name', 'Full Name')}
          {field('email', 'Email', { type: 'email' })}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field('company_name', 'Company Name', { placeholder: 'Optional' })}
          {field('phone', 'Phone', { type: 'tel' })}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field('bank_iban', 'Bank IBAN', { placeholder: 'e.g. GB29 NWBK…' })}
          {field('commission_rate', 'Commission Rate (%)', { type: 'number', placeholder: '20' })}
        </div>
        {field('notes', 'Notes (optional)')}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            {owner ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {saving ? 'Saving...' : owner ? 'Save Changes' : 'Add Owner'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
