import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Printer, ChevronRight, ExternalLink, Shield,
  CheckCircle, Lock, FileText, Clock, AlertTriangle, Check,
} from 'lucide-react';
import { COMPANY } from '../../config/company';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useDpaAcceptance } from './useDpaAcceptance';

interface Section {
  id: string;
  title: string;
}

const SECTIONS: Section[] = [
  { id: 'parties', title: '1. Parties' },
  { id: 'subject-matter', title: '2. Subject Matter & Purpose' },
  { id: 'data-subjects', title: '3. Categories of Data Subjects' },
  { id: 'personal-data', title: '4. Categories of Personal Data' },
  { id: 'processor-obligations', title: '5. Processor Obligations (Art. 28)' },
  { id: 'security-measures', title: '6. Security Measures (Art. 32)' },
  { id: 'sub-processors', title: '7. Sub-Processors (Annex B)' },
  { id: 'data-transfers', title: '8. Data Transfers' },
  { id: 'breach-notification', title: '9. Breach Notification' },
  { id: 'governing-law', title: '10. Governing Law' },
  { id: 'signatures', title: '11. Signatures & Acceptance' },
];

function CompanyBlock() {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 my-4 not-prose">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Building2 className="w-4 h-4 text-blue-600" />
        </div>
        <div className="text-sm leading-relaxed text-gray-700 space-y-0.5">
          <p className="font-semibold text-gray-900">{COMPANY.name_en}</p>
          <p>{COMPANY.address_en}</p>
          <p>
            <a href={`mailto:${COMPANY.email}`} className="text-blue-600 hover:underline">
              {COMPANY.email}
            </a>
          </p>
          <p>{COMPANY.phone}</p>
        </div>
      </div>
    </div>
  );
}

