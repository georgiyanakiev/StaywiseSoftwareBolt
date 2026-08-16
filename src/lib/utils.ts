import { format, parseISO, differenceInDays, isValid } from 'date-fns';

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCurrencySymbol(currency = 'EUR'): string {
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })
      .formatToParts(0);
    return parts.find(p => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, fmt) : '';
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM d, yyyy h:mm a');
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return differenceInDays(parseISO(checkOut), parseISO(checkIn));
}

function secureRandomInts(count: number): Uint32Array {
  const values = new Uint32Array(count);
  crypto.getRandomValues(values);
  return values;
}

export function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = secureRandomInts(10);
  let code = 'SW-';
  for (let i = 0; i < values.length; i++) {
    code += chars.charAt(values[i] % chars.length);
  }
  return code;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = String(secureRandomInts(1)[0] % 100000000).padStart(8, '0');
  return `INV-${year}${month}-${random}`;
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: 'badge-success',
    clean: 'badge-success',
    completed: 'badge-success',
    paid: 'badge-success',
    confirmed: 'badge-info',
    checked_in: 'badge-info',
    occupied: 'badge-info',
    in_progress: 'badge-warning',
    pending: 'badge-warning',
    partial: 'badge-warning',
    dirty: 'badge-danger',
    cancelled: 'badge-danger',
    overdue: 'badge-danger',
    failed: 'badge-danger',
    refunded: 'badge-info',
    maintenance: 'badge-neutral',
    out_of_service: 'badge-neutral',
    checked_out: 'badge-neutral',
    reported: 'badge-warning',
    draft: 'badge-neutral',
    sent: 'badge-info',
  };
  return colors[status] || 'badge-neutral';
}

export function getStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
}
