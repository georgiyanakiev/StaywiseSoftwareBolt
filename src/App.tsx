import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import CookieConsent from './components/legal/CookieConsent';
import { HotelProvider } from './contexts/HotelContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { ActiveHotelProvider } from './contexts/ActiveHotelContext';
import SuperAdminPage from './pages/superadmin/SuperAdminPage';
import AppLayout from './components/layout/AppLayout';
import RequireHotel from './components/guards/RequireHotel';
import LoginPage from './pages/LoginPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import DashboardPage from './pages/DashboardPage';
import ReservationsPage from './pages/ReservationsPage';
import RoomsPage from './pages/RoomsPage';
import GuestListPage from './pages/crm/GuestListPage';
import GuestProfilePage from './pages/crm/GuestProfilePage';
import BillingPage from './pages/BillingPage';
import HousekeepingPage from './pages/HousekeepingPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import GuidePage from './pages/GuidePage';
import BookingComPage from './pages/BookingComPage';
import ExpediaPage from './pages/ExpediaPage';
import CloudbedsPage from './pages/CloudbedsPage';
import SiteMinderPage from './pages/SiteMinderPage';
import LodgifyPage from './pages/LodgifyPage';
import FrontDeskPage from './pages/FrontDeskPage';
import LoadingSpinner from './components/ui/LoadingSpinner';
import LobbyPage from './pages/lobby/LobbyPage';
import ChannelManagerPage from './pages/channel-manager/ChannelManagerPage';
import BookingEngineAdminPage from './pages/booking-engine/BookingEngineAdminPage';
import BookingWidgetPage from './pages/booking-engine/BookingWidgetPage';
import PaymentAutomationPage from './pages/payments/PaymentAutomationPage';
import InvoicingPage from './pages/invoicing/InvoicingPage';
import InvoiceSettingsPage from './pages/invoicing/InvoiceSettingsPage';
import StaffSettingsPage from './pages/settings/staff/StaffSettingsPage';
import GuestPortalPage from './pages/guest-portal/GuestPortalPage';
import GuestPortal from './pages/guest-portal/GuestPortal';
import OwnerPortalPage from './pages/owner-portal/OwnerPortalPage';
import MyOwnerPortal from './pages/owner-portal/MyOwnerPortal';
import DynamicPricingPage from './pages/dynamic-pricing/DynamicPricingPage';
import UpsellPage from './pages/upselling/UpsellPage';
import TermsPage from './pages/legal/TermsPage';

function AuthenticatedApp() {
  return (
    <HotelProvider>
      <Routes>
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/booking-engine/widget" element={<BookingWidgetPage />} />
        <Route path="/portal" element={<GuestPortal />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/terms-of-service" element={<TermsPage />} />
        <Route element={<AppLayout />}>
          <Route element={<RequireHotel />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/front-desk" element={<FrontDeskPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/guests" element={<GuestListPage />} />
            <Route path="/guests/:id" element={<GuestProfilePage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/housekeeping" element={<HousekeepingPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/staff" element={<StaffSettingsPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/channel-manager" element={<ChannelManagerPage />} />
            <Route path="/booking-engine" element={<BookingEngineAdminPage />} />
            <Route path="/payment-automation" element={<PaymentAutomationPage />} />
            <Route path="/invoicing" element={<InvoicingPage />} />
            <Route path="/invoicing/settings" element={<InvoiceSettingsPage />} />
            <Route path="/guest-portal" element={<GuestPortalPage />} />
            <Route path="/owner-portal" element={<OwnerPortalPage />} />
            <Route path="/owner-portal/my-portal" element={<MyOwnerPortal />} />
            <Route path="/dynamic-pricing" element={<DynamicPricingPage />} />
            <Route path="/upselling" element={<UpsellPage />} />
            <Route path="/booking-com" element={<BookingComPage />} />
            <Route path="/expedia" element={<ExpediaPage />} />
            <Route path="/cloudbeds" element={<CloudbedsPage />} />
            <Route path="/siteminder" element={<SiteMinderPage />} />
            <Route path="/lodgify" element={<LodgifyPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/lobby" replace />} />
        </Route>
      </Routes>
    </HotelProvider>
  );
}

function AppWithAuth() {
  const { user, loading, pendingApproval } = useAuth();
  const { loading: tenantLoading, error: tenantError, subdomain } = useTenant();

  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (subdomain && tenantError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Account Not Found</h1>
          <p className="text-gray-500 mb-1">{tenantError}</p>
          <p className="text-sm text-gray-400">
            If you believe this is an error, contact your account administrator.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (pendingApproval) return <PendingApprovalPage />;

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <ActiveHotelProvider>
      <Routes>
        <Route path="/superadmin" element={<SuperAdminPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/terms-of-service" element={<TermsPage />} />
        <Route
          path="*"
          element={
            <TenantProvider>
              <AppWithAuth />
            </TenantProvider>
          }
        />
      </Routes>
      <CookieConsent />
    </ActiveHotelProvider>
  );
}
