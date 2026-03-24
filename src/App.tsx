import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { HotelProvider } from './contexts/HotelContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ReservationsPage from './pages/ReservationsPage';
import RoomsPage from './pages/RoomsPage';
import GuestsPage from './pages/GuestsPage';
import BillingPage from './pages/BillingPage';
import HousekeepingPage from './pages/HousekeepingPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import GuidePage from './pages/GuidePage';
import BookingComPage from './pages/BookingComPage';
import ExpediaPage from './pages/ExpediaPage';
import CloudbedsPage from './pages/CloudbedsPage';
import SiteMinderPage from './pages/SiteMinderPage';
import LodgifyPage from './pages/LodgifyPage';
import FrontDeskPage from './pages/FrontDeskPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

function AuthenticatedApp() {
  return (
    <HotelProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/front-desk" element={<FrontDeskPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/guests" element={<GuestsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/housekeeping" element={<HousekeepingPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/booking-com" element={<BookingComPage />} />
          <Route path="/expedia" element={<ExpediaPage />} />
          <Route path="/cloudbeds" element={<CloudbedsPage />} />
          <Route path="/siteminder" element={<SiteMinderPage />} />
          <Route path="/lodgify" element={<LodgifyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HotelProvider>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <AuthenticatedApp />;
}
