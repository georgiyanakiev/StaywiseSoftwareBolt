import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Pencil, BedDouble, FileText, Send, Eye, Building2, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import OwnerFormModal from './OwnerFormModal';
import AssignRoomsModal from './AssignRoomsModal';
import GenerateStatementModal from './GenerateStatementModal';
import StatementsHistoryPanel from './StatementsHistoryPanel';
import type { PropertyOwner, OwnerProperty, OwnerStatement } from './types';

type Tab = 'owners' | 'statements';

interface OwnerRow extends PropertyOwner {
  properties?: OwnerProperty[];
  latest_statement?: OwnerStatement | null;
  this_month_revenue?: number;
  pending_payout?: number;
}

export default function OwnerPortalPage() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('owners');
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PropertyOwner | null>(null);
  const [assignTarget, setAssignTarget] = useState<PropertyOwner | null>(null);
  const [statementTarget, setStatementTarget] = useState<PropertyOwner | null>(null);

  const loadOwners = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const [{ data: ownerData }, { data: propData }, { data: stmtData }] = await Promise.all([
        supabase.from('property_owners').select('*').eq('hotel_id', currentHotel.id).order('full_name'),
        supabase.from('owner_properties').select('*').eq('hotel_id', currentHotel.id),
        supabase.from('owner_statements').select('*').eq('hotel_id', currentHotel.id).order('created_at', { ascending: false }),
      ]);

      const list = (ownerData ?? []) as PropertyOwner[];
      const props = (propData ?? []) as OwnerProperty[];
      const stmts = (stmtData ?? []) as OwnerStatement[];

      const enriched: OwnerRow[] = list.map(owner => {
        const ownerProps = props.filter(p => p.owner_id === owner.id);
        const ownerStmts = stmts.filter(s => s.owner_id === owner.id);
        const latestStmt = ownerStmts[0] ?? null;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const thisMonthStmt = ownerStmts.find(s => s.period_start >= monthStart);

        return {
          ...owner,
          properties: ownerProps,
          latest_statement: latestStmt,
          this_month_revenue: thisMonthStmt?.gross_revenue ?? 0,
          pending_payout: ownerStmts.filter(s => s.status !== 'paid').reduce((sum, s) => sum + s.net_payout, 0),
        };
      });

      setOwners(enriched);
    } finally {
      setLoading(false);
    }
  }, [currentHotel]);

  useEffect(() => { loadOwners(); }, [loadOwners]);

  const sendStatement = async (owner: PropertyOwner) => {
    const { data } = await supabase
      .from('owner_statements')
      .select('id')
      .eq('owner_id', owner.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      toast('warning', 'No draft statements to send');
      return;
    }

    await supabase.from('owner_statements').update({ status: 'sent' }).eq('id', data.id);
    toast('success', `Statement marked as sent to ${owner.full_name}`);
    loadOwners();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Owner Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage property owners and generate financial statements</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/owner-portal/my-portal')}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Eye className="w-4 h-4" />
            Preview Owner View
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Owner
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {([['owners', 'Owners', Users], ['statements', 'Statements History', FileText]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'owners' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-48"><LoadingSpinner size="md" /></div>
          ) : owners.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-6 h-6" />}
              title="No property owners yet"
              description="Add your first property owner to start tracking revenue and generating statements"
              action={<button className="btn-primary" onClick={() => setAddOpen(true)}>Add Owner</button>}
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="table-header">Owner</th>
                    <th className="table-header">Rooms</th>
                    <th className="table-header">Commission</th>
                    <th className="table-header hidden md:table-cell">This Month</th>
                    <th className="table-header hidden md:table-cell">Pending Payout</th>
                    <th className="table-header hidden lg:table-cell">Last Statement</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {owners.map(owner => (
                    <tr key={owner.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-semibold text-teal-700 flex-shrink-0">
                            {owner.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{owner.full_name}</p>
                            <p className="text-xs text-gray-500">{owner.company_name || owner.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                          <BedDouble className="w-3.5 h-3.5 text-gray-400" />
                          {owner.properties?.length ?? 0} room{(owner.properties?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-gray-700">{owner.commission_rate}%</td>
                      <td className="table-cell hidden md:table-cell text-sm font-medium text-gray-900">
                        {formatCurrency(owner.this_month_revenue ?? 0)}
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className={`text-sm font-medium ${(owner.pending_payout ?? 0) > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                          {formatCurrency(owner.pending_payout ?? 0)}
                        </span>
                      </td>
                      <td className="table-cell hidden lg:table-cell text-sm text-gray-500">
                        {owner.latest_statement
                          ? <span>
                              {formatDate(owner.latest_statement.period_start, 'MMM yyyy')}
                              <span className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                owner.latest_statement.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                owner.latest_statement.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {owner.latest_statement.status}
                              </span>
                            </span>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditTarget(owner)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit owner"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAssignTarget(owner)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Assign rooms"
                          >
                            <BedDouble className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setStatementTarget(owner)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Generate statement"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => sendStatement(owner)}
                            className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Mark latest draft as sent"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/owner-portal/my-portal?owner_id=${owner.id}`)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View owner portal"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'statements' && <StatementsHistoryPanel />}

      <OwnerFormModal open={addOpen} owner={null} onClose={() => setAddOpen(false)} onSaved={loadOwners} />
      <OwnerFormModal open={!!editTarget} owner={editTarget} onClose={() => setEditTarget(null)} onSaved={loadOwners} />
      <AssignRoomsModal open={!!assignTarget} owner={assignTarget} onClose={() => setAssignTarget(null)} onSaved={loadOwners} />
      <GenerateStatementModal open={!!statementTarget} owner={statementTarget} onClose={() => setStatementTarget(null)} onSaved={loadOwners} />
    </div>
  );
}
