import api from '@/services/api';
import type { DashboardStats } from '../types';

export const analyticsService = {
    async getDashboardStats(): Promise<DashboardStats> {
        const res = await api.get<DashboardStats>('/analytics/dashboard/');
        return res.data;
    },

    async getSystemStats(): Promise<any> {
        const res = await api.get('/analytics/system/');
        return res.data;
    }
};
