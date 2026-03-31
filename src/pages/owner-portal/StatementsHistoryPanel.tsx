import { useState, useEffect, useCallback } from 'react';
import { FileText, Printer, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type { OwnerStatement, PropertyOwner } from './types';

interface StatementRow extends OwnerStatement {
  owner?: PropertyOwner;
}

export default function StatementsHistoryPanel() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const [{ data: stmtData }, { data: ownerData }] = await Promise.all([
        supabase.from('owner_statements').select('*').eq('hotel_id', currentHotel.id).order('created_at', { ascending: false }),
        supabase.from('property_owners').select('*').eq('hotel_id', currentHotel.id),
      ]);

      const owners = (ownerData ?? []) as PropertyOwner[];
      const enriched: StatementRow[] = ((stmtData ?? []) as OwnerStatement[]).map(s => ({
        ...s,
        owner: owners.find(o => o.id === s.owner_id),
      }));
      setRows(enriched);
    } finally {
      setLoading(false);
    }
  }, [currentHotel]);

  useEffect(() => { load(); }, [load]);

  const markPaid = async (id: string) => {
    await supabase.from('owner_statements').update({ status: 'paid' }).eq('id', id);
    toast('success', 'Statement marked as paid');
    load();
  };

  const printStatement = (stmt: StatementRow) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
      <head>
        <title>Statement ${formatDate(stmt.period_start, 'MMM yyyy')} — ${stmt.owner?.full_name ?? ''}</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; color: #111; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .sub { color: #666; font-size: 14px; margin-bottom: 32px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px; }
          td:last-child { text-align: right; }
          .total td { font-weight: 700; font-size: 16px; border-top: 2px solid #111; border-bottom: none; }
          .meta { margin-top: 24px; font-size: 13px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Owner Statement</h1>
        <div class="sub">
          ${stmt.owner?.full_name ?? ''} · ${stmt.owner?.company_name ?? ''}<br/>
          Period: ${formatDate(stmt.period_start)} – ${formatDate(stmt.period_end)}
        </div>
        <table>
          <tr><td>Gross Revenue</td><td>${formatCurrency(stmt.gross_revenue)}</td></tr>
          <tr><td>Management Fee (${stmt.owner?.commission_rate ?? 0}%)</td><td>−${formatCurrency(stmt.management_fee)}</td></tr>
          <tr><td>Expenses</td><td>−${formatCurrency(stmt.expenses)}</td></tr>
          <tr class="total"><td>Net Payout</td><td>${formatCurrency(stmt.net_payout)}</td></tr>
        </table>
        <div class="meta">
          Bookings: ${stmt.booking_count} · Occupancy: ${stmt.occupancy_rate.toFixed(1)}% · Avg Daily Rate: ${formatCurrency(stmt.avg_daily_rate)}<br/>
          ${stmt.notes ? `Notes: ${stmt.notes}` : ''}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-emerald-100 text-emerald-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  if (loading) return <div className="flex items-center justify-center h-40"><LoadingSpinner size="md" /></div>;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-700">No statements yet</p>
        <p className="text-sm text-gray-500">Generate a statement from the Owners tab</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="table-header">Owner</th>
            <th className="table-header">Period</th>
            <th className="table-header">Revenue</th>
            <th className="table-header hidden sm:table-cell">Net Payout</th>
            <th className="table-header">Status</th>
            <th className="table-header text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(stmt => (
            <tr key={stmt.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="table-cell">
                <p className="text-sm font-medium text-gray-900">{stmt.owner?.full_name ?? '—'}</p>
                <p className="text-xs text-gray-500">{stmt.owner?.company_name || stmt.owner?.email}</p>
              </td>
              <td className="table-cell text-sm text-gray-700">
                {formatDate(stmt.period_start, 'MMM d')} – {formatDate(stmt.period_end, 'MMM d, yyyy')}
              </td>
              <td className="table-cell text-sm font-medium text-gray-900">{formatCurrency(stmt.gross_revenue)}</td>
              <td className="table-cell hidden sm:table-cell text-sm font-semibold text-emerald-700">{formatCurrency(stmt.net_payout)}</td>
              <td className="table-cell">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(stmt.status)}`}>
                  {stmt.status}
                </span>
              </td>
              <td className="table-cell text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => printStatement(stmt)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Print / Download"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  {stmt.status !== 'paid' && (
                    <button
                      onClick={() => markPaid(stmt.id)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Mark as paid"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
