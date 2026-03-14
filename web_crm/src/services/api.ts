import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
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
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');

                const res = await axios.post(`${api.defaults.baseURL}/auth/login/refresh/`, { refresh: refreshToken });

                localStorage.setItem('accessToken', res.data.access);
                if (res.data.refresh) {
                    localStorage.setItem('refreshToken', res.data.refresh);
                }

                originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                return api(originalRequest);
            } catch (err) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');

                const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
                if (!isAuthPage) {
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
