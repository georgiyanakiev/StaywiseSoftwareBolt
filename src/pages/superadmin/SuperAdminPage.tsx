import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, RefreshCw, AlertTriangle, Building2, Users, ArrowLeft } from 'lucide-react';
import { supabaseAdmin, supabase } from '../../lib/supabase';
import StatsBar from './StatsBar';
import TenantTable from './TenantTable';
import TenantFormModal from './TenantFormModal';
import StaffAssignmentsTab from './StaffAssignmentsTab';
import type { Tenant, TenantFormData } from './types';

type Tab = 'hotels' | 'staff';

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; tenant?: Tenant } | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('hotels');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const db = supabaseAdmin ?? supabase;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setAuthLoading(false); return; }
      supabase
        .from('user_hotel_assignments')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .limit(1)
        .then(({ data }) => {
          setIsSuperAdmin((data?.length ?? 0) > 0);
          setAuthLoading(false);
        });
    });
  }, []);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await db
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const tenantsData = (data as Tenant[]) ?? [];

    const { data: assignmentCounts } = await db
      .from('user_hotel_assignments')
      .select('tenant_id')
      .eq('active', true);

    const countMap: Record<string, number> = {};
    (assignmentCounts ?? []).forEach((a: { tenant_id: string }) => {
      countMap[a.tenant_id] = (countMap[a.tenant_id] ?? 0) + 1;
    });

    setTenants(tenantsData.map(t => ({ ...t, staff_count: countMap[t.id] ?? 0 })));
    setLoading(false);
  }, [db]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) fetchTenants();
  }, [authLoading, isSuperAdmin, fetchTenants]);

  const handleSave = async (formData: TenantFormData) => {
    if (modal?.mode === 'add') {
      const { error: err } = await db.from('tenants').insert({
        name: formData.name,
        subdomain: formData.subdomain,
        owner_email: formData.owner_email || null,
        plan: formData.plan,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        logo_url: formData.logo_url || null,
        active: true,
      });
      if (err) throw new Error(err.message);
    } else if (modal?.mode === 'edit' && modal.tenant) {
      const { error: err } = await db.from('tenants').update({
        name: formData.name,
        owner_email: formData.owner_email || null,
        plan: formData.plan,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        logo_url: formData.logo_url || null,
        active: formData.active,
      }).eq('id', modal.tenant.id);
      if (err) throw new Error(err.message);
    }
    await fetchTenants();
  };

  const handleToggleActive = async (tenant: Tenant) => {
    setTogglingId(tenant.id);
    const { error: err } = await db
      .from('tenants')
      .update({ active: !tenant.active })
      .eq('id', tenant.id);
    if (!err) {
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, active: !tenant.active } : t));
    }
    setTogglingId(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-gray-400" />
          </div>
          <div>
            <p className="text-gray-800 font-semibold text-base">Access Denied</p>
            <p className="text-gray-500 text-sm mt-1">Super admin role required.</p>
          </div>
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 mx-auto text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to lobby
          </button>
        </div>
      </div>
    );
  }

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase()) ||
    (t.owner_email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-950 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-white font-semibold">StayWise</span>
              <span className="text-gray-400 text-sm ml-2">Super Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/lobby')}
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span>Restricted</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <StatsBar tenants={tenants} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setTab('hotels')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'hotels' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Building2 className="w-4 h-4" />
              Hotels
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${tab === 'hotels' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {tenants.length}
              </span>
            </button>
            <button
              onClick={() => setTab('staff')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'staff' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users className="w-4 h-4" />
              Staff & Assignments
            </button>
          </div>

          {tab === 'hotels' && (
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Hotel
            </button>
          )}
        </div>

        {tab === 'hotels' && (
          <>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search hotels, subdomains, owners..."
                className="flex-1 max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button
                onClick={fetchTenants}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
                {!supabaseAdmin && (
                  <span className="ml-1 text-red-500">(VITE_SUPABASE_SERVICE_KEY not set — RLS may block results)</span>
                )}
              </div>
            )}

            <TenantTable
              tenants={filtered}
              onEdit={t => setModal({ mode: 'edit', tenant: t })}
              onManageStaff={() => setTab('staff')}
              onToggleActive={handleToggleActive}
              togglingId={togglingId}
            />

            {!supabaseAdmin && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                VITE_SUPABASE_SERVICE_KEY is not configured. Set the service role key to bypass RLS.
              </p>
            )}
          </>
        )}

        {tab === 'staff' && (
          <StaffAssignmentsTab tenants={tenants} />
        )}
      </main>

      {modal && (
        <TenantFormModal
          mode={modal.mode}
          tenant={modal.tenant}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
