import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Printer, Globe, ChevronRight, ExternalLink, Info, Shield } from 'lucide-react';
import { COMPANY } from '../../config/company';

type Lang = 'en' | 'bg';

interface Section {
  id: string;
  title: string;
}

const SECTIONS_EN: Section[] = [
  { id: 'parties', title: '1. Parties to the Agreement' },
  { id: 'service', title: '2. Service Description' },
  { id: 'subscription', title: '3. Subscription & Payment' },
  { id: 'trial', title: '4. Free Trial' },
  { id: 'gdpr', title: '5. Data Processing & GDPR' },
  { id: 'acceptable-use', title: '6. Acceptable Use' },
  { id: 'availability', title: '7. Availability & Support' },
  { id: 'ip', title: '8. Intellectual Property' },
  { id: 'liability', title: '9. Limitation of Liability' },
  { id: 'termination', title: '10. Termination' },
  { id: 'governing-law', title: '11. Governing Law' },
  { id: 'changes', title: '12. Changes to Terms' },
  { id: 'contact', title: '13. Contact' },
];

const SECTIONS_BG: Section[] = [
  { id: 'parties', title: '1. Страни по споразумението' },
  { id: 'service', title: '2. Описание на услугата' },
  { id: 'subscription', title: '3. Абонамент и плащане' },
  { id: 'trial', title: '4. Безплатен пробен период' },
  { id: 'gdpr', title: '5. Обработка на данни и GDPR' },
  { id: 'acceptable-use', title: '6. Допустимо използване' },
  { id: 'availability', title: '7. Наличност и поддръжка' },
  { id: 'ip', title: '8. Интелектуална собственост' },
  { id: 'liability', title: '9. Ограничаване на отговорността' },
  { id: 'termination', title: '10. Прекратяване' },
  { id: 'governing-law', title: '11. Приложимо право' },
  { id: 'changes', title: '12. Промени в условията' },
  { id: 'contact', title: '13. Контакт' },
];

function CompanyCard({ lang }: { lang: Lang }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 my-4 not-prose">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Building2 className="w-4 h-4 text-blue-600" />
        </div>
        <div className="text-sm leading-relaxed text-gray-700 space-y-0.5">
          <p className="font-semibold text-gray-900">
            {lang === 'en' ? COMPANY.name_en : COMPANY.name_bg}
          </p>
          <p>{lang === 'en' ? 'UIC' : 'ЕИК'}: {COMPANY.uic}</p>
          <p>{lang === 'en' ? COMPANY.address_en : COMPANY.address_bg}</p>
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

function InfoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 my-4 not-prose flex items-start gap-3">
      <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 leading-relaxed">{children}</p>
    </div>
  );
}

