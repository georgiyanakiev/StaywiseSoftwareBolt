import { format, parseISO, differenceInDays, isValid } from 'date-fns';

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
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

export function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SW-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
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
