import { Link } from 'react-router-dom';
import { COMPANY } from '../../config/company';

interface LegalFooterProps {
  onCookiePreferences?: () => void;
}

export default function LegalFooter({ onCookiePreferences }: LegalFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        padding: '20px 24px',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
          <p>
            © 2024–{year} {COMPANY.name_en} | EIK: {COMPANY.uic}
          </p>
          <p>{COMPANY.address_en}</p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {[
            { label: 'Terms of Service', to: '/terms' },
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'DPA', to: '/dpa' },
          ].map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{ fontSize: '12px', color: '#64748b' }}
              className="hover:text-gray-700 transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
          {onCookiePreferences && (
            <button
              onClick={onCookiePreferences}
              style={{ fontSize: '12px', color: '#64748b' }}
              className="hover:text-gray-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Cookie Preferences
            </button>
          )}
        </nav>
      </div>
    </footer>
  );
}

export function InternalLegalFooter() {
  return (
    <footer className="mt-auto pt-8 pb-4 text-center">
      <div
        className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
        style={{ fontSize: '11px', color: '#cbd5e1' }}
      >
        <span>
          {COMPANY.name_en} | EIK: {COMPANY.uic}
        </span>
        <span className="hidden sm:inline">·</span>
        <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
        <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
        <Link to="/dpa" className="hover:text-gray-400 transition-colors">DPA</Link>
      </div>
    </footer>
  );
}
