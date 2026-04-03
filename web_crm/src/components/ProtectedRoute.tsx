import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { getPostAuthRedirectPath, isGuestRole, isRestaurantRole, normalizeUserRole } from '@/modules/auth/logic/roles';

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

    const role = normalizeUserRole(user.role);
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

    const normalizedAllowedRoles = allowedRoles?.map(normalizeUserRole);

    if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(role)) {
        if (role === 'pending') {
            return <Navigate to="/role-selection" replace />;
        }
        if (role === 'global_admin' || isRestaurantRole(role) || isGuestRole(role)) {
            return <Navigate to={getPostAuthRedirectPath(user)} replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
