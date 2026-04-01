import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Printer, Globe, ChevronRight, ExternalLink, Shield, Lock, Eye, Database, Users } from 'lucide-react';
import { COMPANY } from '../../config/company';

type Lang = 'en' | 'bg';

interface Section {
  id: string;
  title: string;
}

const SECTIONS_EN: Section[] = [
  { id: 'who-we-are', title: '1. Who We Are' },
  { id: 'data-collected', title: '2. Data We Collect' },
  { id: 'legal-basis', title: '3. Legal Basis (GDPR Art. 6)' },
  { id: 'how-we-use', title: '4. How We Use Your Data' },
  { id: 'data-sharing', title: '5. Data Sharing' },
  { id: 'retention', title: '6. Data Retention' },
  { id: 'your-rights', title: '7. Your Rights under GDPR' },
  { id: 'cookies', title: '8. Cookies' },
  { id: 'security', title: '9. Security' },
  { id: 'children', title: '10. Children' },
  { id: 'changes', title: '11. Changes to This Policy' },
  { id: 'contact', title: '12. Contact' },
];

const SECTIONS_BG: Section[] = [
  { id: 'who-we-are', title: '1. Кои сме ние' },
  { id: 'data-collected', title: '2. Данни, които събираме' },
  { id: 'legal-basis', title: '3. Правно основание (GDPR чл. 6)' },
  { id: 'how-we-use', title: '4. Как използваме данните' },
  { id: 'data-sharing', title: '5. Споделяне на данни' },
  { id: 'retention', title: '6. Съхранение на данни' },
  { id: 'your-rights', title: '7. Вашите права по GDPR' },
  { id: 'cookies', title: '8. Бисквитки' },
  { id: 'security', title: '9. Сигурност' },
  { id: 'children', title: '10. Деца' },
  { id: 'changes', title: '11. Промени в тази политика' },
  { id: 'contact', title: '12. Контакт' },
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

function ProcessorNotice({ lang }: { lang: Lang }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 my-4 not-prose flex items-start gap-3">
      <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 leading-relaxed">
        {lang === 'en'
          ? 'StayWise acts as a Data Processor for guest data. The hotel is the Data Controller responsible for obtaining guest consent under GDPR.'
          : 'StayWise действа като Обработващ лични данни за данните на гостите. Хотелът е Администратор на лични данни и носи отговорност за получаване на съгласие от гостите съгласно GDPR.'}
      </p>
    </div>
  );
}

function NoSellNotice({ lang }: { lang: Lang }) {
  return (
    <div className="rounded-xl border border-green-100 bg-green-50 p-4 my-4 not-prose flex items-start gap-3">
      <Shield className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-green-800 leading-relaxed space-y-1">
        <p className="font-semibold">
          {lang === 'en' ? 'We do NOT sell your data.' : 'Ние НЕ продаваме вашите данни.'}
        </p>
        <p>
          {lang === 'en'
            ? 'We do NOT use hotel guest data for our own marketing purposes.'
            : 'Ние НЕ използваме данните на гостите на хотела за собствени маркетингови цели.'}
        </p>
      </div>
    </div>
  );
}

