import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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

interface FieldErrors {
  name?: string;
  subdomain?: string;
  owner_email?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function validate(form: TenantFormData, mode: 'add' | 'edit', subdomainStatus: SubdomainStatus): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Hotel name is required.';
  } else if (form.name.trim().length < 2) {
    errors.name = 'Hotel name must be at least 2 characters.';
  } else if (form.name.trim().length > 100) {
    errors.name = 'Hotel name must be 100 characters or fewer.';
  }

  if (mode === 'add') {
    if (!form.subdomain.trim()) {
      errors.subdomain = 'Subdomain is required.';
    } else if (subdomainStatus === 'taken') {
      errors.subdomain = 'This subdomain is already taken.';
    } else if (subdomainStatus === 'invalid') {
      errors.subdomain = 'Use lowercase letters, numbers, and hyphens only (must start and end with a letter or number).';
    } else if (subdomainStatus === 'idle' || subdomainStatus === 'checking') {
      errors.subdomain = 'Please wait for the availability check to complete.';
    }
  }

  if (form.owner_email.trim() && !EMAIL_RE.test(form.owner_email.trim())) {
    errors.owner_email = 'Please enter a valid email address.';
  }

  if (form.logo_url.trim()) {
    try {
      new URL(form.logo_url.trim());
    } catch {
      errors.logo_url = 'Please enter a valid URL (e.g. https://example.com/logo.png).';
    }
  }

  if (!HEX_RE.test(form.primary_color)) {
    errors.primary_color = 'Must be a valid hex colour (e.g. #2563eb).';
  }

  if (!HEX_RE.test(form.secondary_color)) {
    errors.secondary_color = 'Must be a valid hex colour (e.g. #1e40af).';
  }

  return errors;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span className="flex items-center gap-1 text-red-500 text-xs mt-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </span>
  );
}

