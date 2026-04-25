import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

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

function isLocalLikeHostname(hostname: string) {
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        /^10\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
}

function normalizeBaseUrl(value?: string | null) {
    return value?.trim().replace(/\/+$/, '') || null;
}

function shouldIgnoreLoopbackApiUrl(value: string | null) {
    if (!value || typeof window === 'undefined') return false;

    try {
        const parsed = new URL(value, window.location.origin);
        return !isLocalLikeHostname(window.location.hostname) && isLocalLikeHostname(parsed.hostname);
    } catch {
        return false;
    }
}

function getDefaultApiBaseUrl() {
    if (typeof window === 'undefined') return 'http://localhost:8000/api/v1';
    const { hostname, origin, port, protocol } = window.location;
    const devPorts = new Set(['3000', '4173', '5173', '5174', '5175']);

    if (isLocalLikeHostname(hostname) || devPorts.has(port)) {
        return `${protocol}//${hostname}:8000/api/v1`;
    }

    return `${origin.replace(/\/+$/, '')}/api/v1`;
}

const configuredApiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
    baseURL: shouldIgnoreLoopbackApiUrl(configuredApiBaseUrl)
        ? getDefaultApiBaseUrl()
        : configuredApiBaseUrl || getDefaultApiBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

api.interceptors.request.use(
    (config) => {
        const token = safeStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

interface ApiErrorResponse {
    detail?: string;
    error?: {
        message?: string;
        details?: Record<string, string[]>;
    };
    [key: string]: unknown;
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiErrorResponse>) => {
        const originalRequest = error.config as RetryableRequestConfig;
        
        if (!originalRequest) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = safeStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');

                const baseURL = (api.defaults.baseURL || '').replace(/\/$/, '');
                const res = await axios.post(`${baseURL}/auth/login/refresh/`, { refresh: refreshToken });

                safeStorage.setItem('accessToken', res.data.access);
                if (res.data.refresh) {
                    safeStorage.setItem('refreshToken', res.data.refresh);
                }

                originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                return api(originalRequest);
            } catch (err) {
                safeStorage.removeItem('accessToken');
                safeStorage.removeItem('refreshToken');

                const path = window.location.pathname || '';
                const isPublicAuthLikePage =
                    path === '/login' ||
                    path === '/register' ||
                    path.startsWith('/register-restaurant') ||
                    path.startsWith('/setup-restaurant');

                if (!isPublicAuthLikePage) {
                    window.location.href = '/login';
                }
                return Promise.reject(err);
            }
        }

        if (error.response?.data && typeof error.response.data === 'object') {
            const data = error.response.data as ApiErrorResponse;
            
            if (data.error && typeof data.error === 'object' && data.error.message) {
                data.detail = data.error.message;
            }
            
            if (!data.detail) {
                const lines: string[] = [];
                for (const [key, val] of Object.entries(data)) {
                    if (key === 'success' || key === 'error') continue;
                    if (Array.isArray(val)) {
                        lines.push(val.join(', '));
                    } else if (typeof val === 'string') {
                        lines.push(val);
                    }
                }
                if (lines.length > 0) {
                    data.detail = lines.join('\n');
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
