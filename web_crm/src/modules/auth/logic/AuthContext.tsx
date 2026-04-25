import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { normalizeUserRole } from './roles';

interface UserProfile {
    role: string;
    restaurant?: number;
    phone?: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    restaurant?: number | null;
    phone?: string | null;
    restaurant_verified?: boolean;
    restaurant_setup_required?: boolean;
    profile?: UserProfile;
    owned_restaurant?: {
        id: number;
        name: string;
        description: string;
        address: string;
    } | null;
}

type AuthUserResponse = Partial<User> & {
    profile?: Partial<UserProfile> | null;
};

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (access: string, refresh: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const safeStorage = {
        getItem(key: string): string | null {
            try {
                return localStorage.getItem(key);
            } catch {
                try {
                    return sessionStorage.getItem(key);
                } catch {
                    return null;
                }
            }
        },
        setItem(key: string, value: string) {
            try {
                localStorage.setItem(key, value);
                return;
            } catch {
                try {
                    sessionStorage.setItem(key, value);
                } catch {
                    return;
                }
            }
        },
        removeItem(key: string) {
            try {
                localStorage.removeItem(key);
            } catch {
                
            }
            try {
                sessionStorage.removeItem(key);
            } catch {
                
            }
        },
    };

    const logout = useCallback(() => {
        safeStorage.removeItem('accessToken');
        safeStorage.removeItem('refreshToken');
        setUser(null);
    }, []);

    const normalizeUser = useCallback((data: unknown): User | null => {
        if (!data || typeof data !== 'object') return null;

        const payload = data as AuthUserResponse;
        const profile = payload.profile && typeof payload.profile === 'object' ? payload.profile : undefined;
        const resolvedRole = normalizeUserRole(payload.role ?? profile?.role);
        const restaurant = payload.restaurant ?? profile?.restaurant ?? null;
        const phone = payload.phone ?? profile?.phone ?? null;

        return {
            ...(payload as User),
            role: resolvedRole,
            restaurant,
            phone,
            profile: {
                role: resolvedRole,
                restaurant: restaurant ?? undefined,
                phone: phone ?? undefined,
            },
        };
    }, []);

    const checkAuth = useCallback(async () => {
        if (safeStorage.getItem('accessToken')) {
            try {
                const res = await api.get('/auth/me/');
                const normalizedUser = normalizeUser(res.data);
                if (normalizedUser) {
                    setUser(normalizedUser);
                } else {
                    logout();
                }
            } catch {
                logout();
            }
        }
        setLoading(false);
    }, [logout, normalizeUser]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (access: string, refresh: string) => {
        safeStorage.setItem('accessToken', access);
        safeStorage.setItem('refreshToken', refresh);
        await checkAuth();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
