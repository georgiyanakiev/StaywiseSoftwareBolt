import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase, getActiveTenantId } from '../lib/supabase';
import { seedHotelData } from '../lib/seedData';
import type { User, Session } from '@supabase/supabase-js';
import type { StaffMember } from '../types';
import {
  DEFAULT_PERMISSIONS,
  canAccessPath,
  hasPerm,
  type PermissionsMap,
  type ModuleKey,
  type ModulePermission,
  type StaffRole,
} from '../lib/permissions';

interface AuthState {
  user: User | null;
  session: Session | null;
  staff: StaffMember | null;
  permissions: PermissionsMap | null;
  loading: boolean;
  pendingApproval: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  canView: (module: ModuleKey) => boolean;
  canCreate: (module: ModuleKey) => boolean;
  canEdit: (module: ModuleKey) => boolean;
  canDelete: (module: ModuleKey) => boolean;
  canAccess: (pathname: string) => boolean;
  checkPerm: (module: ModuleKey, action: keyof ModulePermission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadPermissions(hotelId: string, role: StaffRole): Promise<PermissionsMap> {
  const { data } = await supabase
    .from('role_permissions')
    .select('module, can_view, can_create, can_edit, can_delete')
    .eq('hotel_id', hotelId)
    .eq('role', role);

  if (!data || data.length === 0) {
    return DEFAULT_PERMISSIONS[role] ?? {};
  }

  const map: PermissionsMap = {};
  for (const row of data) {
    map[row.module as ModuleKey] = {
      can_view: row.can_view,
      can_create: row.can_create,
      can_edit: row.can_edit,
      can_delete: row.can_delete,
    };
  }
  return map;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    staff: null,
    permissions: null,
    loading: true,
    pendingApproval: false,
  });

  const fetchStaff = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('staff_members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return data as StaffMember | null;
    } catch {
      return null;
    }
  }, []);

  const initSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({ user: null, session: null, staff: null, permissions: null, loading: false, pendingApproval: false });
      return;
    }
    try {
      const staff = await fetchStaff(session.user.id);
      const isPending = staff?.approval_status === 'pending';
      const activeStaff = staff?.is_active ? staff : null;

      let permissions: PermissionsMap | null = null;
      if (activeStaff && !isPending) {
        permissions = await loadPermissions(activeStaff.hotel_id, activeStaff.role as StaffRole);
      }

      setState({
        user: session.user,
        session,
        staff: isPending ? null : activeStaff,
        permissions,
        loading: false,
        pendingApproval: isPending,
      });
    } catch {
      setState({ user: session.user, session, staff: null, permissions: null, loading: false, pendingApproval: false });
    }
  }, [fetchStaff]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      initSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        (async () => { await initSession(session); })();
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, session: null, staff: null, permissions: null, loading: false, pendingApproval: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [initSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error) return { error: error.message };

    if (data.user) {
      const tenantId = getActiveTenantId();

      const hotelsQuery = supabase.from('hotels').select('id');
      if (tenantId) hotelsQuery.eq('tenant_id', tenantId);
      const { data: existingHotels } = await hotelsQuery.limit(1);
      let hotelId: string;

      if (existingHotels && existingHotels.length > 0) {
        hotelId = existingHotels[0].id;
      } else {
        const hotelPayload: Record<string, unknown> = {
          name: 'The Grand Metropolitan',
          address: '500 Park Avenue',
          city: 'New York',
          country: 'United States',
          phone: '+1 (212) 555-0100',
          email: email,
          website: 'https://grandmetropolitan.example.com',
          star_rating: 5,
          tax_rate: 10,
        };
        if (tenantId) hotelPayload.tenant_id = tenantId;

        const { data: newHotel, error: hotelErr } = await supabase
          .from('hotels')
          .insert(hotelPayload)
          .select()
          .single();
        if (hotelErr) return { error: hotelErr.message };
        hotelId = newHotel.id;
        seedHotelData(hotelId).catch(() => {});
      }

      const staffPayload: Record<string, unknown> = {
        hotel_id: hotelId,
        user_id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        role: 'front_desk',
        is_active: false,
        approval_status: 'pending',
      };
      if (tenantId) staffPayload.tenant_id = tenantId;

      const { data: staffData } = await supabase
        .from('staff_members')
        .insert(staffPayload)
        .select()
        .single();

      if (staffData) {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        };

        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-approval-request`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              staffMemberId: staffData.id,
              firstName,
              lastName,
              email,
            }),
          }
        ).catch(() => {});

        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedule-onboarding-emails`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userId: data.user.id,
              email,
              firstName,
            }),
          }
        ).catch(() => {});
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const { permissions } = state;

  const value: AuthContextValue = {
    ...state,
    canView:   (module) => hasPerm(permissions, module, 'can_view'),
    canCreate: (module) => hasPerm(permissions, module, 'can_create'),
    canEdit:   (module) => hasPerm(permissions, module, 'can_edit'),
    canDelete: (module) => hasPerm(permissions, module, 'can_delete'),
    canAccess: (pathname) => canAccessPath(permissions, pathname),
    checkPerm: (module, action) => hasPerm(permissions, module, action),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
