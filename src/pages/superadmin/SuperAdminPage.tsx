import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, RefreshCw, LogOut, AlertTriangle, Building2, Users } from 'lucide-react';
import { supabaseAdmin, supabase } from '../../lib/supabase';
import StatsBar from './StatsBar';
import TenantTable from './TenantTable';
import TenantFormModal from './TenantFormModal';
import StaffAssignmentsTab from './StaffAssignmentsTab';
import type { Tenant, TenantFormData } from './types';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'changeme';
const SESSION_KEY = 'sw_superadmin_auth';

function isAdminSubdomain(): boolean {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const params = new URLSearchParams(window.location.search);
    return params.get('tenant') === 'admin';
  }
  const parts = hostname.split('.');
  return parts[0] === 'admin';
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      onUnlock();
    } else {
      setError(true);
      setPwd('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-gray-400 text-sm mt-1">StayWise Platform Management</p>
        </div>

        <form onSubmit={submit} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Admin Password</label>
            <input
              type="password"
              value={pwd}
              onChange={e => { setPwd(e.target.value); setError(false); }}
              className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${error ? 'border-red-500' : 'border-gray-700'}`}
              placeholder="Enter admin password"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Incorrect password
              </p>
            )}
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors">
            Unlock Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

type Tab = 'hotels' | 'staff';

export default function SuperAdminPage() {
  const autoUnlocked = isAdminSubdomain();
  const [unlocked, setUnlocked] = useState(autoUnlocked || sessionStorage.getItem(SESSION_KEY) === '1');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; tenant?: Tenant } | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('hotels');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const db = supabaseAdmin ?? supabase;

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
    if (unlocked) fetchTenants();
  }, [unlocked, fetchTenants]);

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

  const lock = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
  };

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
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
          {!autoUnlocked && (
            <button
              onClick={lock}
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Lock
            </button>
          )}
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
