import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';

export const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const role = user.role;
    // Only real backend roles that belong to restaurant staff (excludes worker — worker has no restaurant_verified requirement)
    const isRestaurantStaff = ['owner', 'manager', 'host'].includes(role);

    if (isRestaurantStaff && !user.restaurant_verified) {
        if (location.pathname.startsWith('/register-restaurant') || location.pathname.startsWith('/setup-restaurant')) {
            return <Outlet />;
        }
        if (user.restaurant_setup_required) {
            return <Navigate to="/setup-restaurant" replace />;
        }
        return <Navigate to="/register-restaurant/pending" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        if (role === 'global_admin') {
            return <Navigate to="/admin/dashboard" replace />;
        }
        if (isRestaurantStaff || role === 'worker') {
            return <Navigate to="/app/dashboard" replace />;
        }
        if (role === 'customer') {
            return <Navigate to="/guest/dashboard" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
