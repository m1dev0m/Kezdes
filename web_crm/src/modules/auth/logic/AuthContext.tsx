import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

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
                // ignore
            }
            try {
                sessionStorage.removeItem(key);
            } catch {
                // ignore
            }
        },
    };

    const logout = useCallback(() => {
        safeStorage.removeItem('accessToken');
        safeStorage.removeItem('refreshToken');
        setUser(null);
    }, []);

    const checkAuth = useCallback(async () => {
        if (safeStorage.getItem('accessToken')) {
            try {
                const res = await api.get('/auth/me/');
                setUser(res.data);
            } catch {
                logout();
            }
        }
        setLoading(false);
    }, [logout]);

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