function GdprNotice({ lang }: { lang: Lang }) {
  return (
    <div className="rounded-xl border border-green-100 bg-green-50 p-4 my-4 not-prose flex items-start gap-3">
      <Shield className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-green-800 leading-relaxed">
        {lang === 'en'
          ? `A Data Processing Agreement (DPA) is available at `
          : `Споразумение за обработка на данни (DPA) е достъпно на `}
        <a
          href={`https://${COMPANY.website}/dpa`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          {COMPANY.website}/dpa
        </a>
      </p>
    </div>
  );
}

function ContentEN() {
  return (
    <div className="prose prose-gray prose-base max-w-none">
      <section id="parties">
        <h2>1. Parties to the Agreement</h2>
        <p>
          This Terms of Service agreement ("Agreement") is between{' '}
          <strong>Soft Care Concept EOOD</strong> (referred to as "StayWise", "we", "us", or "our")
          and the hotel, property, or business subscribing to the StayWise PMS platform ("Customer",
          "you", or "your").
        </p>
        <CompanyCard lang="en" />
      </section>

      <section id="service">
        <h2>2. Service Description</h2>
        <p>
          StayWise Software is a cloud-based Property Management System (PMS) providing:
        </p>
        <ul>
          <li>Reservation and front desk management</li>
          <li>Channel manager (OTA synchronisation)</li>
          <li>Housekeeping management</li>
          <li>Payment processing and invoicing</li>
          <li>Guest portal and digital check-in</li>
          <li>Reporting and analytics</li>
          <li>Multi-property management</li>
        </ul>
      </section>

      <section id="subscription">
        <h2>3. Subscription Plans and Payment</h2>
        <p>
          <strong>3.1</strong> StayWise is offered on a monthly subscription basis.
        </p>
        <p>
          <strong>3.2</strong> Current plans: Starter, Pro, Enterprise — pricing available at{' '}
          <a
            href={`https://${COMPANY.website}/pricing`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            {COMPANY.website}/pricing <ExternalLink className="w-3 h-3" />
          </a>
        </p>
        <p>
          <strong>3.3</strong> Payment is due monthly in advance.
        </p>
        <p>
          <strong>3.4</strong> Prices are in EUR excluding applicable VAT.
        </p>
        <p>
          <strong>3.5</strong> Bulgarian VAT (ДДС) of 20% applies to customers in Bulgaria. EU
          customers outside Bulgaria may be subject to reverse charge VAT.
        </p>
        <p>
          <strong>3.6</strong> Non-payment within 14 days may result in service suspension.
        </p>
        <InfoNotice>
          All invoices are issued by Soft Care Concept EOOD and are compliant with Bulgarian
          accounting and tax legislation.
        </InfoNotice>
      </section>

      <section id="trial">
        <h2>4. Free Trial</h2>
        <p>
          <strong>4.1</strong> New customers may access a free trial period as advertised at the
          time of registration.
        </p>
        <p>
          <strong>4.2</strong> No credit card is required during the trial period.
        </p>
        <p>
          <strong>4.3</strong> After the trial period, continued use requires a paid subscription.
        </p>
      </section>

      <section id="gdpr">
        <h2>5. Data Processing and GDPR</h2>
        <p>
          <strong>5.1</strong> Soft Care Concept EOOD acts as a <strong>Data Processor</strong>{' '}
          for hotel guest data entered into StayWise.
        </p>
        <p>
          <strong>5.2</strong> The Customer (hotel) acts as <strong>Data Controller</strong> for
          their guests' personal data.
        </p>
        <p>
          <strong>5.3</strong> A Data Processing Agreement (DPA) is available at{' '}
          <a href={`https://${COMPANY.website}/dpa`} target="_blank" rel="noopener noreferrer">
            {COMPANY.website}/dpa
          </a>
        </p>
        <GdprNotice lang="en" />
        <p>
          <strong>5.4</strong> We process data only as instructed by the Customer and in
          accordance with our{' '}
          <Link to="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          <strong>5.5</strong> Data is stored on servers within the European Economic Area (EEA).
        </p>
      </section>

      <section id="acceptable-use">
        <h2>6. Acceptable Use</h2>
        <p>Customers must not:</p>
        <ul>
          <li>Use StayWise for illegal purposes</li>
          <li>Attempt to reverse-engineer or copy the software</li>
          <li>
            Share login credentials between multiple properties without appropriate licensing
          </li>
          <li>Use the platform to store data unrelated to hospitality operations</li>
        </ul>
      </section>

      <section id="availability">
        <h2>7. Service Availability and Support</h2>
        <p>
          <strong>7.1</strong> We target 99.5% monthly uptime.
        </p>
        <p>
          <strong>7.2</strong> Scheduled maintenance will be communicated 48 hours in advance.
        </p>
        <p>
          <strong>7.3</strong> Support is provided by email during Bulgarian business hours (09:00–18:00 EET, Monday–Friday).
        </p>
      </section>

      <section id="ip">
        <h2>8. Intellectual Property</h2>
        <p>
          All software, design, and content of StayWise remains the exclusive property of{' '}
          <strong>Soft Care Concept EOOD</strong>. No licence to copy, reproduce, or distribute
          any part of the platform is granted.
        </p>
      </section>

      <section id="liability">
        <h2>9. Limitation of Liability</h2>
        <p>
          Our liability is limited to the amount paid by the Customer in the 3 months preceding
          the claim. We are not liable for:
        </p>
        <ul>
          <li>Lost revenue or indirect damages</li>
          <li>Data loss due to Customer error</li>
          <li>Third-party OTA connection failures</li>
          <li>Force majeure events</li>
        </ul>
      </section>

      <section id="termination">
        <h2>10. Termination</h2>
        <p>
          <strong>10.1</strong> Either party may terminate with 30 days written notice.
        </p>
        <p>
          <strong>10.2</strong> Upon termination, Customer data is available for export for 30
          days, then permanently deleted.
        </p>
        <p>
          <strong>10.3</strong> We may terminate immediately for material breach of these Terms.
        </p>
      </section>

      <section id="governing-law">
        <h2>11. Governing Law and Disputes</h2>
        <p>
          <strong>11.1</strong> This Agreement is governed by the laws of the Republic of
          Bulgaria.
        </p>
        <p>
          <strong>11.2</strong> Disputes shall be referred to the competent court in Sofia,
          Bulgaria.
        </p>
        <p>
          <strong>11.3</strong> For consumer disputes, the European Online Dispute Resolution
          platform is available at:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            ec.europa.eu/consumers/odr <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </section>

      <section id="changes">
        <h2>12. Changes to Terms</h2>
        <p>
          We may update these Terms with 30 days notice by email to the registered account
          holder. Continued use of the platform after that period constitutes acceptance of the
          updated Terms.
        </p>
      </section>

      <section id="contact">
        <h2>13. Contact</h2>
        <p>For any questions regarding these Terms, contact us at:</p>
        <CompanyCard lang="en" />
      </section>
    </div>
  );
}

function ContentBG() {
  return (
    <div className="prose prose-gray prose-base max-w-none">
      <section id="parties">
        <h2>1. Страни по споразумението</h2>
        <p>
          Настоящото Споразумение за общи условия за ползване ("Споразумение") е между{' '}
          <strong>Софт Кер Концепт ЕООД</strong> (наричано "StayWise", "ние" или "нас") и хотела,
          обекта или бизнеса, абониран за платформата StayWise PMS ("Клиент", "вие" или "ваш").
        </p>
        <CompanyCard lang="bg" />
      </section>

      <section id="service">
        <h2>2. Описание на услугата</h2>
        <p>
          StayWise Software е облачна система за управление на хотел (PMS), предоставяща:
        </p>
        <ul>
          <li>Управление на резервации и рецепция</li>
          <li>Мениджър на канали (синхронизация с OTA)</li>
          <li>Управление на хаускийпинг</li>
          <li>Обработка на плащания и издаване на фактури</li>
          <li>Гост портал и дигитален чек-ин</li>
          <li>Отчети и анализи</li>
          <li>Управление на множество обекти</li>
        </ul>
      </section>

      <section id="subscription">
        <h2>3. Абонамент и плащане</h2>
        <p>
          <strong>3.1</strong> StayWise се предлага на месечна абонаментна основа.
        </p>
        <p>
          <strong>3.2</strong> Текущи планове: Starter, Pro, Enterprise — ценообразуването е
          достъпно на{' '}
          <a
            href={`https://${COMPANY.website}/pricing`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            {COMPANY.website}/pricing <ExternalLink className="w-3 h-3" />
          </a>
        </p>
        <p>
          <strong>3.3</strong> Плащането се дължи месечно предварително.
        </p>
        <p>
          <strong>3.4</strong> Цените са в EUR без приложим ДДС.
        </p>
        <p>
          <strong>3.5</strong> Български ДДС от 20% се прилага за клиенти в България. Клиентите
          от ЕС извън България може да подлежат на механизма за обратно начисляване на ДДС.
        </p>
        <p>
          <strong>3.6</strong> Неплащането в рамките на 14 дни може да доведе до спиране на
          услугата.
        </p>
        <InfoNotice>
          Всички фактури се издават от Софт Кер Концепт ЕООД и са в съответствие с българското
          счетоводно и данъчно законодателство.
        </InfoNotice>
      </section>

      <section id="trial">
        <h2>4. Безплатен пробен период</h2>
        <p>
          <strong>4.1</strong> Новите клиенти могат да получат достъп до безплатен пробен период,
          рекламиран по времето на регистрацията.
        </p>
        <p>
          <strong>4.2</strong> По време на пробния период не е необходима кредитна карта.
        </p>
        <p>
          <strong>4.3</strong> След пробния период продължаването на ползване изисква платен
          абонамент.
        </p>
      </section>

      <section id="gdpr">
        <h2>5. Обработка на данни и GDPR</h2>
        <p>
          <strong>5.1</strong> Софт Кер Концепт ЕООД действа като{' '}
          <strong>Обработващ лични данни</strong> за данните на гостите на хотела, въведени в
          StayWise.
        </p>
        <p>
          <strong>5.2</strong> Клиентът (хотелът) действа като{' '}
          <strong>Администратор на лични данни</strong> за личните данни на своите гости.
        </p>
        <p>
          <strong>5.3</strong> Споразумение за обработка на данни (DPA) е достъпно на{' '}
          <a href={`https://${COMPANY.website}/dpa`} target="_blank" rel="noopener noreferrer">
            {COMPANY.website}/dpa
          </a>
        </p>
        <GdprNotice lang="bg" />
        <p>
          <strong>5.4</strong> Обработваме данни само по инструкция на Клиента и в съответствие
          с нашата{' '}
          <Link to="/privacy" className="text-blue-600 hover:underline">
            Политика за поверителност
          </Link>
          .
        </p>
        <p>
          <strong>5.5</strong> Данните се съхраняват на сървъри в рамките на Европейското
          икономическо пространство (ЕИП).
        </p>
      </section>

      <section id="acceptable-use">
        <h2>6. Допустимо използване</h2>
        <p>Клиентите не трябва да:</p>
        <ul>
          <li>Използват StayWise за незаконни цели</li>
          <li>Опитват да реверсират или копират софтуера</li>
          <li>
            Споделят данни за вход между множество обекти без подходящ лиценз
          </li>
          <li>
            Използват платформата за съхранение на данни, несвързани с хотелиерските операции
          </li>
        </ul>
      </section>

      <section id="availability">
        <h2>7. Наличност и поддръжка</h2>
        <p>
          <strong>7.1</strong> Целим 99,5% месечна наличност на услугата.
        </p>
        <p>
          <strong>7.2</strong> Планираната поддръжка ще бъде съобщена 48 часа предварително.
        </p>
        <p>
          <strong>7.3</strong> Поддръжката се предоставя по имейл по време на българско работно
          време (09:00–18:00 ЕЕВ, понеделник–петък).
        </p>
      </section>

      <section id="ip">
        <h2>8. Интелектуална собственост</h2>
        <p>
          Целият софтуер, дизайн и съдържание на StayWise остава изключителна собственост на{' '}
          <strong>Софт Кер Концепт ЕООД</strong>. Не се предоставя лиценз за копиране,
          възпроизвеждане или разпространение на каквато и да е част от платформата.
        </p>
      </section>

      <section id="liability">
        <h2>9. Ограничаване на отговорността</h2>
        <p>
          Нашата отговорност е ограничена до сумата, платена от Клиента през 3-те месеца
          преди претенцията. Не носим отговорност за:
        </p>
        <ul>
          <li>Загуба на приходи или косвени щети</li>
          <li>Загуба на данни поради грешка на Клиента</li>
          <li>Неуспехи в свързването с трети страни (OTA)</li>
          <li>Форсмажорни обстоятелства</li>
        </ul>
      </section>

      <section id="termination">
        <h2>10. Прекратяване</h2>
        <p>
          <strong>10.1</strong> Всяка страна може да прекрати с 30-дневно писмено предизвестие.
        </p>
        <p>
          <strong>10.2</strong> При прекратяване данните на Клиента са достъпни за експортиране
          30 дни, след което се изтриват окончателно.
        </p>
        <p>
          <strong>10.3</strong> Можем да прекратим незабавно при съществено нарушение на тези
          Общи условия.
        </p>
      </section>

      <section id="governing-law">
        <h2>11. Приложимо право и спорове</h2>
        <p>
          <strong>11.1</strong> Това Споразумение се урежда от законите на Република България.
        </p>
        <p>
          <strong>11.2</strong> Споровете се отнасят до компетентния съд в София, България.
        </p>
        <p>
          <strong>11.3</strong> За потребителски спорове е достъпна Европейската платформа за
          онлайн решаване на спорове:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            ec.europa.eu/consumers/odr <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </section>

      <section id="changes">
        <h2>12. Промени в условията</h2>
        <p>
          Можем да актуализираме тези Общи условия с 30-дневно предизвестие по имейл до
          регистрирания притежател на акаунта. Продължаването на използване на платформата след
          този период представлява приемане на актуализираните Условия.
        </p>
      </section>

      <section id="contact">
        <h2>13. Контакт</h2>
        <p>За въпроси относно тези Общи условия, свържете се с нас на:</p>
        <CompanyCard lang="bg" />
      </section>
    </div>
  );
}

export default function TermsPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [activeSection, setActiveSection] = useState<string>('parties');
  const contentRef = useRef<HTMLDivElement>(null);

  const sections = lang === 'en' ? SECTIONS_EN : SECTIONS_BG;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    const sectionEls = document.querySelectorAll('section[id]');
    sectionEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [lang]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/lobby" className="flex items-center gap-2.5 text-gray-900 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">StayWise</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
            <Link to="/lobby" className="hover:text-gray-700 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 font-medium">
              {lang === 'en' ? 'Terms of Service' : 'Общи условия'}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setLang('en')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <Globe className="w-3 h-3" />
                English
              </button>
              <button
                onClick={() => setLang('bg')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${lang === 'bg' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                Български
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <div className="flex gap-10 lg:gap-14">
          {/* Sticky TOC Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0 print:hidden">
            <div className="sticky top-24">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                {lang === 'en' ? 'Contents' : 'Съдържание'}
              </p>
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
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0" ref={contentRef}>
            {/* Page header */}
            <div className="mb-10 pb-8 border-b border-gray-200">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700 mb-4">
                <Shield className="w-3.5 h-3.5" />
                {lang === 'en' ? 'Legal Document' : 'Правен документ'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                {lang === 'en' ? 'Terms of Service' : 'Общи условия за ползване'}
              </h1>
              <p className="text-lg text-gray-500 mb-4">
                StayWise Software — Property Management System
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>
                  <strong className="text-gray-700">
                    {lang === 'en' ? 'Last updated:' : 'Последна актуализация:'}
                  </strong>{' '}
                  {lang === 'en' ? 'April 2026' : 'Април 2026'}
                </span>
                <span>
                  <strong className="text-gray-700">
                    {lang === 'en' ? 'Version:' : 'Версия:'}
                  </strong>{' '}
                  1.0
                </span>
                <span>
                  <strong className="text-gray-700">
                    {lang === 'en' ? 'Company:' : 'Компания:'}
                  </strong>{' '}
                  {lang === 'en' ? COMPANY.name_en : COMPANY.name_bg}
                </span>
              </div>
            </div>

            {lang === 'en' ? <ContentEN /> : <ContentBG />}

            {/* Footer note */}
            <div className="mt-14 pt-8 border-t border-gray-200 text-sm text-gray-500 space-y-2">
              <p>
                {lang === 'en'
                  ? `© ${new Date().getFullYear()} ${COMPANY.name_en}. All rights reserved.`
                  : `© ${new Date().getFullYear()} ${COMPANY.name_bg}. Всички права запазени.`}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/privacy" className="text-blue-600 hover:underline">
                  {lang === 'en' ? 'Privacy Policy' : 'Политика за поверителност'}
                </Link>
                <Link to="/terms" className="text-blue-600 hover:underline">
                  {lang === 'en' ? 'Terms of Service' : 'Общи условия'}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Print styles */}
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
