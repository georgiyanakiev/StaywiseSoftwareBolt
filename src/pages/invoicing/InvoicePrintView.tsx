import { useState, useEffect } from 'react';
import { Printer, X, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate, formatCurrency } from '../../lib/utils';
import type { Invoice, InvoiceLine } from './InvoicingPage';

interface Hotel {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
}

interface InvoiceSettings {
  hotel_name: string;
  hotel_address: string;
  hotel_vat_number: string;
  hotel_registration_number: string;
  hotel_email: string;
  hotel_phone: string;
  hotel_website: string;
  footer_text: string;
  bank_name: string;
  bank_iban: string;
  bank_swift: string;
}

interface Props {
  invoice: Invoice;
  hotel: Hotel;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  invoice: 'INVOICE',
  receipt: 'RECEIPT',
  credit_note: 'CREDIT NOTE',
  proforma: 'PRO-FORMA INVOICE',
};

export default function InvoicePrintView({ invoice, hotel, onClose }: Props) {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);

  useEffect(() => {
    supabase.from('invoice_settings').select('*').eq('hotel_id', hotel.id).maybeSingle().then(({ data }) => {
      setSettings(data as InvoiceSettings | null);
    });
  }, [hotel.id]);

  const hotelName = settings?.hotel_name || hotel.name;
  const hotelAddress = settings?.hotel_address || hotel.address || '';
  const hotelCity = hotel.city || '';
  const hotelCountry = hotel.country || '';

  const lines: InvoiceLine[] = invoice.lines ?? [];
  const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/70 flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-4">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h2 className="text-white font-semibold text-sm">Invoice Preview — {invoice.invoice_number}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#172e4c] transition-colors">
              <Printer className="w-4 h-4" /> Print / Download PDF
            </button>
            <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-2xl print:shadow-none print:rounded-none" id="invoice-print">
          <div className="p-10">
            <div className="flex items-start justify-between mb-10">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-xl leading-tight">{hotelName}</p>
                    {(hotelAddress || hotelCity) && (
                      <p className="text-gray-500 text-sm">{[hotelAddress, hotelCity, hotelCountry].filter(Boolean).join(', ')}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-0.5 text-sm text-gray-500">
                  {settings?.hotel_phone && <p>{settings.hotel_phone}</p>}
                  {settings?.hotel_email && <p>{settings.hotel_email}</p>}
                  {settings?.hotel_website && <p>{settings.hotel_website}</p>}
                  {settings?.hotel_vat_number && <p>VAT: {settings.hotel_vat_number}</p>}
                  {settings?.hotel_registration_number && <p>Reg: {settings.hotel_registration_number}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-1">
                  {TYPE_LABELS[invoice.type] ?? 'INVOICE'}
                </p>
                <p className="text-xl font-bold text-blue-700 font-mono">{invoice.invoice_number}</p>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-end gap-8">
                    <span className="text-gray-400">Issue Date</span>
                    <span className="font-medium text-gray-900">{formatDate(invoice.issue_date)}</span>
                  </div>
                  {invoice.due_date && (
                    <div className="flex justify-end gap-8">
                      <span className="text-gray-400">Due Date</span>
                      <span className="font-medium text-gray-900">{formatDate(invoice.due_date)}</span>
                    </div>
                  )}
                  {invoice.service_date_from && (
                    <div className="flex justify-end gap-8">
                      <span className="text-gray-400">Service Period</span>
                      <span className="font-medium text-gray-900">{formatDate(invoice.service_date_from)} – {formatDate(invoice.service_date_to)}</span>
                    </div>
                  )}
                  {invoice.currency && (
                    <div className="flex justify-end gap-8">
                      <span className="text-gray-400">Currency</span>
                      <span className="font-medium text-gray-900">{invoice.currency}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 p-5 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
                <p className="font-semibold text-gray-900">{invoice.guest_name}</p>
                {invoice.guest_email && <p className="text-sm text-gray-500 mt-0.5">{invoice.guest_email}</p>}
                {(invoice.guest_address || invoice.guest_city) && (
                  <p className="text-sm text-gray-500 mt-1">
                    {[invoice.guest_address, invoice.guest_city, invoice.guest_country].filter(Boolean).join(', ')}
                  </p>
                )}
                {invoice.guest_vat_number && <p className="text-sm text-gray-500 mt-1">VAT: {invoice.guest_vat_number}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Payment Status</p>
                <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${
                  invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                  invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  invoice.status === 'void' ? 'bg-gray-100 text-gray-500' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {invoice.status === 'paid' ? 'PAID IN FULL' : invoice.status === 'overdue' ? 'OVERDUE' : invoice.status === 'void' ? 'VOID' : 'PENDING PAYMENT'}
                </span>
                {invoice.booking_reference && (
                  <div className="mt-3 text-sm text-gray-500">
                    Booking ref: <span className="font-mono font-semibold text-gray-700">{invoice.booking_reference}</span>
                  </div>
                )}
              </div>
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-center py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">Qty</th>
                  <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Unit</th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Unit Price</th>
                  <th className="text-center py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Tax %</th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={line.id ?? i} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="py-3 text-gray-800 text-sm">{line.description}</td>
                    <td className="py-3 text-center text-gray-700 text-sm">{line.quantity}</td>
                    <td className="py-3 text-gray-500 text-xs">{line.unit}</td>
                    <td className="py-3 text-right text-gray-700 text-sm">{formatCurrency(line.unit_price)}</td>
                    <td className="py-3 text-center text-gray-500 text-sm">{line.tax_rate}%</td>
                    <td className="py-3 text-right font-medium text-gray-900 text-sm">{formatCurrency(line.line_total)}</td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-gray-400 text-sm">No line items</td></tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-between gap-8 mb-8">
              <div className="flex-1" />
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                {Number(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>−{formatCurrency(Number(invoice.discount_amount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({invoice.tax_rate ?? 20}%)</span>
                  <span>{formatCurrency(Number(invoice.tax_amount))}</span>
                </div>
                <div className="flex justify-between font-black text-xl text-gray-900 border-t-2 border-gray-200 pt-3 mt-1">
                  <span>Total</span>
                  <span className="text-blue-800">{formatCurrency(Number(invoice.total_amount))}</span>
                </div>
                {Number(invoice.paid_amount) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Amount Paid</span>
                      <span>−{formatCurrency(Number(invoice.paid_amount))}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-100 pt-1.5">
                      <span>Balance Due</span>
                      <span className={balance > 0 ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(balance)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {(settings?.bank_name || settings?.bank_iban) && (
              <div className="border border-blue-100 bg-blue-50 rounded-xl p-5 mb-6">
                <p className="text-xs font-semibold text-[#1e3a5f] uppercase tracking-widest mb-3">Payment Information</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                  {settings.bank_name && <><span className="text-gray-500">Bank</span><span className="font-medium text-gray-800">{settings.bank_name}</span></>}
                  {settings.bank_iban && <><span className="text-gray-500">IBAN</span><span className="font-mono font-medium text-gray-800">{settings.bank_iban}</span></>}
                  {settings.bank_swift && <><span className="text-gray-500">SWIFT / BIC</span><span className="font-mono font-medium text-gray-800">{settings.bank_swift}</span></>}
                  <span className="text-gray-500">Reference</span>
                  <span className="font-mono font-semibold text-blue-700">{invoice.invoice_number}</span>
                </div>
              </div>
            )}

            {invoice.notes && (
              <div className="border-t border-gray-100 pt-5 mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            <div className="border-t border-gray-100 pt-5 text-center space-y-1">
              {settings?.footer_text && (
                <p className="text-xs text-gray-500">{settings.footer_text}</p>
              )}
              <p className="text-xs text-gray-300">
                {hotelName} · {[hotelAddress, hotelCity, hotelCountry].filter(Boolean).join(', ')}
                {settings?.hotel_email ? ` · ${settings.hotel_email}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; border-radius: 0; }
        }
      `}</style>
    </div>
  );
}
