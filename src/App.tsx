import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { HotelProvider } from './contexts/HotelContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { ActiveHotelProvider } from './contexts/ActiveHotelContext';
import { LanguageProvider } from './contexts/LanguageContext';
import AppLayout from './components/layout/AppLayout';
import RequireHotel from './components/guards/RequireHotel';
import LoadingSpinner from './components/ui/LoadingSpinner';
import CookieConsent from './components/legal/CookieConsent';
import { useDpaAcceptance } from './pages/legal/useDpaAcceptance';

const SuperAdminPage = lazy(() => import('./pages/superadmin/SuperAdminPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));
const LobbyPage = lazy(() => import('./pages/lobby/LobbyPage'));

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const FrontDeskPage = lazy(() => import('./pages/FrontDeskPage'));
const ReservationsPage = lazy(() => import('./pages/ReservationsPage'));
const RoomsPage = lazy(() => import('./pages/RoomsPage'));
const GuestListPage = lazy(() => import('./pages/crm/GuestListPage'));
const GuestProfilePage = lazy(() => import('./pages/crm/GuestProfilePage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const HousekeepingPage = lazy(() => import('./pages/HousekeepingPage'));
const MaintenancePage = lazy(() => import('./pages/maintenance/MaintenancePage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StaffSettingsPage = lazy(() => import('./pages/settings/staff/StaffSettingsPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const ChannelManagerPage = lazy(() => import('./pages/channel-manager/ChannelManagerPage'));
const BookingEngineAdminPage = lazy(() => import('./pages/booking-engine/BookingEngineAdminPage'));
const BookingWidgetPage = lazy(() => import('./pages/booking-engine/BookingWidgetPage'));
const PaymentAutomationPage = lazy(() => import('./pages/payments/PaymentAutomationPage'));
const GuestPortalPage = lazy(() => import('./pages/guest-portal/GuestPortalPage'));
const GuestPortal = lazy(() => import('./pages/guest-portal/GuestPortal'));
const OwnerPortalPage = lazy(() => import('./pages/owner-portal/OwnerPortalPage'));
const MyOwnerPortal = lazy(() => import('./pages/owner-portal/MyOwnerPortal'));
const DynamicPricingPage = lazy(() => import('./pages/dynamic-pricing/DynamicPricingPage'));
const UpsellPage = lazy(() => import('./pages/upselling/UpsellPage'));
const BookingComPage = lazy(() => import('./pages/BookingComPage'));
const ExpediaPage = lazy(() => import('./pages/ExpediaPage'));
const CloudbedsPage = lazy(() => import('./pages/CloudbedsPage'));
const SiteMinderPage = lazy(() => import('./pages/SiteMinderPage'));
const LodgifyPage = lazy(() => import('./pages/LodgifyPage'));
const InvoicingPage = lazy(() => import('./pages/invoicing/InvoicingPage'));
const InvoiceSettingsPage = lazy(() => import('./pages/invoicing/InvoiceSettingsPage'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const DpaPage = lazy(() => import('./pages/legal/DpaPage'));
const DpaAcceptanceModal = lazy(() => import('./components/legal/DpaAcceptanceModal'));
const InactivityGuard = lazy(() => import('./components/layout/InactivityGuard'));

const PageFallback = (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

function HotelRoutes() {
  return (
    <>
      <Route index element={<DashboardPage />} />
      <Route path="front-desk" element={<FrontDeskPage />} />
      <Route path="reservations" element={<ReservationsPage />} />
      <Route path="rooms" element={<RoomsPage />} />
      <Route path="guests" element={<GuestListPage />} />
      <Route path="guests/:id" element={<GuestProfilePage />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="housekeeping" element={<HousekeepingPage />} />
      <Route path="maintenance" element={<MaintenancePage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="settings/staff" element={<StaffSettingsPage />} />
      <Route path="guide" element={<GuidePage />} />
      <Route path="channel-manager" element={<ChannelManagerPage />} />
      <Route path="booking-engine" element={<BookingEngineAdminPage />} />
      <Route path="payment-automation" element={<PaymentAutomationPage />} />
      <Route path="invoicing" element={<InvoicingPage />} />
      <Route path="invoicing/settings" element={<InvoiceSettingsPage />} />
      <Route path="guest-portal" element={<GuestPortalPage />} />
      <Route path="owner-portal" element={<OwnerPortalPage />} />
      <Route path="owner-portal/my-portal" element={<MyOwnerPortal />} />
      <Route path="dynamic-pricing" element={<DynamicPricingPage />} />
      <Route path="upselling" element={<UpsellPage />} />
      <Route path="booking-com" element={<BookingComPage />} />
      <Route path="expedia" element={<ExpediaPage />} />
      <Route path="cloudbeds" element={<CloudbedsPage />} />
      <Route path="siteminder" element={<SiteMinderPage />} />
      <Route path="lodgify" element={<LodgifyPage />} />
    </>
  );
}

function AuthenticatedApp() {
  return (
    <HotelProvider>
      <Routes>
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/portal" element={<GuestPortal />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/terms-of-service" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/privacy-policy" element={<PrivacyPage />} />
        <Route path="/dpa" element={<DpaPage />} />
        <Route path="/data-processing-agreement" element={<DpaPage />} />
        <Route path="/h/:slug" element={<AppLayout />}>
          <Route element={<RequireHotel />}>
            {HotelRoutes()}
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/lobby" replace />} />
      </Routes>
    </HotelProvider>
  );
}

function AppWithAuth() {
  const { user, loading, pendingApproval } = useAuth();
  const { loading: tenantLoading, error: tenantError, subdomain, tenant } = useTenant();
  const { acceptance, loading: dpaLoading, refetch: refetchDpa } = useDpaAcceptance(
    user?.id,
    tenant?.id ?? null
  );

  const showDpaBanner = !loading && !tenantLoading && !dpaLoading && !!user && !pendingApproval && !acceptance;

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

  return (
    <>
      <AuthenticatedApp />
      <Suspense fallback={null}>
        <InactivityGuard />
        {showDpaBanner && (
          <DpaAcceptanceModal
            userId={user.id}
            tenantId={tenant?.id ?? null}
            hotelName={tenant?.name ?? null}
            onAccepted={refetchDpa}
          />
        )}
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ActiveHotelProvider>
        <Suspense fallback={PageFallback}>
        <Routes>
          <Route path="/superadmin" element={<SuperAdminPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/booking-engine/widget"
            element={<TenantProvider><BookingWidgetPage /></TenantProvider>}
          />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/terms-of-service" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/privacy-policy" element={<PrivacyPage />} />
          <Route path="/dpa" element={<DpaPage />} />
          <Route path="/data-processing-agreement" element={<DpaPage />} />
          <Route
            path="*"
            element={
              <TenantProvider>
                <AppWithAuth />
              </TenantProvider>
            }
          />
        </Routes>
        </Suspense>
        <CookieConsent />
      </ActiveHotelProvider>
    </LanguageProvider>
  );
}