function DataTable({ lang }: { lang: Lang }) {
  const rows = lang === 'en' ? [
    { category: 'Hotel account data', examples: 'Company name, contact name, email, phone, address', basis: 'Contract performance' },
    { category: 'Billing data', examples: 'Subscription plan, payment records (card processing by Stripe — raw card numbers not stored)', basis: 'Contract + Legal obligation' },
    { category: 'Usage data', examples: 'Login timestamps, features used, error logs', basis: 'Legitimate interest' },
    { category: 'Guest data (on behalf of hotel)', examples: 'Name, email, phone, nationality, ID details, booking info, payment references', basis: 'Data Processor (hotel is Controller)' },
  ] : [
    { category: 'Данни за хотелски акаунт', examples: 'Фирмено наименование, лице за контакт, имейл, телефон, адрес', basis: 'Изпълнение на договор' },
    { category: 'Данни за фактуриране', examples: 'Абонаментен план, записи на плащания (обработка на карти от Stripe — сурови номера на карти не се съхраняват)', basis: 'Договор + Законово задължение' },
    { category: 'Данни за използване', examples: 'Времеви марки за вход, използвани функции, логове за грешки', basis: 'Легитимен интерес' },
    { category: 'Данни за гости (от името на хотела)', examples: 'Имена, имейл, телефон, националност, данни от лична карта, информация за резервация, референции за плащания', basis: 'Обработващ данни (хотелът е Администратор)' },
  ];

  return (
    <div className="my-5 not-prose overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/4">
              {lang === 'en' ? 'Category' : 'Категория'}
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/2">
              {lang === 'en' ? 'Examples' : 'Примери'}
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/4">
              {lang === 'en' ? 'Legal Basis' : 'Правно основание'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800 align-top">{row.category}</td>
              <td className="px-4 py-3 text-gray-600 align-top leading-relaxed">{row.examples}</td>
              <td className="px-4 py-3 text-gray-600 align-top">{row.basis}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProcessorsTable({ lang }: { lang: Lang }) {
  const rows = lang === 'en' ? [
    { name: 'Supabase', purpose: 'Database infrastructure', location: 'EU (Frankfurt)', link: 'supabase.com/privacy' },
    { name: 'Stripe', purpose: 'Payment processing', location: 'EU/US (SCCs)', link: 'stripe.com/privacy' },
    { name: 'Netlify', purpose: 'Hosting infrastructure', location: 'EU/US (SCCs)', link: 'netlify.com/privacy' },
    { name: 'Email provider', purpose: 'Transactional emails only', location: 'EU', link: '' },
  ] : [
    { name: 'Supabase', purpose: 'Инфраструктура на база данни', location: 'ЕС (Франкфурт)', link: 'supabase.com/privacy' },
    { name: 'Stripe', purpose: 'Обработка на плащания', location: 'ЕС/САЩ (SCCs)', link: 'stripe.com/privacy' },
    { name: 'Netlify', purpose: 'Хостинг инфраструктура', location: 'ЕС/САЩ (SCCs)', link: 'netlify.com/privacy' },
    { name: 'Доставчик на имейл', purpose: 'Само транзакционни имейли', location: 'ЕС', link: '' },
  ];

  return (
    <div className="my-5 not-prose overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-700">{lang === 'en' ? 'Processor' : 'Обработващ'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">{lang === 'en' ? 'Purpose' : 'Цел'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">{lang === 'en' ? 'Location' : 'Местоположение'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">{lang === 'en' ? 'Privacy Policy' : 'Политика за поверителност'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
              <td className="px-4 py-3 text-gray-600">{row.purpose}</td>
              <td className="px-4 py-3 text-gray-600">{row.location}</td>
              <td className="px-4 py-3">
                {row.link ? (
                  <a
                    href={`https://${row.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
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

function RightsGrid({ lang }: { lang: Lang }) {
  const rights = lang === 'en' ? [
    { icon: Eye, title: 'Access (Art. 15)', desc: 'Obtain a copy of your personal data we hold.' },
    { icon: Shield, title: 'Rectification (Art. 16)', desc: 'Correct inaccurate or incomplete data.' },
    { icon: Shield, title: 'Erasure (Art. 17)', desc: '"Right to be forgotten" — request deletion.' },
    { icon: Lock, title: 'Restriction (Art. 18)', desc: 'Limit how we process your data.' },
    { icon: Database, title: 'Portability (Art. 20)', desc: 'Receive your data in a machine-readable format.' },
    { icon: Users, title: 'Object (Art. 21)', desc: 'Object to processing based on legitimate interests.' },
  ] : [
    { icon: Eye, title: 'Достъп (чл. 15)', desc: 'Получете копие на личните данни, които съхраняваме.' },
    { icon: Shield, title: 'Коригиране (чл. 16)', desc: 'Поправете неточни или непълни данни.' },
    { icon: Shield, title: 'Изтриване (чл. 17)', desc: '"Право да бъдете забравени" — поискайте изтриване.' },
    { icon: Lock, title: 'Ограничаване (чл. 18)', desc: 'Ограничете начина, по който обработваме вашите данни.' },
    { icon: Database, title: 'Преносимост (чл. 20)', desc: 'Получете данните си в машинно четим формат.' },
    { icon: Users, title: 'Възражение (чл. 21)', desc: 'Възразете срещу обработка въз основа на легитимен интерес.' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5 not-prose">
      {rights.map((r, i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <r.icon className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{r.title}</p>
            <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{r.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentEN() {
  return (
    <div className="prose prose-gray prose-base max-w-none">
      <section id="who-we-are">
        <h2>1. Who We Are</h2>
        <p>
          <strong>Soft Care Concept EOOD</strong> operates StayWise Software at{' '}
          <a href={`https://${COMPANY.website}`} target="_blank" rel="noopener noreferrer">
            {COMPANY.website}
          </a>
          . We are a company registered in Bulgaria providing a cloud-based Property Management
          System (PMS) to hotels and hospitality businesses.
        </p>
        <p>
          For data protection queries, contact our Data Controller representative at:{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </p>
        <CompanyCard lang="en" />
      </section>

      <section id="data-collected">
        <h2>2. What Data We Collect</h2>
        <p>We collect and process two categories of data:</p>
        <DataTable lang="en" />
        <ProcessorNotice lang="en" />
      </section>

      <section id="legal-basis">
        <h2>3. Legal Basis for Processing (GDPR Article 6)</h2>
        <ul>
          <li>
            <strong>Contract performance</strong> — processing your subscription data to deliver
            the service (Art. 6(1)(b))
          </li>
          <li>
            <strong>Legal obligation</strong> — invoicing and tax records (Art. 6(1)(c))
          </li>
          <li>
            <strong>Legitimate interests</strong> — security logs, abuse prevention
            (Art. 6(1)(f))
          </li>
          <li>
            <strong>Consent</strong> — analytics cookies, marketing emails (Art. 6(1)(a))
          </li>
        </ul>
      </section>

      <section id="how-we-use">
        <h2>4. How We Use Your Data</h2>
        <ul>
          <li>Providing and improving StayWise services</li>
          <li>Sending service emails (invoices, downtime notices, security alerts)</li>
          <li>Customer support</li>
          <li>Legal compliance (tax records, regulatory requirements)</li>
        </ul>
        <NoSellNotice lang="en" />
      </section>

      <section id="data-sharing">
        <h2>5. Data Sharing</h2>
        <p>
          We share data only with the following sub-processors. All processors are bound by
          GDPR-compliant Data Processing Agreements.
        </p>
        <ProcessorsTable lang="en" />
        <p>
          We do not share personal data with any other third parties unless required by law or
          court order.
        </p>
      </section>

      <section id="retention">
        <h2>6. Data Retention</h2>
        <ul>
          <li>
            <strong>Active account data:</strong> retained while subscription is active
          </li>
          <li>
            <strong>After cancellation:</strong> 30 days available for data export, then
            permanently deleted
          </li>
          <li>
            <strong>Invoice and billing records:</strong> 5 years (Bulgarian accounting and
            tax law requirement)
          </li>
          <li>
            <strong>Backup retention:</strong> 30 days rolling
          </li>
        </ul>
      </section>

      <section id="your-rights">
        <h2>7. Your Rights under GDPR</h2>
        <p>You have the following rights regarding your personal data:</p>
        <RightsGrid lang="en" />
        <p>
          You also have the right to lodge a complaint with your local supervisory authority.
        </p>
        <p>
          <strong>To exercise your rights:</strong>{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          <br />
          <strong>Response time:</strong> within 30 days
        </p>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 my-4 not-prose">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-gray-900">Bulgarian Supervisory Authority</p>
              <p>Комисия за защита на личните данни (КЗЛД)</p>
              <p>
                <a
                  href="https://www.cpdp.bg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  www.cpdp.bg
                </a>
                {' · '}
                <a href="mailto:kzld@cpdp.bg" className="text-blue-600 hover:underline">
                  kzld@cpdp.bg
                </a>
                {' · '}
                +359 2 915 3 518
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="cookies">
        <h2>8. Cookies</h2>
        <p>We use the following types of cookies:</p>
        <ul>
          <li>
            <strong>Necessary cookies:</strong> session authentication, CSRF protection,
            language and UI preferences. These cannot be disabled as they are essential for
            the service to function.
          </li>
          <li>
            <strong>Analytics cookies:</strong> used only with your explicit consent to
            understand how the product is used.
          </li>
        </ul>
        <p>
          You can manage your cookie preferences at any time using the "Manage cookie
          preferences" option in our cookie consent banner.
        </p>
      </section>

      <section id="security">
        <h2>9. Security</h2>
        <ul>
          <li>
            <strong>In transit:</strong> all data encrypted using TLS 1.2 or higher
          </li>
          <li>
            <strong>At rest:</strong> database encrypted using AES-256
          </li>
          <li>
            <strong>Row-level security:</strong> each hotel account can only access its own
            data — enforced at the database level
          </li>
          <li>
            <strong>Infrastructure:</strong> Supabase hosted in EU region (Frankfurt)
          </li>
          <li>
            <strong>Reviews:</strong> regular internal security audits
          </li>
        </ul>
      </section>

      <section id="children">
        <h2>10. Children</h2>
        <p>
          StayWise is a B2B service intended for hotel operators and hospitality businesses. It
          is not directed at, and we do not knowingly collect personal data from, children under
          the age of 16.
        </p>
      </section>

      <section id="changes">
        <h2>11. Changes to This Policy</h2>
        <p>
          We will notify registered account holders by email at least 30 days before making
          material changes to this Privacy Policy. Minor clarifications may be made without
          notice. The "last updated" date at the top of this page reflects the most recent
          revision.
        </p>
      </section>

      <section id="contact">
        <h2>12. Contact</h2>
        <p>
          For any privacy-related questions or requests, please contact us:
        </p>
        <CompanyCard lang="en" />
        <p>
          For a full list of your rights as a data subject, see{' '}
          <a
            href="https://gdpr.eu/privacy-notice/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            gdpr.eu <ExternalLink className="w-3 h-3" />
          </a>
          .
        </p>
      </section>
    </div>
  );
}

function ContentBG() {
  return (
    <div className="prose prose-gray prose-base max-w-none">
      <section id="who-we-are">
        <h2>1. Кои сме ние</h2>
        <p>
          <strong>Софт Кер Концепт ЕООД</strong> управлява StayWise Software на{' '}
          <a href={`https://${COMPANY.website}`} target="_blank" rel="noopener noreferrer">
            {COMPANY.website}
          </a>
          . Ние сме дружество, регистрирано в България, предоставящо облачна система за
          управление на хотел (PMS) на хотели и хотелиерски предприятия.
        </p>
        <p>
          За въпроси относно защита на данните се свържете с нашия представител на
          Администратора на лични данни на:{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </p>
        <CompanyCard lang="bg" />
      </section>

      <section id="data-collected">
        <h2>2. Данни, които събираме</h2>
        <p>Събираме и обработваме две категории данни:</p>
        <DataTable lang="bg" />
        <ProcessorNotice lang="bg" />
      </section>

      <section id="legal-basis">
        <h2>3. Правно основание за обработка (GDPR чл. 6)</h2>
        <ul>
          <li>
            <strong>Изпълнение на договор</strong> — обработка на данните за вашия абонамент
            за предоставяне на услугата (чл. 6(1)(б))
          </li>
          <li>
            <strong>Законово задължение</strong> — фактуриране и данъчни записи (чл. 6(1)(в))
          </li>
          <li>
            <strong>Легитимен интерес</strong> — логове за сигурност, предотвратяване на
            злоупотреби (чл. 6(1)(е))
          </li>
          <li>
            <strong>Съгласие</strong> — аналитични бисквитки, маркетингови имейли (чл. 6(1)(а))
          </li>
        </ul>
      </section>

      <section id="how-we-use">
        <h2>4. Как използваме вашите данни</h2>
        <ul>
          <li>Предоставяне и подобряване на услугите на StayWise</li>
          <li>Изпращане на служебни имейли (фактури, известия за прекъсване, сигнали за сигурност)</li>
          <li>Клиентска поддръжка</li>
          <li>Съответствие с нормативната уредба (данъчни записи, регулаторни изисквания)</li>
        </ul>
        <NoSellNotice lang="bg" />
      </section>

      <section id="data-sharing">
        <h2>5. Споделяне на данни</h2>
        <p>
          Споделяме данни само със следните подизпълнители обработващи данни. Всички
          обработващи са обвързани от Споразумения за обработка на данни, съответстващи на GDPR.
        </p>
        <ProcessorsTable lang="bg" />
        <p>
          Не споделяме лични данни с други трети страни, освен ако не се изисква по закон или
          съдебна заповед.
        </p>
      </section>

      <section id="retention">
        <h2>6. Съхранение на данни</h2>
        <ul>
          <li>
            <strong>Данни за активен акаунт:</strong> съхраняват се докато абонаментът е активен
          </li>
          <li>
            <strong>След анулиране:</strong> 30 дни за експортиране на данни, след което се
            изтриват окончателно
          </li>
          <li>
            <strong>Фактури и записи за фактуриране:</strong> 5 години (изискване на
            българското счетоводно и данъчно законодателство)
          </li>
          <li>
            <strong>Съхранение на резервни копия:</strong> 30 дни циклично
          </li>
        </ul>
      </section>

      <section id="your-rights">
        <h2>7. Вашите права по GDPR</h2>
        <p>Имате следните права по отношение на вашите лични данни:</p>
        <RightsGrid lang="bg" />
        <p>
          Имате също право да подадете жалба до местния надзорен орган.
        </p>
        <p>
          <strong>За упражняване на правата ви:</strong>{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          <br />
          <strong>Срок за отговор:</strong> в рамките на 30 дни
        </p>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 my-4 not-prose">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-gray-900">Български надзорен орган</p>
              <p>Комисия за защита на личните данни (КЗЛД)</p>
              <p>
                <a
                  href="https://www.cpdp.bg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  www.cpdp.bg
                </a>
                {' · '}
                <a href="mailto:kzld@cpdp.bg" className="text-blue-600 hover:underline">
                  kzld@cpdp.bg
                </a>
                {' · '}
                +359 2 915 3 518
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="cookies">
        <h2>8. Бисквитки</h2>
        <p>Използваме следните видове бисквитки:</p>
        <ul>
          <li>
            <strong>Необходими бисквитки:</strong> удостоверяване на сесия, CSRF защита,
            езикови и UI предпочитания. Те не могат да бъдат деактивирани, тъй като са
            от съществено значение за функционирането на услугата.
          </li>
          <li>
            <strong>Аналитични бисквитки:</strong> използват се само с ваше изрично съгласие
            за разбиране как се използва продуктът.
          </li>
        </ul>
        <p>
          Можете да управлявате предпочитанията си за бисквитки по всяко време, като използвате
          опцията "Управление на предпочитания за бисквитки" в нашия банер за съгласие с
          бисквитки.
        </p>
      </section>

      <section id="security">
        <h2>9. Сигурност</h2>
        <ul>
          <li>
            <strong>При пренос:</strong> всички данни са криптирани с TLS 1.2 или по-висока версия
          </li>
          <li>
            <strong>В покой:</strong> базата данни е криптирана с AES-256
          </li>
          <li>
            <strong>Сигурност на ниво ред:</strong> всеки хотелски акаунт може да достъпва само
            своите данни — наложено на ниво база данни
          </li>
          <li>
            <strong>Инфраструктура:</strong> Supabase, хостван в ЕС регион (Франкфурт)
          </li>
          <li>
            <strong>Прегледи:</strong> редовни вътрешни одити на сигурността
          </li>
        </ul>
      </section>

      <section id="children">
        <h2>10. Деца</h2>
        <p>
          StayWise е B2B услуга, предназначена за хотелиери и хотелиерски предприятия. Тя не е
          насочена към деца под 16-годишна възраст и ние не събираме съзнателно лични данни от
          тях.
        </p>
      </section>

      <section id="changes">
        <h2>11. Промени в тази политика</h2>
        <p>
          Ще уведомим регистрираните притежатели на акаунти по имейл поне 30 дни преди извършване
          на съществени промени в тази Политика за поверителност. Незначителни уточнения могат
          да бъдат направени без предизвестие. Датата "последна актуализация" в горната част на
          тази страница отразява най-скорошната редакция.
        </p>
      </section>

      <section id="contact">
        <h2>12. Контакт</h2>
        <p>
          За въпроси или искания, свързани с поверителността, моля свържете се с нас:
        </p>
        <CompanyCard lang="bg" />
        <p>
          За пълен списък на правата ви като субект на данни вижте{' '}
          <a
            href="https://gdpr.eu/privacy-notice/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            gdpr.eu <ExternalLink className="w-3 h-3" />
          </a>
          .
        </p>
      </section>
    </div>
  );
}

export default function PrivacyPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [activeSection, setActiveSection] = useState<string>('who-we-are');
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
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
              {lang === 'en' ? 'Privacy Policy' : 'Политика за поверителност'}
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

              <div className="mt-6 p-3 rounded-xl border border-gray-200 bg-white">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  {lang === 'en' ? 'Related' : 'Свързани'}
                </p>
                <Link
                  to="/terms"
                  className="block text-xs text-blue-600 hover:underline py-1"
                >
                  {lang === 'en' ? 'Terms of Service' : 'Общи условия'}
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0" ref={contentRef}>
            {/* Page header */}
            <div className="mb-10 pb-8 border-b border-gray-200">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700 mb-4">
                <Lock className="w-3.5 h-3.5" />
                {lang === 'en' ? 'Legal Document' : 'Правен документ'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                {lang === 'en' ? 'Privacy Policy' : 'Политика за поверителност'}
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
                  <strong className="text-gray-700">GDPR</strong>{' '}
                  {lang === 'en' ? 'Compliant' : 'Съответствие'}
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
                <Link to="/terms" className="text-blue-600 hover:underline">
                  {lang === 'en' ? 'Terms of Service' : 'Общи условия'}
                </Link>
                <Link to="/privacy" className="text-blue-600 hover:underline">
                  {lang === 'en' ? 'Privacy Policy' : 'Политика за поверителност'}
                </Link>
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
