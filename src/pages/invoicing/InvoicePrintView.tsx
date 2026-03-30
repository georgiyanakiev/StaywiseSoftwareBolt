import { Printer, X } from 'lucide-react';
import { formatDate, formatCurrency } from '../../lib/utils';

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  guest_name: string;
  guest_email: string;
  guest_address: string;
  guest_vat_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  notes: string;
  lines?: InvoiceLine[];
}

interface Hotel {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  tax_rate: number;
  currency: string;
}

interface Props {
  invoice: Invoice;
  hotel: Hotel;
  onClose: () => void;
}

export default function InvoicePrintView({ invoice, hotel, onClose }: Props) {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h2 className="text-white font-semibold">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Printer className="w-4 h-4" /> Print / Download PDF
            </button>
            <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8 print:shadow-none print:rounded-none" id="invoice-print">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SW</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{hotel.name}</p>
                  <p className="text-gray-500 text-sm">{hotel.address}, {hotel.city}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">{hotel.phone}</p>
              <p className="text-sm text-gray-500">{hotel.email}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-gray-900 tracking-tight">INVOICE</p>
              <p className="text-lg font-bold text-blue-700 mt-1 font-mono">{invoice.invoice_number}</p>
              <div className="mt-3 space-y-0.5 text-sm text-gray-600">
                <p>Issue date: <span className="font-medium text-gray-900">{formatDate(invoice.issue_date)}</span></p>
                <p>Due date: <span className="font-medium text-gray-900">{formatDate(invoice.due_date)}</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 p-5 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-semibold text-gray-900">{invoice.guest_name}</p>
              {invoice.guest_email && <p className="text-sm text-gray-600">{invoice.guest_email}</p>}
              {invoice.guest_address && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{invoice.guest_address}</p>}
              {invoice.guest_vat_number && <p className="text-sm text-gray-500 mt-1">VAT: {invoice.guest_vat_number}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {invoice.status === 'paid' ? 'PAID' : invoice.status === 'overdue' ? 'OVERDUE' : 'UNPAID'}
              </span>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-center py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Qty</th>
                <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Unit Price</th>
                <th className="text-center py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Tax %</th>
                <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines ?? []).map((line, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 text-gray-800">{line.description}</td>
                  <td className="py-3 text-center text-gray-700">{line.quantity}</td>
                  <td className="py-3 text-right text-gray-700">{formatCurrency(line.unit_price)}</td>
                  <td className="py-3 text-center text-gray-500">{line.tax_rate}%</td>
                  <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(line.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span>
                <span>{formatCurrency(Number(invoice.tax_amount))}</span>
              </div>
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(Number(invoice.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 border-t-2 border-gray-200 pt-2">
                <span>Total Due</span>
                <span>{formatCurrency(Number(invoice.total_amount))}</span>
              </div>
              {Number(invoice.paid_amount) > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Amount Paid</span>
                  <span>{formatCurrency(Number(invoice.paid_amount))}</span>
                </div>
              )}
            </div>
          </div>

          {invoice.notes && (
            <div className="border-t border-gray-200 pt-5 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes &amp; Payment Instructions</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-5 text-center">
            <p className="text-xs text-gray-400">Thank you for staying with {hotel.name} · {hotel.address}, {hotel.city}, {hotel.country}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
