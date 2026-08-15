import { ExternalLink, Pencil, Users, Building2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import type { Tenant } from './types';

interface TenantTableProps {
  tenants: Tenant[];
  onEdit: (tenant: Tenant) => void;
  onManageStaff: (tenant: Tenant) => void;
  onToggleActive: (tenant: Tenant) => void;
  togglingId: string | null;
}

const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  pro: 'bg-amber-100 text-amber-700',
  enterprise: 'bg-blue-100 text-blue-700',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export default function TenantTable({ tenants, onEdit, onManageStaff, onToggleActive, togglingId }: TenantTableProps) {
  const { enter } = useActiveHotel();
  const navigate = useNavigate();
  const [enteringId, setEnteringId] = useState<string | null>(null);

  async function viewAsHotel(tenant: Tenant) {
    setEnteringId(tenant.id);
    try {
      const { data, error } = await supabase.rpc('get_hotel_for_tenant', { p_tenant_id: tenant.id });
      if (error || !data || (data as unknown[]).length === 0) {
        setEnteringId(null);
        return;
      }
      const hotel = (data as { id: string; name: string; tenant_id: string; logo_url: string | null; subdomain: string }[])[0];
      await enter({
        tenantId: tenant.id,
        hotelId: hotel.id,
        role: 'super_admin',
        hotelName: hotel.name,
        hotelLogo: hotel.logo_url,
        primaryColor: tenant.primary_color ?? '#2563eb',
        secondaryColor: tenant.secondary_color ?? '#1e40af',
        tenantName: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.plan,
      });
      navigate(`/h/${tenant.subdomain}`);
    } finally {
      setEnteringId(null);
    }
  }

  if (tenants.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No hotels found</p>
        <p className="text-sm text-gray-400 mt-1">Click "Add Hotel" to create the first tenant.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Hotel</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Subdomain / Domain</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Plan</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Active</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Staff</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Created</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tenants.map(tenant => (
              <tr key={tenant.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {tenant.logo_url ? (
                      <img
                        src={tenant.logo_url}
                        alt={tenant.name}
                        className="w-9 h-9 rounded-lg object-contain border border-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                        style={{ backgroundColor: tenant.primary_color ?? '#2563eb' }}
                      >
                        {getInitials(tenant.name)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 leading-tight">{tenant.name}</p>
                      <p className="text-xs text-gray-400">{tenant.owner_email ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-gray-700 leading-tight">{tenant.subdomain}</p>
                  {tenant.custom_domain && (
                    <p className="text-xs text-gray-400 mt-0.5">{tenant.custom_domain}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_BADGE[tenant.plan] ?? PLAN_BADGE.starter}`}>
                    {tenant.plan}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleActive(tenant)}
                    disabled={togglingId === tenant.id}
                    className="flex items-center gap-1.5 transition-opacity disabled:opacity-50"
                    title={tenant.active ? 'Click to deactivate' : 'Click to activate'}
                  >
                    {tenant.active ? (
                      <ToggleRight className="w-6 h-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                    <span className={`text-xs font-medium ${tenant.active ? 'text-green-600' : 'text-gray-400'}`}>
                      {tenant.active ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-medium">{tenant.staff_count ?? 0}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onEdit(tenant)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => onManageStaff(tenant)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Staff
                    </button>
                    <button
                      onClick={() => viewAsHotel(tenant)}
                      disabled={enteringId === tenant.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {enteringId === tenant.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      Enter
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
