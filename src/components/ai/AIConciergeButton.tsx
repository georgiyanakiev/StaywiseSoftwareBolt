import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import AIConciergePanel from './AIConciergePanel';

export default function AIConciergeButton() {
  const { session } = useActiveHotel();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!session || !mounted) return null;

  const brandColor = session.primaryColor || '#2563eb';

  return createPortal(
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center group"
          style={{
            zIndex: 10001,
            background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
            boxShadow: `0 4px 24px ${brandColor}44, 0 2px 8px rgba(0,0,0,0.12)`,
          }}
          title="AI Concierge"
          aria-label="Open AI Concierge"
        >
          <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white"
            style={{ animation: 'aiFabPulse 2s ease-in-out infinite' }}
          />
        </button>
      )}
      <AIConciergePanel open={open} onClose={() => setOpen(false)} />
      <style>{`
        @keyframes aiFabPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </>,
    document.body,
  );
}
