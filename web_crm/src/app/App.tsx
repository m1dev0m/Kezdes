import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/modules/auth/logic/AuthContext';
import { I18nProvider } from '@/i18n/index.tsx';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminLayout from '@/layouts/AdminLayout';
import GuestLayout from '@/layouts/GuestLayout';
import PublicLayout from '@/layouts/PublicLayout';
import GlobalAdminLayout from '@/layouts/GlobalAdminLayout';
import { Toaster } from 'react-hot-toast';
import './App.css';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Bookings = lazy(() => import('@/pages/Bookings'));
const Customers = lazy(() => import('@/pages/Customers'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
const Tables = lazy(() => import('@/pages/Tables'));
const Staff = lazy(() => import('@/pages/Staff'));
const Automations = lazy(() => import('@/pages/Automations'));
const Reviews = lazy(() => import('@/pages/Reviews'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Settings = lazy(() => import('@/pages/Settings'));
const Reports = lazy(() => import('@/pages/Reports'));
const Menu = lazy(() => import('@/pages/Menu'));
const Orders = lazy(() => import('@/pages/Orders'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Messages = lazy(() => import('@/pages/Messages'));
const RestaurantPage = lazy(() => import('@/pages/public/RestaurantPage'));
const BookPage = lazy(() => import('@/pages/public/BookPage'));
const ConfirmationPage = lazy(() => import('@/pages/public/ConfirmationPage'));
const Search = lazy(() => import('@/pages/public/Search'));
const GuestDashboard = lazy(() => import('@/pages/guest/GuestDashboard'));
const GuestBookingDetails = lazy(() => import('@/pages/guest/GuestBookingDetails'));
const GuestMessages = lazy(() => import('@/pages/guest/GuestMessages'));
const GuestProfile = lazy(() => import('@/pages/guest/GuestProfile'));
const GuestFavorites = lazy(() => import('@/pages/guest/GuestFavorites'));
const GuestSettings = lazy(() => import('@/pages/guest/GuestSettings'));
const GlobalDashboard = lazy(() => import('@/pages/global_admin/GlobalDashboard'));
const Requests = lazy(() => import('@/pages/global_admin/Requests'));
const Restaurants = lazy(() => import('@/pages/global_admin/Restaurants'));
const SystemLogs = lazy(() => import('@/pages/global_admin/SystemLogs'));
const Welcome = lazy(() => import('@/pages/public/Welcome'));
const Pricing = lazy(() => import('@/pages/public/Pricing'));
const Contact = lazy(() => import('@/pages/public/Contact'));
const Billing = lazy(() => import('@/pages/Billing'));
const RestaurantPendingApproval = lazy(() => import('@/pages/public/RestaurantPendingApproval'));
const SetupRestaurant = lazy(() => import('@/pages/public/SetupRestaurant'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
}

function IndexRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) return <Welcome />;

  const role = user?.role;

  if (role === 'global_admin') return <Navigate to="/admin/dashboard" replace />;

  if (['owner', 'restaurant_admin', 'restaurant_owner', 'restaurant_staff', 'manager', 'host', 'hostess', 'worker'].includes(role)) {
    if (!user.restaurant_verified && role !== 'worker') {
      if (user.restaurant_setup_required) {
        return <Navigate to="/setup-restaurant" replace />;
      }
      return <Navigate to="/register-restaurant/pending" replace />;
    }
    return <Navigate to="/app/dashboard" replace />;
  }

  if (['organizer', 'customer'].includes(role)) {
    return <Navigate to="/guest/dashboard" replace />;
  }

  return <Welcome />;
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<IndexRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-restaurant" element={<Navigate to="/register?mode=restaurant" replace />} />
              <Route path="/setup-restaurant" element={<SetupRestaurant />} />
              <Route path="/setup_restaurant" element={<Navigate to="/setup-restaurant" replace />} />
              <Route path="/register-restaurant/pending" element={<RestaurantPendingApproval />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<Contact />} />

              <Route path="/restaurants" element={<Search />} />
              <Route path="/discover" element={<Search />} />
              <Route path="/discover/map" element={<Search />} />

              <Route path="/restaurant" element={<PublicLayout />}>
                <Route path=":id" element={<RestaurantPage />} />
                <Route path=":id/book" element={<BookPage />} />
                <Route path=":id/success" element={<ConfirmationPage />} />
              </Route>

              <Route path="/profile" element={<Navigate to="/guest/profile" replace />} />
              <Route path="/my-reservations" element={<Navigate to="/guest/dashboard" replace />} />

              <Route path="/guest" element={<ProtectedRoute />}>
                <Route element={<GuestLayout />}>
                  <Route path="dashboard" element={<GuestDashboard />} />
                  <Route path="bookings/:id" element={<GuestBookingDetails />} />
                  <Route path="messages" element={<GuestMessages />} />
                  <Route path="profile" element={<GuestProfile />} />
                  <Route path="favorites" element={<GuestFavorites />} />
                  <Route path="settings" element={<GuestSettings />} />
                </Route>
              </Route>

              <Route path="/app" element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                  <Route path="tables" element={<Tables />} />
                  <Route path="menu" element={<Menu />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="automations" element={<Automations />} />
                  <Route path="reviews" element={<Reviews />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="billing" element={<Billing />} />
                </Route>
              </Route>

              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/dashboard/reservations" element={<Navigate to="/app/bookings" replace />} />
              <Route path="/dashboard/tables" element={<Navigate to="/app/tables" replace />} />
              <Route path="/dashboard/menu" element={<Navigate to="/app/menu" replace />} />
              <Route path="/dashboard/settings" element={<Navigate to="/app/settings" replace />} />

              <Route path="/admin" element={<ProtectedRoute />}>
                <Route element={<GlobalAdminLayout />}>
                  <Route path="dashboard" element={<GlobalDashboard />} />
                  <Route path="requests" element={<Requests />} />
                  <Route path="applications" element={<Requests />} />
                  <Route path="restaurants" element={<Restaurants />} />
                  <Route path="logs" element={<SystemLogs />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
