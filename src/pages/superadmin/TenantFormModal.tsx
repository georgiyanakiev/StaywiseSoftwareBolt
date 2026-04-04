import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabaseAdmin, supabase } from '../../lib/supabase';
import type { Tenant, TenantFormData } from './types';

interface TenantFormModalProps {
  mode: 'add' | 'edit';
  tenant?: Tenant;
  onClose: () => void;
  onSave: (data: TenantFormData) => Promise<void>;
}

const DEFAULT_FORM: TenantFormData = {
  name: '',
  subdomain: '',
  owner_email: '',
  plan: 'starter',
  primary_color: '#2563eb',
  secondary_color: '#1e40af',
  logo_url: '',
  active: true,
};

type SubdomainStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function TenantFormModal({ mode, tenant, onClose, onSave }: TenantFormModalProps) {
  const [form, setForm] = useState<TenantFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subdomainStatus, setSubdomainStatus] = useState<SubdomainStatus>('idle');
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const db = supabaseAdmin ?? supabase;

  useEffect(() => {
    if (mode === 'edit' && tenant) {
      setForm({
        name: tenant.name,
        subdomain: tenant.subdomain,
        owner_email: tenant.owner_email ?? '',
        plan: tenant.plan,
        primary_color: tenant.primary_color,
        secondary_color: tenant.secondary_color,
        logo_url: tenant.logo_url ?? '',
        active: tenant.active,
      });
    }
  }, [mode, tenant]);

  const set = (key: keyof TenantFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubdomainChange = (raw: string) => {
    const val = raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
    set('subdomain', val);
    setSubdomainStatus('idle');

    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!val || val.length < 2) return;

    if (val.length > 1 && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(val)) {
      setSubdomainStatus('invalid');
      return;
    }

    setSubdomainStatus('checking');
    checkTimer.current = setTimeout(async () => {
      const { data, error } = await db.rpc('check_subdomain_available', { p_subdomain: val });
      if (error) {
        const { data: fallback } = await db
          .from('tenants')
          .select('id')
          .eq('subdomain', val)
          .maybeSingle();
        setSubdomainStatus(fallback ? 'taken' : 'available');
      } else {
        setSubdomainStatus(data === true ? 'available' : 'taken');
      }
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subdomain.trim()) {
      setError('Name and subdomain are required.');
      return;
    }
    if (mode === 'add' && subdomainStatus === 'taken') {
      setError('That subdomain is already in use.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save tenant.';
      if (msg.includes('tenants_subdomain_key') || msg.includes('subdomain')) {
        setError('That subdomain is already taken. Please choose a different one.');
        setSubdomainStatus('taken');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const subdomainHint = () => {
    if (mode === 'edit') return null;
    switch (subdomainStatus) {
      case 'checking':
        return (
          <span className="flex items-center gap-1 text-gray-400 text-xs mt-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
          </span>
        );
      case 'available':
        return (
          <span className="flex items-center gap-1 text-green-600 text-xs mt-1">
            <CheckCircle className="w-3 h-3" /> Available
          </span>
        );
      case 'taken':
        return (
          <span className="flex items-center gap-1 text-red-500 text-xs mt-1">
            <AlertCircle className="w-3 h-3" /> Already taken
          </span>
        );
      case 'invalid':
        return (
          <span className="flex items-center gap-1 text-amber-600 text-xs mt-1">
            <AlertCircle className="w-3 h-3" /> Use lowercase letters, numbers, and hyphens only
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'add' ? 'Add New Hotel' : `Edit — ${tenant?.name}`}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Grand Metropolitan Hotel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain *</label>
              <input
                type="text"
                value={form.subdomain}
                onChange={e => handleSubdomainChange(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                  subdomainStatus === 'taken' || subdomainStatus === 'invalid'
                    ? 'border-red-300 focus:ring-red-400'
                    : subdomainStatus === 'available'
                    ? 'border-green-300 focus:ring-green-400'
                    : 'border-gray-200 focus:ring-blue-500'
                }`}
                placeholder="grand-metro"
                disabled={mode === 'edit'}
              />
              {subdomainHint()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={e => set('plan', e.target.value as TenantFormData['plan'])}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
              <input
                type="email"
                value={form.owner_email}
                onChange={e => set('owner_email', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="owner@hotel.com"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input
                type="url"
                value={form.logo_url}
                onChange={e => set('logo_url', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                  className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={e => set('secondary_color', e.target.value)}
                  className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.secondary_color}
                  onChange={e => set('secondary_color', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {mode === 'edit' && (
              <div className="col-span-2 flex items-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => set('active', !form.active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700">Account Active</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (mode === 'add' && (subdomainStatus === 'taken' || subdomainStatus === 'checking' || subdomainStatus === 'invalid'))}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : mode === 'add' ? 'Create Hotel' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
