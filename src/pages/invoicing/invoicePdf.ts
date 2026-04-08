import { jsPDF } from 'jspdf';
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
  currency?: string;
}

const TYPE_LABELS: Record<string, string> = {
  invoice:    'INVOICE',
  receipt:    'RECEIPT',
  credit_note:'CREDIT NOTE',
  proforma:   'PRO-FORMA INVOICE',
};

function fmtCurrency(n: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'EUR' }).format(n);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function downloadInvoicePdf(invoice: Invoice, hotel: Hotel, settings: InvoiceSettings | null): void {
  const currency = invoice.currency || hotel.currency || 'EUR';
  const fmt = (n: number) => fmtCurrency(n, currency);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 18;
  const contentW = W - margin * 2;
  let y = margin;

  const hotelName = settings?.hotel_name || hotel.name;
  const typeLabel = TYPE_LABELS[invoice.type] ?? 'INVOICE';

  const navy: [number, number, number] = [30, 58, 95];
  const darkText: [number, number, number] = [17, 24, 39];
  const midText: [number, number, number] = [107, 114, 128];
  const lightGray: [number, number, number] = [243, 244, 246];
  const borderGray: [number, number, number] = [229, 231, 235];

  doc.setFillColor(...navy);
  doc.rect(margin, y, 10, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...darkText);
  doc.text(hotelName, margin + 13, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...darkText);
  doc.text(typeLabel, W - margin, y + 5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(29, 78, 216);
  doc.text(invoice.invoice_number, W - margin, y + 11, { align: 'right' });

  y += 14;

  const hotelLines: string[] = [];
  const addr = settings?.hotel_address || hotel.address || '';
  const cityCountry = [hotel.city, hotel.country].filter(Boolean).join(', ');
  if (addr) hotelLines.push(addr);
  if (cityCountry) hotelLines.push(cityCountry);
  if (settings?.hotel_phone) hotelLines.push(settings.hotel_phone);
  if (settings?.hotel_email) hotelLines.push(settings.hotel_email);
  if (settings?.hotel_vat_number) hotelLines.push(`VAT: ${settings.hotel_vat_number}`);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...midText);
  hotelLines.forEach(line => {
    doc.text(line, margin, y);
    y += 4.5;
  });

  const dateBlockY = margin + 14;
  const dateItems: Array<[string, string]> = [
    ['Issue Date', fmtDate(invoice.issue_date)],
    ...(invoice.due_date ? [['Due Date', fmtDate(invoice.due_date)] as [string, string]] : []),
    ['Currency', currency],
  ];
  let dy = dateBlockY;
  dateItems.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...midText);
    doc.text(label, W - margin - 32, dy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(val, W - margin, dy, { align: 'right' });
    dy += 5;
  });

  y = Math.max(y, dy) + 6;

  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentW, 26, 2, 2, 'F');
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...midText);
  doc.text('BILL TO', margin + 4, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkText);
  doc.text(invoice.guest_name || '', margin + 4, y);
  if (invoice.guest_email) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...midText);
    doc.text(invoice.guest_email, margin + 4, y + 4.5);
  }

  const statusMap: Record<string, { label: string; bg: string; fg: string }> = {
    paid:           { label: 'PAID IN FULL',   bg: '#d1fae5', fg: '#065f46' },
    overdue:        { label: 'OVERDUE',         bg: '#fee2e2', fg: '#991b1b' },
    void:           { label: 'VOID',            bg: '#f3f4f6', fg: '#6b7280' },
    partially_paid: { label: 'PARTIALLY PAID',  bg: '#fef3c7', fg: '#92400e' },
  };
  const statusCfg = statusMap[invoice.status] ?? { label: 'PENDING', bg: '#fef3c7', fg: '#92400e' };
  const [sbg0, sbg1, sbg2] = hexToRgb(statusCfg.bg);
  const [sfg0, sfg1, sfg2] = hexToRgb(statusCfg.fg);
  const statusTextX = W - margin - 4;
  const statusLabelWidth = doc.getTextWidth(statusCfg.label) + 10;
  doc.setFillColor(sbg0, sbg1, sbg2);
  doc.roundedRect(statusTextX - statusLabelWidth + 2, y - 8, statusLabelWidth, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(sfg0, sfg1, sfg2);
  doc.text(statusCfg.label, statusTextX - statusLabelWidth / 2 + 2, y - 3.5, { align: 'center' });

  y += 14;

  const colWidths = [contentW - 72, 14, 18, 22, 14, 22];
  const colX = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4],
  ];
  const headers = ['Description', 'Qty', 'Unit', 'Unit Price', 'Tax %', 'Total'];

  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentW, y);
  y += 1.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...midText);
  headers.forEach((h, i) => {
    const align = i >= 3 ? 'right' : i === 1 ? 'center' : 'left';
    const x = align === 'right' ? colX[i] + colWidths[i] - 1 : align === 'center' ? colX[i] + colWidths[i] / 2 : colX[i] + 1;
    doc.text(h, x, y + 3.5, { align });
  });
  y += 6;
  doc.line(margin, y, margin + contentW, y);
  y += 2;

  const lines: InvoiceLine[] = invoice.lines ?? [];
  if (lines.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...midText);
    doc.text('No line items', margin + contentW / 2, y + 5, { align: 'center' });
    y += 12;
  } else {
    lines.forEach((l, idx) => {
      const rowH = 7;
      if (idx % 2 === 1) {
        doc.setFillColor(...lightGray);
        doc.rect(margin, y, contentW, rowH, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...darkText);
      doc.text(l.description || '', colX[0] + 1, y + 4.5, { maxWidth: colWidths[0] - 2 });
      doc.text(String(l.quantity), colX[1] + colWidths[1] / 2, y + 4.5, { align: 'center' });
      doc.setTextColor(...midText);
      doc.text(l.unit || '', colX[2] + 1, y + 4.5);
      doc.setTextColor(...darkText);
      doc.text(fmt(l.unit_price), colX[3] + colWidths[3] - 1, y + 4.5, { align: 'right' });
      doc.setTextColor(...midText);
      doc.text(`${l.tax_rate}%`, colX[4] + colWidths[4] / 2, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkText);
      doc.text(fmt(l.line_total), colX[5] + colWidths[5] - 1, y + 4.5, { align: 'right' });
      y += rowH;
    });
  }

  y += 4;
  doc.setDrawColor(...borderGray);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  const totalsX = W - margin - 60;
  const totalsValX = W - margin;
  const totalsLineH = 5.5;

  const totalsRows: Array<{ label: string; value: string; bold?: boolean; color?: [number, number, number] }> = [
    { label: 'Subtotal', value: fmt(Number(invoice.subtotal)) },
    ...(Number(invoice.discount_amount) > 0 ? [{ label: 'Discount', value: `−${fmt(Number(invoice.discount_amount))}`, color: [5, 150, 105] as [number, number, number] }] : []),
    { label: `Tax (${invoice.tax_rate ?? 20}%)`, value: fmt(Number(invoice.tax_amount)) },
  ];

  totalsRows.forEach(row => {
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...(row.color ?? midText));
    doc.text(row.label, totalsX, y);
    doc.text(row.value, totalsValX, y, { align: 'right' });
    y += totalsLineH;
  });

  y += 2;
  doc.setDrawColor(...borderGray);
  doc.line(totalsX - 4, y, W - margin, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...darkText);
  doc.text('Total', totalsX, y);
  doc.setTextColor(30, 58, 138);
  doc.text(fmt(Number(invoice.total_amount)), totalsValX, y, { align: 'right' });
  y += 6;

  if (Number(invoice.paid_amount) > 0) {
    const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text('Amount Paid', totalsX, y);
    doc.text(`−${fmt(Number(invoice.paid_amount))}`, totalsValX, y, { align: 'right' });
    y += totalsLineH;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(balance > 0 ? 220 : 5, balance > 0 ? 38 : 150, balance > 0 ? 38 : 105);
    doc.text('Balance Due', totalsX, y);
    doc.text(fmt(balance), totalsValX, y, { align: 'right' });
    y += 6;
  }

  if (settings?.bank_name || settings?.bank_iban) {
    y += 4;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    const bankRows = [
      settings?.bank_name  ? `Bank: ${settings.bank_name}` : null,
      settings?.bank_iban  ? `IBAN: ${settings.bank_iban}` : null,
      settings?.bank_swift ? `SWIFT/BIC: ${settings.bank_swift}` : null,
      `Reference: ${invoice.invoice_number}`,
    ].filter(Boolean) as string[];
    const bankH = bankRows.length * 5 + 10;
    doc.roundedRect(margin, y, contentW, bankH, 2, 2, 'FD');
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 95);
    doc.text('PAYMENT INFORMATION', margin + 4, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...midText);
    bankRows.forEach(row => {
      doc.text(row, margin + 4, y);
      y += 5;
    });
    y += 4;
  }

  if (invoice.notes) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...midText);
    doc.text('NOTES', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    const noteLines = doc.splitTextToSize(invoice.notes, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 4;
  }

  const pageH = 297;
  doc.setDrawColor(...borderGray);
  doc.line(margin, pageH - 16, W - margin, pageH - 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...midText);
  const footerParts = [hotelName];
  if (settings?.hotel_email) footerParts.push(settings.hotel_email);
  if (settings?.footer_text) footerParts.push(settings.footer_text);
  doc.text(footerParts.join(' · '), W / 2, pageH - 10, { align: 'center' });

  const filename = `${typeLabel.replace(/\s+/g, '-')}-${invoice.invoice_number}.pdf`;
  doc.save(filename);
}
