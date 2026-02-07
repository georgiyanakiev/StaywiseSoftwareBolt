import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { seedHotelData } from '../lib/seedData';
import type { User, Session } from '@supabase/supabase-js';
import type { StaffMember } from '../types';

interface AuthState {
  user: User | null;
  session: Session | null;
  staff: StaffMember | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    staff: null,
    loading: true,
  });

  const fetchStaff = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('staff_members')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    return data as StaffMember | null;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchStaff(session.user.id).then(staff => {
          setState({ user: session.user, session, staff, loading: false });
        });
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        (async () => {
          const staff = await fetchStaff(session.user.id);
          setState({ user: session.user, session, staff, loading: false });
        })();
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, session: null, staff: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchStaff]);

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
      const { data: existingHotels } = await supabase.from('hotels').select('id').limit(1);
      let hotelId: string;

      if (existingHotels && existingHotels.length > 0) {
        hotelId = existingHotels[0].id;
      } else {
        const { data: newHotel, error: hotelErr } = await supabase
          .from('hotels')
          .insert({
            name: 'The Grand Metropolitan',
            address: '500 Park Avenue',
            city: 'New York',
            country: 'United States',
            phone: '+1 (212) 555-0100',
            email: email,
            website: 'https://grandmetropolitan.example.com',
            star_rating: 5,
            tax_rate: 10,
          })
          .select()
          .single();
        if (hotelErr) return { error: hotelErr.message };
        hotelId = newHotel.id;
        seedHotelData(hotelId).catch(() => {});
      }

      await supabase.from('staff_members').insert({
        hotel_id: hotelId,
        user_id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        role: 'admin',
      });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
