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
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (access: string, refresh: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    }, []);

    const checkAuth = useCallback(async () => {
        if (localStorage.getItem('accessToken')) {
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
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        await checkAuth();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
