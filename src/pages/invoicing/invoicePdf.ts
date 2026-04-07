import type { Invoice, InvoiceLine } from './InvoicingPage';

interface InvoiceSettings {
  hotel_name?: string;
  hotel_address?: string;
  hotel_vat_number?: string;
  hotel_registration_number?: string;
  hotel_email?: string;
  hotel_phone?: string;
  hotel_website?: string;
  footer_text?: string;
  bank_name?: string;
  bank_iban?: string;
  bank_swift?: string;
}

interface Hotel {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

const TYPE_LABELS: Record<string, string> = {
  invoice: 'INVOICE',
  receipt: 'RECEIPT',
  credit_note: 'CREDIT NOTE',
  proforma: 'PRO-FORMA INVOICE',
};

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lineRows(lines: InvoiceLine[]): string {
  if (lines.length === 0) {
    return `<tr><td colspan="6" style="padding:16px;text-align:center;color:#9ca3af;font-size:13px;">No line items</td></tr>`;
  }
  return lines.map((l, i) => `
    <tr style="background:${i % 2 === 1 ? '#f9fafb' : '#ffffff'};">
      <td style="padding:10px 8px;font-size:13px;color:#1f2937;border-bottom:1px solid #f3f4f6;">${esc(l.description)}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${l.quantity}</td>
      <td style="padding:10px 8px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${esc(l.unit)}</td>
      <td style="padding:10px 8px;text-align:right;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${fmt(l.unit_price)}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${l.tax_rate}%</td>
      <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${fmt(l.line_total)}</td>
    </tr>`).join('');
}

function statusBlock(status: string): string {
  const map: Record<string, [string, string]> = {
    paid:           ['#d1fae5', '#065f46'],
    overdue:        ['#fee2e2', '#991b1b'],
    void:           ['#f3f4f6', '#6b7280'],
    partially_paid: ['#fef3c7', '#92400e'],
  };
  const [bg, color] = map[status] ?? ['#fef3c7', '#92400e'];
  const label =
    status === 'paid'           ? 'PAID IN FULL' :
    status === 'overdue'        ? 'OVERDUE' :
    status === 'void'           ? 'VOID' :
    status === 'partially_paid' ? 'PARTIALLY PAID' : 'PENDING PAYMENT';
  return `<span style="display:inline-block;padding:6px 14px;border-radius:8px;font-size:13px;font-weight:700;background:${bg};color:${color};">${label}</span>`;
}

export function buildInvoiceHtml(invoice: Invoice, hotel: Hotel, settings: InvoiceSettings | null): string {
  const hotelName = settings?.hotel_name || hotel.name;
  const hotelAddress = settings?.hotel_address || hotel.address || '';
  const hotelCity = hotel.city || '';
  const hotelCountry = hotel.country || '';
  const addressLine = [hotelAddress, hotelCity, hotelCountry].filter(Boolean).join(', ');

  const lines: InvoiceLine[] = invoice.lines ?? [];
  const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
  const typeLabel = TYPE_LABELS[invoice.type] ?? 'INVOICE';

  const bankBlock = (settings?.bank_name || settings?.bank_iban) ? `
    <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px 0;">Payment Information</p>
      <table style="width:100%;border-collapse:collapse;">
        ${settings?.bank_name ? `<tr><td style="font-size:13px;color:#6b7280;padding:3px 0;width:130px;">Bank</td><td style="font-size:13px;font-weight:600;color:#1f2937;">${esc(settings.bank_name)}</td></tr>` : ''}
        ${settings?.bank_iban ? `<tr><td style="font-size:13px;color:#6b7280;padding:3px 0;">IBAN</td><td style="font-size:13px;font-family:monospace;font-weight:600;color:#1f2937;">${esc(settings.bank_iban)}</td></tr>` : ''}
        ${settings?.bank_swift ? `<tr><td style="font-size:13px;color:#6b7280;padding:3px 0;">SWIFT / BIC</td><td style="font-size:13px;font-family:monospace;font-weight:600;color:#1f2937;">${esc(settings.bank_swift)}</td></tr>` : ''}
        <tr><td style="font-size:13px;color:#6b7280;padding:3px 0;">Reference</td><td style="font-size:13px;font-family:monospace;font-weight:700;color:#1e3a5f;">${esc(invoice.invoice_number)}</td></tr>
      </table>
    </div>` : '';

  const notesBlock = invoice.notes ? `
    <div style="border-top:1px solid #f3f4f6;padding-top:20px;margin-bottom:20px;">
      <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px 0;">Notes</p>
      <p style="font-size:13px;color:#4b5563;white-space:pre-line;margin:0;">${esc(invoice.notes)}</p>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(typeLabel)} ${esc(invoice.invoice_number)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: 794px; margin: 0 auto; background: #fff; padding: 48px; }
    @media print {
      body { background: #fff; }
      .page { padding: 32px; max-width: 100%; }
      @page { size: A4; margin: 0; }
    }
    table { border-collapse: collapse; width: 100%; }
    th { text-align: left; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:40px;">
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:48px;height:48px;background:#1e3a5f;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div>
          <p style="font-weight:800;font-size:20px;color:#111827;line-height:1.2;">${esc(hotelName)}</p>
          ${addressLine ? `<p style="font-size:13px;color:#6b7280;margin-top:2px;">${esc(addressLine)}</p>` : ''}
        </div>
      </div>
      <div style="font-size:13px;color:#6b7280;line-height:1.8;">
        ${settings?.hotel_phone ? `<div>${esc(settings.hotel_phone)}</div>` : ''}
        ${settings?.hotel_email ? `<div>${esc(settings.hotel_email)}</div>` : ''}
        ${settings?.hotel_website ? `<div>${esc(settings.hotel_website)}</div>` : ''}
        ${settings?.hotel_vat_number ? `<div>VAT: ${esc(settings.hotel_vat_number)}</div>` : ''}
        ${settings?.hotel_registration_number ? `<div>Reg: ${esc(settings.hotel_registration_number)}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <p style="font-size:36px;font-weight:900;color:#111827;letter-spacing:-1px;line-height:1;">${typeLabel}</p>
      <p style="font-size:20px;font-weight:700;color:#1d4ed8;font-family:monospace;margin-top:4px;">${esc(invoice.invoice_number)}</p>
      <div style="margin-top:16px;font-size:13px;line-height:2;">
        <div style="display:flex;justify-content:flex-end;gap:32px;">
          <span style="color:#9ca3af;">Issue Date</span>
          <span style="font-weight:600;color:#111827;">${fmtDate(invoice.issue_date)}</span>
        </div>
        ${invoice.due_date ? `
        <div style="display:flex;justify-content:flex-end;gap:32px;">
          <span style="color:#9ca3af;">Due Date</span>
          <span style="font-weight:600;color:#111827;">${fmtDate(invoice.due_date)}</span>
        </div>` : ''}
        ${invoice.currency ? `
        <div style="display:flex;justify-content:flex-end;gap:32px;">
          <span style="color:#9ca3af;">Currency</span>
          <span style="font-weight:600;color:#111827;">${esc(invoice.currency)}</span>
        </div>` : ''}
      </div>
    </div>
  </div>

  <!-- Bill To / Status -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:32px;">
    <div>
      <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Bill To</p>
      <p style="font-weight:700;font-size:15px;color:#111827;">${esc(invoice.guest_name)}</p>
      ${invoice.guest_email ? `<p style="font-size:13px;color:#6b7280;margin-top:2px;">${esc(invoice.guest_email)}</p>` : ''}
      ${(invoice.guest_address || invoice.guest_city) ? `<p style="font-size:13px;color:#6b7280;margin-top:4px;">${esc([invoice.guest_address, invoice.guest_city, invoice.guest_country].filter(Boolean).join(', '))}</p>` : ''}
      ${invoice.guest_vat_number ? `<p style="font-size:13px;color:#6b7280;margin-top:4px;">VAT: ${esc(invoice.guest_vat_number)}</p>` : ''}
    </div>
    <div style="text-align:right;">
      <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Payment Status</p>
      ${statusBlock(invoice.status)}
      ${invoice.booking_reference ? `<div style="margin-top:12px;font-size:13px;color:#6b7280;">Booking ref: <span style="font-family:monospace;font-weight:700;color:#374151;">${esc(invoice.booking_reference)}</span></div>` : ''}
    </div>
  </div>

  <!-- Line Items -->
  <table style="margin-bottom:32px;">
    <thead>
      <tr style="border-bottom:2px solid #e5e7eb;">
        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Description</th>
        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:center;width:48px;">Qty</th>
        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:60px;">Unit</th>
        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:right;width:100px;">Unit Price</th>
        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:center;width:64px;">Tax %</th>
        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:right;width:100px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows(lines)}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
    <div style="width:280px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#4b5563;padding:4px 0;">
        <span>Subtotal</span><span>${fmt(Number(invoice.subtotal))}</span>
      </div>
      ${Number(invoice.discount_amount) > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#059669;padding:4px 0;">
        <span>Discount</span><span>−${fmt(Number(invoice.discount_amount))}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#4b5563;padding:4px 0;">
        <span>Tax (${invoice.tax_rate ?? 20}%)</span><span>${fmt(Number(invoice.tax_amount))}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:20px;font-weight:900;color:#111827;border-top:2px solid #e5e7eb;padding-top:12px;margin-top:4px;">
        <span>Total</span><span style="color:#1e3a8a;">${fmt(Number(invoice.total_amount))}</span>
      </div>
      ${Number(invoice.paid_amount) > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#059669;padding:4px 0;margin-top:4px;">
        <span>Amount Paid</span><span>−${fmt(Number(invoice.paid_amount))}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:${balance > 0 ? '#dc2626' : '#059669'};border-top:1px solid #f3f4f6;padding-top:6px;margin-top:2px;">
        <span>Balance Due</span><span>${fmt(balance)}</span>
      </div>` : ''}
    </div>
  </div>

  ${bankBlock}
  ${notesBlock}

  <!-- Footer -->
  <div style="border-top:1px solid #f3f4f6;padding-top:20px;text-align:center;">
    ${settings?.footer_text ? `<p style="font-size:12px;color:#6b7280;margin-bottom:4px;">${esc(settings.footer_text)}</p>` : ''}
    <p style="font-size:11px;color:#d1d5db;">${esc(hotelName)}${addressLine ? ' · ' + esc(addressLine) : ''}${settings?.hotel_email ? ' · ' + esc(settings.hotel_email) : ''}</p>
  </div>

</div>
</body>
</html>`;
}

export function downloadInvoicePdf(invoice: Invoice, hotel: Hotel, settings: InvoiceSettings | null): void {
  const html = buildInvoiceHtml(invoice, hotel, settings);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.document.title = `${TYPE_LABELS[invoice.type] ?? 'Invoice'} ${invoice.invoice_number}`;
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.print();
    }, 250);
  });
  if (win.document.readyState === 'complete') {
    setTimeout(() => win.print(), 250);
  }
}
