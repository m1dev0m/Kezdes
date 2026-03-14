import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';
import type { DashboardStats } from '../types';
import toast from 'react-hot-toast';

export function useDashboardStats() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await analyticsService.getDashboardStats();
            setStats(data);
        } catch {
            toast.error('Failed to load dashboard statistics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const refresh = () => {
        setRefreshing(true);
        loadData();
    };

    return { stats, loading, refreshing, refresh };
}
