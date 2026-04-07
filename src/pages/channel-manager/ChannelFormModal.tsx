import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import type { Channel } from './ChannelCard';

interface FormData {
  name: string;
  type: string;
  api_key: string;
  property_id: string;
  client_id: string;
  client_secret: string;
  commission_pct: string;
  sync_enabled: boolean;
}

interface Props {
  channel?: Channel | null;
  onClose: () => void;
  onSave: (data: Omit<FormData, 'commission_pct'> & { commission_pct: number }) => Promise<void>;
}

const TYPE_OPTIONS = [
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'airbnb',      label: 'Airbnb' },
  { value: 'expedia',     label: 'Expedia' },
  { value: 'direct',      label: 'Direct' },
  { value: 'other',       label: 'Other' },
];

export default function ChannelFormModal({ channel, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormData>({
    name: '',
    type: 'other',
    api_key: '',
    property_id: '',
    client_id: '',
    client_secret: '',
    commission_pct: '0',
    sync_enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (channel) {
      setForm({
        name: channel.name,
        type: channel.type || 'other',
        api_key: channel.api_key || '',
        property_id: channel.property_id || '',
        client_id: channel.client_id || '',
        client_secret: channel.client_secret || '',
        commission_pct: String(channel.commission_pct ?? 0),
        sync_enabled: channel.sync_enabled ?? true,
      });
    }
  }, [channel]);

  const handleTypeChange = (type: string) => {
    const nameMap: Record<string, string> = {
      booking_com: 'Booking.com',
      airbnb: 'Airbnb',
      expedia: 'Expedia',
      direct: 'Direct',
    };
    setForm(f => ({
      ...f,
      type,
      name: channel ? f.name : (nameMap[type] ?? f.name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        commission_pct: parseFloat(form.commission_pct) || 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {channel ? 'Edit Channel' : 'Add Channel'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Channel Type</label>
            <select
              value={form.type}
              onChange={e => handleTypeChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96] bg-white"
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g. Booking.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Property ID</label>
              <input
                type="text"
                value={form.property_id}
                onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                placeholder="123456"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Commission %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.commission_pct}
                onChange={e => setForm(f => ({ ...f, commission_pct: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
            <input
              type="text"
              value={form.api_key}
              onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
              placeholder="sk-..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96] font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Client ID</label>
              <input
                type="text"
                value={form.client_id}
                onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96] font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Client Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={form.client_secret}
                  onChange={e => setForm(f => ({ ...f, client_secret: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6b96] font-mono"
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
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.sync_enabled}
              onChange={e => setForm(f => ({ ...f, sync_enabled: e.target.checked }))}
              className="w-4 h-4 rounded text-[#1e3a5f] focus:ring-[#2d6b96]"
            />
            <span className="text-sm text-gray-700">Enable automatic sync</span>
          </label>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="px-5 py-2 bg-[#1e3a5f] hover:bg-[#172e4c] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : channel ? 'Save Changes' : 'Add Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}