export default function TenantFormModal({ mode, tenant, onClose, onSave }: TenantFormModalProps) {
  const [form, setForm] = useState<TenantFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [subdomainStatus, setSubdomainStatus] = useState<SubdomainStatus>('idle');
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const db = supabase;

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

  const touch = (field: string) => setTouched(prev => new Set(prev).add(field));

  const set = (key: keyof TenantFormData, value: string | boolean) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (touched.has(key as string)) {
        setFieldErrors(validate(next, mode, subdomainStatus));
      }
      return next;
    });
  };

  const handleSubdomainChange = (raw: string) => {
    const val = raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setForm(prev => ({ ...prev, subdomain: val }));
    setSubdomainStatus('idle');
    touch('subdomain');

    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!val || val.length < 2) {
      setFieldErrors(prev => ({ ...prev, subdomain: val ? 'Subdomain must be at least 2 characters.' : 'Subdomain is required.' }));
      return;
    }

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(val)) {
      setSubdomainStatus('invalid');
      setFieldErrors(prev => ({ ...prev, subdomain: 'Use lowercase letters, numbers, and hyphens only (must start and end with a letter or number).' }));
      return;
    }

    setSubdomainStatus('checking');
    setFieldErrors(prev => ({ ...prev, subdomain: undefined }));

    checkTimer.current = setTimeout(async () => {
      const { data, error } = await db.rpc('check_subdomain_available', { p_subdomain: val });
      if (error) {
        const { data: fallback } = await db
          .from('tenants')
          .select('id')
          .eq('subdomain', val)
          .maybeSingle();
        const status = fallback ? 'taken' : 'available';
        setSubdomainStatus(status);
        if (status === 'taken') {
          setFieldErrors(prev => ({ ...prev, subdomain: 'This subdomain is already taken.' }));
        }
      } else {
        const status = data === true ? 'available' : 'taken';
        setSubdomainStatus(status);
        if (status === 'taken') {
          setFieldErrors(prev => ({ ...prev, subdomain: 'This subdomain is already taken.' }));
        }
      }
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(new Set(['name', 'subdomain', 'owner_email', 'logo_url', 'primary_color', 'secondary_color']));
    const errors = validate(form, mode, subdomainStatus);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save hotel.';
      if (msg.includes('tenants_subdomain_key') || msg.includes('subdomain')) {
        setFieldErrors(prev => ({ ...prev, subdomain: 'This subdomain is already taken.' }));
        setSubdomainStatus('taken');
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const subdomainHint = () => {
    if (mode === 'edit') return null;
    if (fieldErrors.subdomain) return null;
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
      default:
        return null;
    }
  };

  const inputClass = (field: keyof FieldErrors) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
      touched.has(field) && fieldErrors[field]
        ? 'border-red-300 focus:ring-red-400'
        : 'border-gray-200 focus:ring-[#2d6b96]'
    }`;

  const isSubmitDisabled =
    saving ||
    (mode === 'add' && (subdomainStatus === 'taken' || subdomainStatus === 'checking' || subdomainStatus === 'invalid'));

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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4" noValidate>
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hotel Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                onBlur={() => { touch('name'); setFieldErrors(validate(form, mode, subdomainStatus)); }}
                className={inputClass('name')}
                placeholder="Grand Metropolitan Hotel"
                maxLength={100}
              />
              <FieldError msg={touched.has('name') ? fieldErrors.name : undefined} />
              <span className="text-xs text-gray-400 mt-0.5 block">{form.name.length}/100 characters</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain {mode === 'add' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={form.subdomain}
                onChange={e => handleSubdomainChange(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                  subdomainStatus === 'taken' || subdomainStatus === 'invalid' || (touched.has('subdomain') && fieldErrors.subdomain)
                    ? 'border-red-300 focus:ring-red-400'
                    : subdomainStatus === 'available'
                    ? 'border-green-300 focus:ring-green-400'
                    : 'border-gray-200 focus:ring-[#2d6b96]'
                }`}
                placeholder="grand-metro"
                disabled={mode === 'edit'}
              />
              {subdomainHint()}
              <FieldError msg={touched.has('subdomain') ? fieldErrors.subdomain : undefined} />
              {mode === 'add' && !fieldErrors.subdomain && subdomainStatus === 'idle' && form.subdomain.length > 0 && (
                <span className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                  <Info className="w-3 h-3" /> Type at least 2 characters to check availability
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={e => set('plan', e.target.value as TenantFormData['plan'])}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96]"
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
                onBlur={() => { touch('owner_email'); setFieldErrors(validate(form, mode, subdomainStatus)); }}
                className={inputClass('owner_email')}
                placeholder="owner@hotel.com"
              />
              <FieldError msg={touched.has('owner_email') ? fieldErrors.owner_email : undefined} />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input
                type="text"
                value={form.logo_url}
                onChange={e => set('logo_url', e.target.value)}
                onBlur={() => { touch('logo_url'); setFieldErrors(validate(form, mode, subdomainStatus)); }}
                className={inputClass('logo_url')}
                placeholder="https://example.com/logo.png"
              />
              <FieldError msg={touched.has('logo_url') ? fieldErrors.logo_url : undefined} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={HEX_RE.test(form.primary_color) ? form.primary_color : '#2563eb'}
                  onChange={e => set('primary_color', e.target.value)}
                  className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5 flex-shrink-0"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                  onBlur={() => { touch('primary_color'); setFieldErrors(validate(form, mode, subdomainStatus)); }}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 transition-colors ${
                    touched.has('primary_color') && fieldErrors.primary_color
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-gray-200 focus:ring-[#2d6b96]'
                  }`}
                />
              </div>
              <FieldError msg={touched.has('primary_color') ? fieldErrors.primary_color : undefined} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={HEX_RE.test(form.secondary_color) ? form.secondary_color : '#1e40af'}
                  onChange={e => set('secondary_color', e.target.value)}
                  className="w-10 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5 flex-shrink-0"
                />
                <input
                  type="text"
                  value={form.secondary_color}
                  onChange={e => set('secondary_color', e.target.value)}
                  onBlur={() => { touch('secondary_color'); setFieldErrors(validate(form, mode, subdomainStatus)); }}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 transition-colors ${
                    touched.has('secondary_color') && fieldErrors.secondary_color
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-gray-200 focus:ring-[#2d6b96]'
                  }`}
                />
              </div>
              <FieldError msg={touched.has('secondary_color') ? fieldErrors.secondary_color : undefined} />
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
              disabled={isSubmitDisabled}
              className="px-5 py-2 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#172e4c] rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : mode === 'add' ? 'Create Hotel' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
