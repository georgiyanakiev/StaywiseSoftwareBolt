import { Building2, Plus, LogOut, Hotel, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';
import { useLobbyData, type LobbyHotel } from './useLobbyData';
import { supabase } from '../../lib/supabase';
import HotelCard from './HotelCard';
import HotelCardSkeleton from './HotelCardSkeleton';
import LegalFooter from '../../components/legal/LegalFooter';

const SUPERADMIN_EMAILS = (import.meta.env.VITE_SUPERADMIN_EMAILS ?? '').split(',').map((e: string) => e.trim()).filter(Boolean);

function emailLooksLikeSuperAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAILS.includes(email) || email.endsWith('@staywisesoftware.com');
}

function useIsSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      return;
    }
    if (emailLooksLikeSuperAdmin(user.email)) {
      setIsSuperAdmin(true);
      return;
    }
    supabase
      .from('user_hotel_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .eq('active', true)
      .is('tenant_id', null)
      .limit(1)
      .then(({ data }) => setIsSuperAdmin((data?.length ?? 0) > 0));
  }, [user]);

  return isSuperAdmin;
}

function getAvatarInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export default function LobbyPage() {
  const { user, signOut } = useAuth();
  const { enter, entering } = useActiveHotel();
  const navigate = useNavigate();
  const { hotels, loading, error } = useLobbyData();

  const superAdmin = useIsSuperAdmin();

  async function handleEnterHotel(hotel: LobbyHotel) {
    await enter({
      tenantId: hotel.tenant_id ?? hotel.id,
      hotelId: hotel.id,
      role: hotel.staff_role,
      hotelName: hotel.name,
      hotelLogo: hotel.logo_url,
      primaryColor: hotel.tenant?.primary_color ?? '#2563eb',
      secondaryColor: hotel.tenant?.secondary_color ?? '#1e40af',
      tenantName: hotel.tenant?.name ?? hotel.name,
      subdomain: hotel.tenant?.subdomain ?? '',
      plan: hotel.tenant?.plan ?? 'starter',
    });
    navigate('/');
  }

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: '#f4f6f9' }}>
      {entering && (
        <div className="fixed inset-0 z-50 bg-white/70 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Loading hotel...</p>
          </div>
        </div>
      )}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Hotel className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
            </div>
            <span className="text-[15px] font-semibold text-gray-900 tracking-tight">StayWise</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-white">{getAvatarInitials(user?.email ?? 'U')}</span>
              </div>
              <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Your properties</h1>
            {!loading && (
              <p className="text-sm text-gray-400 mt-1">
                {hotels.length === 0
                  ? 'No hotels assigned'
                  : hotels.length === 1
                  ? '1 hotel'
                  : `${hotels.length} hotels`}
              </p>
            )}
          </div>

          {superAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/superadmin')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#1e3a5f] text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <Shield className="w-4 h-4" />
                Super Admin
              </button>
              <button
                onClick={() => navigate('/superadmin')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#172e4c] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Hotel
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {[0, 1, 2].map(i => <HotelCardSkeleton key={i} />)}
          </div>
        ) : hotels.length === 0 ? (
          <EmptyState superAdmin={superAdmin} onAddHotel={() => navigate('/superadmin')} />
        ) : (
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {hotels.map(hotel => (
              <HotelCard key={hotel.id} hotel={hotel} onEnter={handleEnterHotel} />
            ))}
          </div>
        )}
      </main>
      <LegalFooter />
    </div>
  );
}

function EmptyState({ superAdmin, onAddHotel }: { superAdmin: boolean; onAddHotel: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <Building2 className="w-9 h-9 text-gray-300" />
      </div>
      <h3 className="text-lg font-medium text-gray-700 mb-1.5">No hotels assigned yet</h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6">
        Contact your administrator to get access to a hotel, or create one if you have admin rights.
      </p>
      {superAdmin && (
        <button
          onClick={onAddHotel}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#172e4c] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Hotel
        </button>
      )}
    </div>
  );
}
