import { useState, useEffect, useCallback } from 'react';
import { Search, Users, UserPlus, Loader2, RefreshCw, LayoutList, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AdminUser, Tenant } from './types';
import UserAssignmentPanel from './UserAssignmentPanel';
import HotelStaffView from './HotelStaffView';

interface Props {
  tenants: Tenant[];
}

type ViewMode = 'by-user' | 'by-hotel';

function getUserDisplayName(user: AdminUser) {
  const meta = user.raw_user_meta_data;
  if (!meta) return user.email;
  if (meta.first_name || meta.last_name) return `${meta.first_name ?? ''} ${meta.last_name ?? ''}`.trim();
  if (meta.full_name) return meta.full_name;
  return user.email;
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-fade-in">
      <CheckCircle className="w-4 h-4 text-green-400" />
      {message}
    </div>
  );
}

interface InviteModalProps {
  tenants: Tenant[];
  onClose: () => void;
  onInvited: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InviteModal({ tenants, onClose, onInvited }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? '');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [tenantTouched, setTenantTouched] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const emailError = emailTouched && !email.trim()
    ? 'Email address is required.'
    : emailTouched && !EMAIL_RE.test(email.trim())
    ? 'Please enter a valid email address.'
    : null;

  const tenantError = tenantTouched && !tenantId ? 'Please select a hotel to assign the user to.' : null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setTenantTouched(true);
    if (!email.trim() || !EMAIL_RE.test(email.trim())) return;
    if (!tenantId) return;
    setInviting(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

    const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ email, tenant_id: tenantId }),
    });

    const result = await res.json();
    if (!res.ok || result.error) {
      setError(result.error || 'Failed to create user');
      setInviting(false);
      return;
    }

    if (result.already_exists) {
      setError('This user already has an account. You can find and assign them in the user list.');
      setInviting(false);
      return;
    }

    onInvited();
    setTempPassword(result.temp_password);
    setInviting(false);
  };

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (tempPassword) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">User Created</h3>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Account created for {email}</p>
                <p className="text-xs text-green-700 mt-0.5">Share the temporary password below with the user. They can change it after logging in.</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 select-all">
                  {tempPassword}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Invite New User</h3>
        </div>
        <form onSubmit={handleInvite} className="px-6 py-5 space-y-4" noValidate>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (emailTouched) setEmailTouched(true); }}
              onBlur={() => setEmailTouched(true)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                emailError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'
              }`}
              placeholder="user@example.com"
              autoFocus
            />
            {emailError && (
              <span className="flex items-center gap-1 text-red-500 text-xs mt-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {emailError}
              </span>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Hotel <span className="text-red-500">*</span>
            </label>
            <select
              value={tenantId}
              onChange={e => { setTenantId(e.target.value); setTenantTouched(true); }}
              onBlur={() => setTenantTouched(true)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                tenantError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'
              }`}
            >
              <option value="">— Select a hotel —</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {tenantError && (
              <span className="flex items-center gap-1 text-red-500 text-xs mt-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {tenantError}
              </span>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviting || !!emailError || !!tenantError}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {inviting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffAssignmentsTab({ tenants }: Props) {
  const dbClient = supabase;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('by-user');
  const [toast, setToast] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await dbClient.rpc('admin_list_users');
    if (!error && data) {
      setUsers(data as AdminUser[]);
    }
    setLoading(false);
  }, [dbClient]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter(u => {
    const name = getUserDisplayName(u).toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q);
  });

  const showToast = (msg: string) => setToast(msg);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('by-user')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'by-user' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users className="w-3.5 h-3.5" />
            By User
          </button>
          <button
            onClick={() => setViewMode('by-hotel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'by-hotel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            By Hotel
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite User
          </button>
        </div>
      </div>

      {viewMode === 'by-hotel' ? (
        <HotelStaffView
          tenants={tenants}
          allUsers={users}
          onToast={showToast}
        />
      ) : (
        <div className="flex gap-4 h-[600px]">
          <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            <div className="px-3 py-3 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No users found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filtered.map(user => {
                    const displayName = getUserDisplayName(user);
                    const initials = displayName !== user.email
                      ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                      : user.email.slice(0, 2).toUpperCase();
                    const isSelected = selectedUser?.id === user.id;

                    return (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${isSelected ? 'bg-blue-600' : 'bg-gray-700'}`}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {displayName !== user.email ? displayName : ''}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {user.hotel_assignment_count > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {user.hotel_assignment_count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {selectedUser ? (
              <UserAssignmentPanel
                user={selectedUser}
                tenants={tenants}
                onToast={showToast}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <LayoutList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">Select a user</p>
                  <p className="text-xs text-gray-300 mt-1">Click on any user to manage their hotel assignments</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast} onDone={() => setToast(null)} />
      )}

      {showInvite && (
        <InviteModal
          tenants={tenants}
          onClose={() => setShowInvite(false)}
          onInvited={fetchUsers}
        />
      )}
    </div>
  );
}
