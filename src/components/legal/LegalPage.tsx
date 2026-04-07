import { useState, useEffect, useRef, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Printer, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import LegalFooter from './LegalFooter';
import { COMPANY } from '../../config/company';

export type LegalLang = 'en' | 'bg';

interface TocSection {
  id: string;
  title: string;
}

interface LegalPageProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  version?: string;
  sections: TocSection[];
  children: ReactNode;
  lang: LegalLang;
  onLangChange: (lang: LegalLang) => void;
  breadcrumb?: string;
}

export function useLegalLang(): [LegalLang, (l: LegalLang) => void] {
  const [lang, setLangState] = useState<LegalLang>(() => {
    try {
      const stored = localStorage.getItem('legal_lang');
      if (stored === 'bg' || stored === 'en') return stored;
    } catch {}
    return 'en';
  });

  const setLang = (l: LegalLang) => {
    setLangState(l);
    try { localStorage.setItem('legal_lang', l); } catch {}
  };

  return [lang, setLang];
}

export default function LegalPage({
  title,
  subtitle,
  lastUpdated,
  version,
  sections,
  children,
  lang,
  onLangChange,
  breadcrumb,
}: LegalPageProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id ?? '');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    );
    const els = document.querySelectorAll('section[id]');
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [children]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/lobby" className="flex items-center gap-2.5 text-gray-900 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-[#1e3a5f] rounded-md flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">StayWise</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
            <Link to="/lobby" className="hover:text-gray-700 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 font-medium">{breadcrumb ?? title}</span>
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => onLangChange('en')}
                className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === 'en' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                EN
              </button>
              <button
                onClick={() => onLangChange('bg')}
                className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === 'bg' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                BG
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              title="Print / Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 lg:py-14">
        <div className="flex gap-10 lg:gap-14">
          <aside className="hidden lg:block w-56 flex-shrink-0 print:hidden">
            <div className="sticky top-24">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Contents</p>
              <nav className="space-y-0.5">
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors leading-snug ${
                      activeSection === s.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>

              <div className="mt-6 p-3 rounded-xl border border-gray-200 bg-white space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Legal Docs</p>
                <Link to="/terms" className="block text-xs text-blue-600 hover:underline py-0.5">Terms of Service</Link>
                <Link to="/privacy" className="block text-xs text-blue-600 hover:underline py-0.5">Privacy Policy</Link>
                <Link to="/dpa" className="block text-xs text-blue-600 hover:underline py-0.5">Data Processing Agreement</Link>
              </div>

              <Link
                to="/lobby"
                className="mt-4 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to StayWise
              </Link>
            </div>
          </aside>

          <main className="flex-1 min-w-0" ref={contentRef} style={{ maxWidth: '800px' }}>
            <div className="mb-10 pb-8 border-b border-gray-200">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-lg text-gray-500 mb-4">{subtitle}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span><strong className="text-gray-700">Last updated:</strong> {lastUpdated}</span>
                {version && <span><strong className="text-gray-700">Version:</strong> {version}</span>}
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  <strong className="text-gray-700">Jurisdiction:</strong> Republic of Bulgaria
                </span>
              </div>
            </div>

            <div className="prose prose-gray prose-base max-w-none">
              {children}
            </div>

            <div className="mt-14 pt-8 border-t border-gray-200 text-sm text-gray-500 space-y-2 print:hidden">
              <p>© {new Date().getFullYear()} {COMPANY.name_en}. All rights reserved.</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                <Link to="/dpa" className="text-blue-600 hover:underline">Data Processing Agreement</Link>
              </div>
            </div>
          </main>
        </div>
      </div>

      <LegalFooter />

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .prose h2 { page-break-before: auto; }
          section { page-break-inside: avoid; }
          @page { margin: 2cm; }
        }
        @media print {
          body::before {
            content: "${COMPANY.name_en}";
            display: block;
            font-size: 11px;
            color: #94a3b8;
            margin-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
          }
        }
      `}</style>
    </div>
  );
}
