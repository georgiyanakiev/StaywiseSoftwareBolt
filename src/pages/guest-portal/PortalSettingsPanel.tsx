import { useState } from 'react';
import { Save, Loader2, Info } from 'lucide-react';

interface Props {
  hotelId: string;
}

const DEFAULT_TERMS = `Welcome to our hotel. By completing this digital check-in, you agree to the following:

1. Check-in time is 15:00. Early check-in is subject to availability.
2. Check-out time is 11:00. Late check-out may incur additional charges.
3. Guests are responsible for any damage caused during their stay.
4. Smoking is strictly prohibited in all rooms and indoor areas.
5. Pets are not permitted on the property unless pre-arranged.
6. The hotel accepts no liability for valuables left unattended in rooms.
7. Payment is required at check-in unless a valid credit card guarantee is on file.`;

export default function PortalSettingsPanel({ hotelId }: Props) {
  const [form, setForm] = useState({
    terms: DEFAULT_TERMS,
    collectId: true,
    collectPreferences: true,
    collectSignature: true,
    autoSendDays: '3',
    upsellLateCheckout: true,
    upsellBreakfast: true,
    upsellParking: true,
    lateCheckoutPrice: '25',
    breakfastPrice: '15',
    parkingPrice: '10',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
        <h3 className="font-semibold text-gray-900">Fields to Collect</h3>
        <div className="space-y-3">
          {[
            { key: 'collectId', label: 'ID Document details (document type, number, nationality, dates)' },
            { key: 'collectPreferences', label: 'Preferences & special requests (arrival time, room preferences, dietary)' },
            { key: 'collectSignature', label: 'Digital signature and terms agreement' },
          ].map(f => (
            <label key={f.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form[f.key as keyof typeof form] as boolean}
                onChange={e => set(f.key, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">{f.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Upsell Options (shown on confirmation page)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'upsellLateCheckout', priceKey: 'lateCheckoutPrice', label: 'Late Check-out', desc: 'Check-out until 14:00' },
            { key: 'upsellBreakfast',    priceKey: 'breakfastPrice',    label: 'Breakfast',      desc: 'Continental breakfast' },
            { key: 'upsellParking',      priceKey: 'parkingPrice',      label: 'Parking',        desc: 'Secure car park' },
          ].map(u => (
            <div key={u.key} className={`rounded-xl border-2 p-3 transition-colors ${form[u.key as keyof typeof form] ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-gray-50'}`}>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={form[u.key as keyof typeof form] as boolean}
                  onChange={e => set(u.key, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">{u.label}</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">{u.desc}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">€</span>
                <input
                  type="number"
                  min={0}
                  value={form[u.priceKey as keyof typeof form] as string}
                  onChange={e => set(u.priceKey, e.target.value)}
                  className="input-field py-1 text-xs w-20"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Automated Send</h3>
          <div className="group relative">
            <Info className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Send check-in link</span>
          <input
            type="number"
            min={1}
            max={14}
            value={form.autoSendDays}
            onChange={e => set('autoSendDays', e.target.value)}
            className="input-field py-1.5 text-sm w-16"
          />
          <span className="text-sm text-gray-600">days before arrival</span>
        </div>
        <p className="text-xs text-gray-400">Automated sending requires email integration to be configured in Settings.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Terms & Conditions</h3>
        <textarea
          value={form.terms}
          onChange={e => set('terms', e.target.value)}
          className="input-field resize-none text-sm font-mono"
          rows={10}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary flex items-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
