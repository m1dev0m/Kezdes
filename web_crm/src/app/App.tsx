import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/modules/auth/logic/AuthContext';
import { getPostAuthRedirectPath } from '@/modules/auth/logic/roles';
import { I18nProvider } from '@/i18n/index.tsx';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminLayout from '@/layouts/AdminLayout';
import GlobalAdminLayout from '@/layouts/GlobalAdminLayout';
import PublicLayout from '@/layouts/PublicLayout';
import './App.css';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Bookings = lazy(() => import('@/pages/Bookings'));
const CreateReservation = lazy(() => import('@/pages/CreateReservation'));
const Customers = lazy(() => import('@/pages/Customers'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
const Settings = lazy(() => import('@/pages/Settings'));
const Staff = lazy(() => import('@/pages/Staff'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Billing = lazy(() => import('@/pages/Billing'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Automations = lazy(() => import('@/pages/Automations'));
const RestaurantPage = lazy(() => import('@/pages/public/RestaurantPage'));
const BookPage = lazy(() => import('@/pages/public/BookPage'));
const ConfirmationPage = lazy(() => import('@/pages/public/ConfirmationPage'));
const PublicReservationPage = lazy(() => import('@/pages/public/PublicReservationPage'));
const PublicWaitlistPage = lazy(() => import('@/pages/public/PublicWaitlistPage'));
const Search = lazy(() => import('@/pages/public/Search'));
const FloorView = lazy(() => import('@/pages/FloorView'));
const Tables = lazy(() => import('@/pages/Tables'));
const Waitlist = lazy(() => import('@/pages/Waitlist'));
const Messages = lazy(() => import('@/pages/Messages'));
const Orders = lazy(() => import('@/pages/Orders'));
const Pricing = lazy(() => import('@/pages/public/Pricing'));
const Contact = lazy(() => import('@/pages/public/Contact'));
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

  return <Navigate to={getPostAuthRedirectPath(user)} replace />;
}

function App() {
  const restaurantRoles = ['owner', 'manager', 'host', 'worker', 'restaurant_admin', 'restaurant_owner', 'restaurant_staff', 'hostess'];

  return (
    <I18nProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<IndexRedirect />} />

              <Route element={<PublicLayout />}>
                <Route path="restaurants" element={<Search />} />
                <Route path="pricing" element={<Pricing />} />
                <Route path="contact" element={<Contact />} />
                <Route path="discover" element={<Navigate to="/restaurants" replace />} />
                <Route path="discover/map" element={<Navigate to="/restaurants" replace />} />
                <Route path="restaurant/:id" element={<RestaurantPage />} />
                <Route path="restaurant/:id/success" element={<ConfirmationPage />} />
                <Route path="reservation/:token" element={<PublicReservationPage />} />
                <Route path="waitlist/:token" element={<PublicWaitlistPage />} />
              </Route>

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/role-selection" element={<RoleSelection />} />
              <Route path="/register-restaurant" element={<Navigate to="/register?mode=restaurant" replace />} />
              <Route path="/setup-restaurant" element={<SetupRestaurant />} />
              <Route path="/setup_restaurant" element={<Navigate to="/setup-restaurant" replace />} />
              <Route path="/register-restaurant/pending" element={<RestaurantPendingApproval />} />
              <Route path="/book" element={<BookPage />} />
              <Route path="/book/:id" element={<BookPage />} />
              <Route path="/restaurant/:id/book" element={<BookPage />} />

              <Route path="/guest" element={<ProtectedRoute allowedRoles={['customer', 'organizer', 'guest']} />}>
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
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="bookings/new" element={<CreateReservation />} />
                  <Route path="floor" element={<FloorView />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="waitlist" element={<Waitlist />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                  <Route path="tables" element={<Tables />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="billing" element={<Billing />} />
                  <Route path="notifications" element={<Automations />} />
                  <Route path="settings" element={<Settings />} />
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
