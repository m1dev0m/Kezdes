import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/modules/auth/logic/AuthContext';
import { I18nProvider } from '@/i18n/index.tsx';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminLayout from '@/layouts/AdminLayout';
import PublicLayout from '@/layouts/PublicLayout';
import GlobalAdminLayout from '@/layouts/GlobalAdminLayout';
import './App.css';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Bookings = lazy(() => import('@/pages/Bookings'));
const CreateReservation = lazy(() => import('@/pages/CreateReservation'));
const Customers = lazy(() => import('@/pages/Customers'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
const Tables = lazy(() => import('@/pages/Tables'));
const Settings = lazy(() => import('@/pages/Settings'));
const RestaurantPage = lazy(() => import('@/pages/public/RestaurantPage'));
const BookPage = lazy(() => import('@/pages/public/BookPage'));
const ConfirmationPage = lazy(() => import('@/pages/public/ConfirmationPage'));
const Search = lazy(() => import('@/pages/public/Search'));
const GlobalDashboard = lazy(() => import('@/pages/global_admin/GlobalDashboard'));
const Requests = lazy(() => import('@/pages/global_admin/Requests'));
const Restaurants = lazy(() => import('@/pages/global_admin/Restaurants'));
const SystemLogs = lazy(() => import('@/pages/global_admin/SystemLogs'));
const Welcome = lazy(() => import('@/pages/public/Welcome'));
const RestaurantPendingApproval = lazy(() => import('@/pages/public/RestaurantPendingApproval'));
const SetupRestaurant = lazy(() => import('@/pages/public/SetupRestaurant'));
const RoleSelection = lazy(() => import('@/pages/RoleSelection'));

// Guest Pages
const GuestLayout = lazy(() => import('@/layouts/GuestLayout'));
const GuestDashboard = lazy(() => import('@/pages/guest/GuestDashboard'));
const GuestBookingDetails = lazy(() => import('@/pages/guest/GuestBookingDetails'));
const GuestProfile = lazy(() => import('@/pages/guest/GuestProfile'));
const GuestSettings = lazy(() => import('@/pages/guest/GuestSettings'));
const GuestFavorites = lazy(() => import('@/pages/guest/GuestFavorites'));
const GuestMessages = lazy(() => import('@/pages/guest/GuestMessages'));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );
}

function IndexRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Welcome />;

  const role = user.role;

  if (role === 'global_admin') return <Navigate to="/admin/dashboard" replace />;

  if (['owner', 'manager', 'host', 'worker'].includes(role)) {
    if (!user.restaurant_verified && role !== 'worker') {
      if (user.restaurant_setup_required) {
        return <Navigate to="/setup-restaurant" replace />;
      }
      return <Navigate to="/register-restaurant/pending" replace />;
    }

    return <Navigate to="/app/dashboard" replace />;
  }

  if (role === 'pending') return <Navigate to="/role-selection" replace />;

  if (['customer'].includes(role)) return <Navigate to="/guest/dashboard" replace />;

  return <Welcome />;
}

function AdaptiveLayout() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  const isGuest = user && ['customer'].includes(user.role);

  if (isGuest) {
    return <GuestLayout />;
  }

  return <PublicLayout />;
}

function App() {
  const restaurantRoles = [
    'owner',
    'manager',
    'host',
    'worker',
  ];

  return (
    <I18nProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<IndexRedirect />} />

              <Route element={<AdaptiveLayout />}>
                <Route path="restaurants" element={<Search />} />
                <Route path="discover" element={<Navigate to="/restaurants" replace />} />
                <Route path="discover/map" element={<Navigate to="/restaurants" replace />} />
                <Route path="restaurant/:id" element={<RestaurantPage />} />
                <Route path="restaurant/:id/success" element={<ConfirmationPage />} />
              </Route>

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/role-selection" element={<RoleSelection />} />
              <Route path="/register-restaurant" element={<Navigate to="/register?mode=restaurant" replace />} />
              <Route path="/setup-restaurant" element={<SetupRestaurant />} />
              <Route path="/setup_restaurant" element={<Navigate to="/setup-restaurant" replace />} />
              <Route path="/register-restaurant/pending" element={<RestaurantPendingApproval />} />
              <Route path="/restaurant/:id/book" element={<BookPage />} />

              <Route path="/guest" element={<ProtectedRoute allowedRoles={['customer']} />}>
                <Route element={<GuestLayout />}>
                  <Route path="dashboard" element={<GuestDashboard />} />
                  <Route path="bookings/:id" element={<GuestBookingDetails />} />
                  <Route path="profile" element={<GuestProfile />} />
                  <Route path="settings" element={<GuestSettings />} />
                  <Route path="favorites" element={<GuestFavorites />} />
                  <Route path="messages" element={<GuestMessages />} />
                </Route>
              </Route>

              <Route path="/profile" element={<Navigate to="/guest/profile" replace />} />
              <Route path="/my-reservations" element={<Navigate to="/guest/dashboard" replace />} />

              <Route path="/app" element={<ProtectedRoute allowedRoles={restaurantRoles} />}>
                <Route element={<AdminLayout />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="bookings/new" element={<CreateReservation />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                  <Route path="tables" element={<Tables />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="calendar" element={<Navigate to="/app/bookings" replace />} />
                  <Route path="analytics" element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="reports" element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="reviews" element={<Navigate to="/app/dashboard" replace />} />
                </Route>
              </Route>

              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/dashboard/reservations" element={<Navigate to="/app/bookings" replace />} />
              <Route path="/dashboard/tables" element={<Navigate to="/app/tables" replace />} />
              <Route path="/dashboard/settings" element={<Navigate to="/app/settings" replace />} />

              <Route path="/admin" element={<ProtectedRoute allowedRoles={['global_admin']} />}>
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
