const ROLE_ALIASES: Record<string, string> = {
  restaurant_admin: 'owner',
  restaurant_owner: 'owner',
  restaurant_staff: 'host',
  hostess: 'host',
  organizer: 'customer',
  guest: 'customer',
};

type AuthRouteUser = {
  role?: string | null;
  restaurant_verified?: boolean | null;
  restaurant_setup_required?: boolean | null;
  profile?: {
    role?: string | null;
  } | null;
};

export function normalizeUserRole(role?: string | null): string {
  if (!role) return '';
  return ROLE_ALIASES[role] ?? role;
}

export function resolveUserRole(user?: AuthRouteUser | null): string {
  return normalizeUserRole(user?.role ?? user?.profile?.role);
}

export function isRestaurantRole(role?: string | null): boolean {
  const normalizedRole = normalizeUserRole(role);
  return ['owner', 'manager', 'host', 'worker'].includes(normalizedRole);
}

export function isGuestRole(role?: string | null): boolean {
  return normalizeUserRole(role) === 'customer';
}

export function getPostAuthRedirectPath(user?: AuthRouteUser | null): string {
  const role = resolveUserRole(user);

  if (role === 'global_admin') return '/admin/dashboard';

  if (role === 'pending') return '/role-selection';

  if (isRestaurantRole(role)) {
    if (role !== 'worker' && !user?.restaurant_verified) {
      
      if (role === 'owner' && user?.restaurant_setup_required) {
        return '/setup-restaurant';
      }
      return '/register-restaurant/pending';
    }

    return '/app/dashboard';
  }

  if (isGuestRole(role)) return '/guest/dashboard';

  return '/role-selection';
}
