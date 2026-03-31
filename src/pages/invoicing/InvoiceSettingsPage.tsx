import { useState, useEffect } from 'react';
import { Save, Loader2, ChevronLeft, Building2, CreditCard, FileText, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { useTenantId } from '../../hooks/useTenantQuery';
import { Link } from 'react-router-dom';

interface SettingsForm {
  hotel_name: string;
  hotel_address: string;
  hotel_vat_number: string;
  hotel_registration_number: string;
  hotel_email: string;
  hotel_phone: string;
  hotel_website: string;
  invoice_prefix: string;
  invoice_counter: string;
  default_tax_rate: string;
  default_currency: string;
  payment_terms_days: string;
  footer_text: string;
  bank_name: string;
  bank_iban: string;
  bank_swift: string;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'BGN', 'AED', 'SGD', 'AUD'];

const DEFAULT_FORM: SettingsForm = {
  hotel_name: '', hotel_address: '', hotel_vat_number: '', hotel_registration_number: '',
  hotel_email: '', hotel_phone: '', hotel_website: '', invoice_prefix: 'INV',
  invoice_counter: '1', default_tax_rate: '20', default_currency: 'EUR',
  payment_terms_days: '14', footer_text: '', bank_name: '', bank_iban: '', bank_swift: '',
};

export default function InvoiceSettingsPage() {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentHotel) return;
    supabase.from('invoice_settings').select('*').eq('hotel_id', currentHotel.id).maybeSingle().then(({ data }) => {
      if (data) {
        setSettingsId(data.id);
        setForm({
          hotel_name: data.hotel_name ?? '',
          hotel_address: data.hotel_address ?? '',
          hotel_vat_number: data.hotel_vat_number ?? '',
          hotel_registration_number: data.hotel_registration_number ?? '',
          hotel_email: data.hotel_email ?? '',
          hotel_phone: data.hotel_phone ?? '',
          hotel_website: data.hotel_website ?? '',
          invoice_prefix: data.invoice_prefix ?? 'INV',
          invoice_counter: String(data.invoice_counter ?? 1),
          default_tax_rate: String(data.default_tax_rate ?? 20),
          default_currency: data.default_currency ?? 'EUR',
          payment_terms_days: String(data.payment_terms_days ?? 14),
          footer_text: data.footer_text ?? '',
          bank_name: data.bank_name ?? '',
          bank_iban: data.bank_iban ?? '',
          bank_swift: data.bank_swift ?? '',
        });
      } else if (currentHotel) {
        setForm(f => ({ ...f, hotel_name: currentHotel.name }));
      }
      setLoading(false);
    });
  }, [currentHotel]);

  const setF = (k: keyof SettingsForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!currentHotel) return;
    setSaving(true);
    const payload = {
      hotel_id: currentHotel.id,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      hotel_name: form.hotel_name,
      hotel_address: form.hotel_address,
      hotel_vat_number: form.hotel_vat_number,
      hotel_registration_number: form.hotel_registration_number,
      hotel_email: form.hotel_email,
      hotel_phone: form.hotel_phone,
      hotel_website: form.hotel_website,
      invoice_prefix: form.invoice_prefix,
      invoice_counter: Number(form.invoice_counter),
      default_tax_rate: Number(form.default_tax_rate),
      default_currency: form.default_currency,
      payment_terms_days: Number(form.payment_terms_days),
      footer_text: form.footer_text,
      bank_name: form.bank_name,
      bank_iban: form.bank_iban,
      bank_swift: form.bank_swift,
      updated_at: new Date().toISOString(),
    };
    if (settingsId) {
      await supabase.from('invoice_settings').update(payload).eq('id', settingsId);
    } else {
      const { data } = await supabase.from('invoice_settings').insert(payload).select('id').single();
      if (data) setSettingsId(data.id);
    }
    setSaving(false);
    toast('success', 'Invoice settings saved');
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/invoicing" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-blue-600" />
            Invoice Settings
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure your billing profile, bank details, and invoice defaults</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Hotel / Business Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hotel / Business Name</label>
            <input value={form.hotel_name} onChange={e => setF('hotel_name', e.target.value)} className="input-field" placeholder="Grand Hotel Lisboa" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={form.hotel_email} onChange={e => setF('hotel_email', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input value={form.hotel_phone} onChange={e => setF('hotel_phone', e.target.value)} className="input-field" placeholder="+351 213 456 789" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
            <input value={form.hotel_website} onChange={e => setF('hotel_website', e.target.value)} className="input-field" placeholder="www.grandhotellisboa.com" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input value={form.hotel_address} onChange={e => setF('hotel_address', e.target.value)} className="input-field" placeholder="Rua da Prata 12, 1100-415 Lisboa, Portugal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">VAT Number</label>
            <input value={form.hotel_vat_number} onChange={e => setF('hotel_vat_number', e.target.value)} className="input-field" placeholder="PT123456789" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration Number</label>
            <input value={form.hotel_registration_number} onChange={e => setF('hotel_registration_number', e.target.value)} className="input-field" placeholder="RC/2020/12345" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Invoice Defaults</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Prefix</label>
            <input value={form.invoice_prefix} onChange={e => setF('invoice_prefix', e.target.value)} className="input-field font-mono" placeholder="INV" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Next Number</label>
            <input type="number" min={1} value={form.invoice_counter} onChange={e => setF('invoice_counter', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Currency</label>
            <select value={form.default_currency} onChange={e => setF('default_currency', e.target.value)} className="input-field">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Tax Rate %</label>
            <input type="number" min={0} max={100} step={0.1} value={form.default_tax_rate} onChange={e => setF('default_tax_rate', e.target.value)} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Terms (days)</label>
            <input type="number" min={0} value={form.payment_terms_days} onChange={e => setF('payment_terms_days', e.target.value)} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Footer Text</label>
          <textarea
            value={form.footer_text}
            onChange={e => setF('footer_text', e.target.value)}
            className="input-field resize-none"
            rows={3}
            placeholder="Thank you for your business. Please include the invoice number as the payment reference."
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Bank Details</h3>
        </div>
        <p className="text-sm text-gray-500 -mt-2">These details appear in the payment information section of every invoice.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name</label>
            <input value={form.bank_name} onChange={e => setF('bank_name', e.target.value)} className="input-field" placeholder="Banco Comercial Português" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">SWIFT / BIC</label>
            <input value={form.bank_swift} onChange={e => setF('bank_swift', e.target.value)} className="input-field font-mono" placeholder="BCOMPTPL" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">IBAN</label>
            <input value={form.bank_iban} onChange={e => setF('bank_iban', e.target.value)} className="input-field font-mono" placeholder="PT50 0033 0000 4523 4567 3054 1" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
        <Link to="/invoicing" className="btn-secondary">Cancel</Link>
      </div>
    </div>
  );
}
