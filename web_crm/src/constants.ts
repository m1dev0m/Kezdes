export const DEFAULT_COORDS = {
    latitude: 43.238949,
    longitude: 76.889709,
};

export const BACKEND_ROLES = {
    OWNER: 'owner',
    MANAGER: 'manager',
    HOST: 'host',
    WORKER: 'worker',
    CUSTOMER: 'customer',
    GLOBAL_ADMIN: 'global_admin',
} as const;

export type BackendRole = typeof BACKEND_ROLES[keyof typeof BACKEND_ROLES];
