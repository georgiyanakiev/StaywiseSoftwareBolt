import { useState, useEffect } from 'react';
import { X, Cookie, ToggleLeft, ToggleRight, ShieldCheck } from 'lucide-react';
import { COMPANY } from '../../config/company';

const STORAGE_KEY = 'sw_cookie_consent';

type ConsentValue = 'all' | 'necessary' | 'declined' | null;

interface Preferences {
  necessary: true;
  analytics: boolean;
}

function loadConsent(): ConsentValue {
  try {
    return localStorage.getItem(STORAGE_KEY) as ConsentValue;
  } catch {
    return null;
  }
}

function saveConsent(value: ConsentValue) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

interface ToggleRowProps {
  label: string;
  description: string;
  enabled: boolean;
  locked?: boolean;
  onToggle?: () => void;
}

function ToggleRow({ label, description, enabled, locked, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          {locked && (
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              Always on
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={locked ? undefined : onToggle}
        disabled={locked}
        className={`flex-shrink-0 mt-0.5 transition-opacity ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
        aria-label={enabled ? `Disable ${label}` : `Enable ${label}`}
      >
        {enabled ? (
          <ToggleRight className="w-7 h-7 text-blue-600" />
        ) : (
          <ToggleLeft className="w-7 h-7 text-gray-400" />
        )}
      </button>
    </div>
  );
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event('sw:cookie:open-preferences'));
}

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentValue>(() => loadConsent());
  const [showModal, setShowModal] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>({ necessary: true, analytics: false });

  useEffect(() => {
    setConsent(loadConsent());
  }, []);

  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener('sw:cookie:open-preferences', handler);
    return () => window.removeEventListener('sw:cookie:open-preferences', handler);
  }, []);

  const visible = consent === null;

  if (!visible && !showModal) return null;

  const handleAcceptAll = () => {
    saveConsent('all');
    setConsent('all');
    setShowModal(false);
  };

  const handleNecessaryOnly = () => {
    saveConsent('necessary');
    setConsent('necessary');
    setShowModal(false);
  };

  const handleSavePreferences = () => {
    const value: ConsentValue = prefs.analytics ? 'all' : 'necessary';
    saveConsent(value);
    setConsent(value);
    setShowModal(false);
  };

  return (
    <>
      {/* ── Banner ─────────────────────────────────────────────── */}
      {visible && !showModal && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center p-0"
          role="banner"
          aria-label="Cookie consent"
        >
          <div
            className="w-full"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            <div className="max-w-6xl mx-auto px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Cookie className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#94a3b8' }} />
                  <p style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.6 }}>
                    We use cookies to improve your experience. StayWise uses necessary cookies for the
                    app to function, and optional analytics cookies to understand usage.{' '}
                    <a
                      href={`https://${COMPANY.website}/privacy`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#93c5fd', textDecoration: 'underline' }}
                    >
                      Privacy Policy
                    </a>
                    .
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="order-3 sm:order-1 text-xs px-3 py-2 rounded-md transition-colors"
                    style={{ color: '#94a3b8' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    Manage preferences
                  </button>
                  <button
                    type="button"
                    onClick={handleNecessaryOnly}
                    className="order-2 text-xs px-4 py-2 rounded-md border transition-colors font-medium"
                    style={{
                      color: '#e2e8f0',
                      borderColor: 'rgba(255,255,255,0.3)',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}
                  >
                    Accept necessary only
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="order-1 sm:order-3 text-xs px-4 py-2 rounded-md font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#3b82f6' }}
                  >
                    Accept all
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preferences Modal ──────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Cookie preferences</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-2">
              <p className="text-xs text-gray-500 py-3 leading-relaxed">
                Choose which cookies you allow. Necessary cookies cannot be disabled as they are
                required for the application to function.
              </p>

              <ToggleRow
                label="Necessary cookies"
                description="Required for the application to function correctly. Includes authentication, security, and user preference storage."
                enabled={true}
                locked={true}
              />
              <ToggleRow
                label="Analytics cookies"
                description="Help us understand how the app is used so we can improve it. No personal data is shared with third parties."
                enabled={prefs.analytics}
                onToggle={() => setPrefs(p => ({ ...p, analytics: !p.analytics }))}
              />
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSavePreferences}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Save preferences
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#3b82f6' }}
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