function SubProcessorsTable() {
  const rows = [
    { name: 'Supabase Inc.', purpose: 'Database & authentication infrastructure', location: 'EU (Frankfurt, Germany)', link: 'supabase.com/privacy' },
    { name: 'Netlify Inc.', purpose: 'Application hosting & CDN', location: 'EU nodes (GDPR SCCs)', link: 'netlify.com/privacy' },
    { name: 'Stripe Inc.', purpose: 'Payment processing', location: 'EU (SCCs in place)', link: 'stripe.com/privacy' },
    { name: 'Email provider', purpose: 'Transactional emails only (invoices, alerts)', location: 'EU', link: '' },
  ];

  return (
    <div className="my-5 not-prose overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Sub-processor</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Purpose</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Location</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Privacy Policy</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800 align-top">{row.name}</td>
              <td className="px-4 py-3 text-gray-600 align-top leading-relaxed">{row.purpose}</td>
              <td className="px-4 py-3 text-gray-600 align-top">{row.location}</td>
              <td className="px-4 py-3 align-top">
                {row.link ? (
                  <a
                    href={`https://${row.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs"
                  >
                    {row.link} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SecurityGrid() {
  const items = [
    { icon: Lock, title: 'Encryption in transit', desc: 'TLS 1.2 or higher on all connections' },
    { icon: Shield, title: 'Encryption at rest', desc: 'AES-256 via Supabase managed storage' },
    { icon: FileText, title: 'Row Level Security', desc: 'Each hotel can only access its own data — enforced at DB level' },
    { icon: FileText, title: 'Audit logging', desc: 'Access and data changes are recorded' },
    { icon: Clock, title: 'Backup retention', desc: 'Daily backups, 30-day rolling retention' },
    { icon: Building2, title: 'EU region', desc: 'All data stored and processed in EU (Frankfurt)' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5 not-prose">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white">
          <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <item.icon className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
            <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AcceptancePanel({
  acceptance,
  accepting,
  onAccept,
  hotelName,
}: {
  acceptance: { accepted_at: string; dpa_version: string } | null;
  accepting: boolean;
  onAccept: () => void;
  hotelName?: string;
}) {
  if (acceptance) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 not-prose">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-900 text-base">DPA Accepted</p>
            <p className="text-green-700 text-sm mt-1">
              This DPA (version {acceptance.dpa_version}) was accepted on{' '}
              <strong>{new Date(acceptance.accepted_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}</strong>{' '}
              at{' '}
              {new Date(acceptance.accepted_at).toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit',
              })} UTC.
            </p>
            {hotelName && (
              <p className="text-green-600 text-xs mt-1">On behalf of: {hotelName}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 not-prose">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-900 text-base">Action Required</p>
          <p className="text-amber-700 text-sm mt-1 leading-relaxed">
            Please review this Data Processing Agreement and accept it to confirm your hotel's
            compliance with GDPR Article 28 obligations.
          </p>
          <button
            onClick={onAccept}
            disabled={accepting}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white text-sm font-semibold rounded-lg hover:bg-[#172e4c] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Recording acceptance…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                I accept this DPA
              </>
            )}
          </button>
          <p className="text-xs text-amber-600 mt-2">
            By clicking, you confirm you are authorised to bind your organisation to this agreement.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DpaPage() {
  const [activeSection, setActiveSection] = useState<string>('parties');
  const contentRef = useRef<HTMLDivElement>(null);

  const { user, staff } = useAuth();
  const { tenant } = useTenant();

  const { acceptance, loading: dpaLoading, accepting, accept } = useDpaAcceptance(
    user?.id,
    tenant?.id ?? null
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    const sectionEls = document.querySelectorAll('section[id]');
    sectionEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hotelName = staff?.hotel_id ? undefined : tenant?.name;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
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
            <span className="text-gray-900 font-medium">Data Processing Agreement</span>
          </nav>

          <div className="flex items-center gap-2">
            {!dpaLoading && !acceptance && user && (
              <button
                onClick={accept}
                disabled={accepting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#172e4c] transition-colors disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                I accept this DPA
              </button>
            )}
            {!dpaLoading && acceptance && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                Accepted
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download / Print</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <div className="flex gap-10 lg:gap-14">
          {/* Sticky TOC */}
          <aside className="hidden lg:block w-64 flex-shrink-0 print:hidden">
            <div className="sticky top-24">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Contents</p>
              <nav className="space-y-0.5">
                {SECTIONS.map(s => (
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
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Related</p>
                <Link to="/privacy" className="block text-xs text-blue-600 hover:underline py-0.5">Privacy Policy</Link>
                <Link to="/terms" className="block text-xs text-blue-600 hover:underline py-0.5">Terms of Service</Link>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0" ref={contentRef}>
            {/* Header */}
            <div className="mb-10 pb-8 border-b border-gray-200">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700 mb-4">
                <Shield className="w-3.5 h-3.5" />
                GDPR Article 28 Agreement
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                Data Processing Agreement
              </h1>
              <p className="text-lg text-gray-500 mb-4">
                Between Soft Care Concept EOOD (Processor) and the subscribing hotel (Controller)
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span><strong className="text-gray-700">Last updated:</strong> April 2026</span>
                <span><strong className="text-gray-700">Version:</strong> 1.0</span>
                <span><strong className="text-gray-700">Regulation:</strong> GDPR (EU) 2016/679</span>
              </div>
            </div>

            <div className="prose prose-gray prose-base max-w-none">
              <section id="parties">
                <h2>1. Parties</h2>
                <h3>Data Processor</h3>
                <CompanyBlock />
                <p>
                  Hereinafter referred to as <strong>"the Processor"</strong> or{' '}
                  <strong>"StayWise"</strong>.
                </p>
                <h3>Data Controller</h3>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 my-4 not-prose">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="text-sm leading-relaxed text-gray-700 space-y-0.5">
                      <p className="font-semibold text-gray-900">
                        {tenant?.name ?? '[Hotel / subscribing customer]'}
                      </p>
                      <p>
                        The subscribing hotel or hospitality business that holds an active
                        StayWise account.
                      </p>
                      <p className="text-gray-500">
                        Identified by their account email and organisation details provided during
                        registration.
                      </p>
                    </div>
                  </div>
                </div>
                <p>
                  Hereinafter referred to as <strong>"the Controller"</strong>.
                </p>
                <p>
                  Together referred to as <strong>"the Parties"</strong>.
                </p>
              </section>

              <section id="subject-matter">
                <h2>2. Subject Matter &amp; Purpose</h2>
                <p>
                  The Processor provides a cloud-based hotel property management system (PMS)
                  under the Terms of Service agreed between the Parties. In the course of
                  providing this service, the Processor processes personal data of hotel guests
                  and hotel staff <strong>on behalf of the Controller</strong>, strictly in
                  accordance with the Controller's documented instructions.
                </p>
                <p>
                  This DPA sets out the obligations and rights of the Parties with respect to
                  the processing of personal data, as required by Article 28 of Regulation (EU)
                  2016/679 (GDPR).
                </p>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 not-prose flex items-start gap-3 my-4">
                  <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 leading-relaxed">
                    <strong>Role clarification:</strong> The Controller determines the purposes
                    and means of processing. The Processor acts only on the Controller's
                    documented instructions and does not process data for its own purposes.
                  </p>
                </div>
              </section>

              <section id="data-subjects">
                <h2>3. Categories of Data Subjects</h2>
                <p>The personal data processed under this DPA relates to the following categories of data subjects:</p>
                <ul>
                  <li>
                    <strong>Hotel guests</strong> — individuals who make reservations at or stay
                    in the Controller's property
                  </li>
                  <li>
                    <strong>Hotel staff users</strong> — employees and contractors of the
                    Controller who access the StayWise platform
                  </li>
                </ul>
              </section>

              <section id="personal-data">
                <h2>4. Categories of Personal Data</h2>
                <p>The following categories of personal data may be processed:</p>
                <ul>
                  <li>
                    <strong>Identity data:</strong> full name, nationality, date of birth,
                    gender
                  </li>
                  <li>
                    <strong>Contact data:</strong> email address, phone number
                  </li>
                  <li>
                    <strong>Travel document data:</strong> passport or national ID number,
                    document expiry date, issuing country
                  </li>
                  <li>
                    <strong>Booking data:</strong> stay dates, room type, number of guests,
                    special requests, dietary preferences, accessibility requirements
                  </li>
                  <li>
                    <strong>Payment references:</strong> booking reference numbers, payment
                    method type (not full card numbers — card processing handled by Stripe)
                  </li>
                  <li>
                    <strong>Communication history:</strong> messages between the hotel and guest
                    via the platform
                  </li>
                </ul>
                <p>
                  No special categories of personal data (Article 9 GDPR) are intentionally
                  collected by the platform, unless voluntarily provided by the guest (e.g.
                  accessibility requirements).
                </p>
              </section>

              <section id="processor-obligations">
                <h2>5. Processor Obligations (Art. 28)</h2>
                <p>The Processor shall:</p>
                <ol>
                  <li>
                    Process personal data <strong>only on documented instructions</strong> from
                    the Controller, unless required to do so by Union or Member State law.
                  </li>
                  <li>
                    Ensure that persons authorised to process the personal data have committed
                    themselves to <strong>confidentiality</strong> or are under an appropriate
                    statutory obligation of confidentiality.
                  </li>
                  <li>
                    Implement appropriate <strong>technical and organisational security
                    measures</strong> in accordance with Article 32 GDPR (see Section 6).
                  </li>
                  <li>
                    Not engage another processor (sub-processor) without <strong>prior
                    written authorisation</strong> of the Controller. Current authorised
                    sub-processors are listed in Annex B (Section 7). The Controller hereby
                    grants general written authorisation to engage those listed sub-processors.
                  </li>
                  <li>
                    Assist the Controller, taking into account the nature of the processing, in
                    fulfilling the Controller's obligation to respond to{' '}
                    <strong>data subject rights requests</strong>.
                  </li>
                  <li>
                    At the choice of the Controller, <strong>delete or return all personal
                    data</strong> upon termination of the service, and delete existing copies
                    unless Union or Member State law requires storage of the personal data.
                  </li>
                  <li>
                    Make available to the Controller all <strong>information necessary to
                    demonstrate compliance</strong> with the obligations laid down in Article
                    28 GDPR, and allow for and contribute to audits and inspections conducted
                    by the Controller or a mandated auditor.
                  </li>
                </ol>
              </section>

              <section id="security-measures">
                <h2>6. Security Measures (Art. 32)</h2>
                <p>
                  The Processor implements and maintains the following technical and
                  organisational measures to ensure a level of security appropriate to the risk:
                </p>
                <SecurityGrid />
                <p>
                  The Processor regularly reviews and tests these measures. The Controller
                  acknowledges that no security measure is 100% effective and agrees to implement
                  appropriate security measures on their own systems and access points.
                </p>
              </section>

              <section id="sub-processors">
                <h2>7. Sub-Processors (Annex B)</h2>
                <p>
                  The Processor engages the following sub-processors. The Controller hereby
                  provides general authorisation for their use. The Processor will notify the
                  Controller of any changes to this list.
                </p>
                <SubProcessorsTable />
                <p>
                  All sub-processors are bound by GDPR-compliant Data Processing Agreements
                  with the Processor. Where sub-processors are located outside the EEA, data
                  transfers are governed by Standard Contractual Clauses (SCCs).
                </p>
              </section>

              <section id="data-transfers">
                <h2>8. Data Transfers</h2>
                <p>
                  All personal data is stored within the European Economic Area (EEA), primarily
                  in the EU-West (Frankfurt, Germany) region operated by Supabase.
                </p>
                <p>
                  No personal data is transferred to third countries (outside the EEA) without
                  ensuring adequate safeguards as required by Chapter V of the GDPR. Where
                  third-country transfers are necessary (e.g. for sub-processors with US
                  operations), Standard Contractual Clauses pursuant to Commission Decision
                  2021/914/EU are in place.
                </p>
              </section>

              <section id="breach-notification">
                <h2>9. Breach Notification</h2>
                <p>
                  The Processor will notify the Controller <strong>without undue delay and,
                  where feasible, within 72 hours</strong> of becoming aware of a personal data
                  breach affecting data processed under this DPA.
                </p>
                <p>The notification will include, to the extent known:</p>
                <ul>
                  <li>The nature of the breach and categories of data affected</li>
                  <li>The approximate number of data subjects and records affected</li>
                  <li>Contact details of the Processor's data protection contact</li>
                  <li>Likely consequences of the breach</li>
                  <li>Measures taken or proposed to address the breach</li>
                </ul>
                <p>
                  The Controller is responsible for notifying the relevant supervisory authority
                  and data subjects where required.
                </p>
              </section>

              <section id="governing-law">
                <h2>10. Governing Law</h2>
                <p>
                  This DPA shall be governed by and construed in accordance with the{' '}
                  <strong>laws of the Republic of Bulgaria</strong>, without regard to conflict
                  of law provisions. Any disputes shall be subject to the exclusive jurisdiction
                  of the courts of Bulgaria.
                </p>
                <p>
                  This DPA is without prejudice to the rights of data subjects under applicable
                  data protection legislation.
                </p>
              </section>

              <section id="signatures">
                <h2>11. Signatures &amp; Acceptance</h2>
                <p>
                  By accepting this DPA, the signatory confirms they have the authority to bind
                  their organisation as Data Controller and agree to the terms set out above.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 not-prose">
                  <div className="p-5 rounded-xl border border-gray-200 bg-gray-50">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">On behalf of Processor</p>
                    <p className="font-semibold text-gray-900 text-sm">{COMPANY.name_en}</p>
                    <p className="text-gray-500 text-xs mt-1">{COMPANY.address_en}</p>
                    <p className="text-gray-500 text-xs">{COMPANY.email}</p>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Represented by: <span className="font-medium text-gray-700">{COMPANY.manager}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Accepted: <span className="font-medium text-gray-700">At time of platform deployment</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-gray-200 bg-gray-50">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">On behalf of Controller</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {tenant?.name ?? '[Hotel name]'}
                    </p>
                    {user && (
                      <p className="text-gray-500 text-xs mt-1">{user.email}</p>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {acceptance ? (
                        <>
                          <p className="text-xs text-green-700">
                            Accepted by: <span className="font-medium">{user?.email ?? '—'}</span>
                          </p>
                          <p className="text-xs text-green-700 mt-0.5">
                            Date: <span className="font-medium">
                              {new Date(acceptance.accepted_at).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'long', year: 'numeric',
                              })}
                            </span>
                          </p>
                          <p className="text-xs text-green-700 mt-0.5">
                            DPA Version: <span className="font-medium">{acceptance.dpa_version}</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-amber-600">
                          {user ? 'Pending acceptance — see below' : 'Log in to accept this DPA'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {user ? (
                  <AcceptancePanel
                    acceptance={acceptance}
                    accepting={accepting}
                    onAccept={accept}
                    hotelName={hotelName}
                  />
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 not-prose flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      <Link to="/login" className="text-blue-600 hover:underline font-medium">
                        Log in to your account
                      </Link>{' '}
                      to accept this DPA on behalf of your hotel.
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* Footer */}
            <div className="mt-14 pt-8 border-t border-gray-200 text-sm text-gray-500 space-y-2">
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

      <style>{`
        @media print {
          body { background: white; }
          .prose h2 { page-break-before: auto; }
          section { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
