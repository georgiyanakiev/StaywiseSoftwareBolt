import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import TopBar from './TopBar';
import { InternalLegalFooter } from '../legal/LegalFooter';
import AIConciergePanel from '../ai/AIConciergePanel';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';

export default function AppLayout() {
  const [aiOpen, setAiOpen] = useState(false);
  const { session } = useActiveHotel();
  const brandColor = session?.primaryColor ?? '#2563eb';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar variant="hotel" />
      <main className="flex-1 px-4 py-4 lg:px-6 lg:py-6">
        <Outlet />
      </main>
      <InternalLegalFooter />

      {/* AI Concierge FAB */}
      <button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center group"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
        }}
        title="AI Concierge"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
      </button>

      <AIConciergePanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
