import { useState } from 'react';
import { ShoppingBag, ClipboardList } from 'lucide-react';
import UpsellCatalogue from './UpsellCatalogue';
import UpsellOrders from './UpsellOrders';

type Tab = 'catalogue' | 'orders';

export default function UpsellPage() {
  const [tab, setTab] = useState<Tab>('catalogue');

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'catalogue', label: 'Upsell Catalogue', icon: ShoppingBag },
    { key: 'orders', label: 'Orders & Revenue', icon: ClipboardList },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Upselling Engine</h1>
        <p className="text-sm text-gray-500 mt-0.5">Offer add-ons and upgrades to guests at booking and check-in</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-500 text-[#1e3a5f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="animate-fade-in">
        {tab === 'catalogue' && <UpsellCatalogue />}
        {tab === 'orders' && <UpsellOrders />}
      </div>
    </div>
  );
}
