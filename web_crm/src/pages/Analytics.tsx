import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Download,
    CalendarDays,
    Percent,
    UserCheck,
    RefreshCw
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';
import { KpiCard } from '@/components/KpiCard';

interface AnalyticsData {
    bookings_today: number;
    bookings_month: number;
    occupancy_percent: number;
    revenue: number;
    confirmation_rate: number;
    repeat_customer_rate: number;
    avg_guests: number;
    weekly_chart: { name: string; total: number }[];
    daily_load: { name: string; bookings: number }[];
    no_show_month?: number;
    no_show_rate?: number;
    channels?: { id: string; name: string; count: number }[];
    retention_30_days?: number;
}

export default function Analytics() {
    const { t } = useI18n();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const res = await api.get('/analytics/dashboard/');
            setData(res.data);
        } catch {
            toast.error(t('analytics.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-40 rounded-lg" count={1} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-32 rounded-xl" count={4} />
                </div>
                <Skeleton className="h-72 rounded-xl" count={2} />
            </div>
        );
    }

    if (!data) return null;

    const kpis = [
        {
            label: t('analytics.bookingsToday'),
            value: data.bookings_today,
            icon: CalendarDays,
            color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
        },
        {
            label: t('analytics.monthlyBookings'),
            value: data.bookings_month,
            icon: TrendingUp,
            color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
        },
        {
            label: t('analytics.confirmationRate'),
            value: `${data.confirmation_rate}%`,
            icon: Percent,
            color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
        },
        {
            label: t('analytics.repeatCustomers'),
            value: `${data.repeat_customer_rate}%`,
            icon: UserCheck,
            color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
        },
    ];

    const secondaryKpis = [
        { label: t('analytics.revenue'), value: `₸${data.revenue.toLocaleString()}` },
        { label: t('analytics.occupancy'), value: `${data.occupancy_percent}%` },
        { label: t('analytics.avgGuests'), value: data.avg_guests },
        ...(data.no_show_month !== undefined ? [
            { label: t('analytics.noShowMonth'), value: data.no_show_month },
        ] : []),
        ...(data.no_show_rate !== undefined ? [
            { label: t('analytics.noShowRate'), value: `${data.no_show_rate}%` },
        ] : []),
        ...(data.retention_30_days !== undefined ? [
            { label: t('analytics.retention30'), value: `${data.retention_30_days}%` },
        ] : []),
    ];

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('analytics.title')}</h1>
                    <p className="text-slate-500 font-medium text-sm mt-0.5">{t('analytics.description')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="h-9 px-4 text-xs font-semibold rounded-lg" onClick={loadAnalytics}>
                        <RefreshCw size={14} className="mr-2" /> {t('analytics.refresh')}
                    </Button>
                    <Button variant="secondary" size="sm" className="h-9 px-4 text-xs font-semibold rounded-lg">
                        <Download size={14} className="mr-2" /> {t('analytics.export')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <KpiCard
                        key={i}
                        label={kpi.label}
                        value={kpi.value}
                        icon={kpi.icon}
                        iconBgClassName={kpi.color}
                    />
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {secondaryKpis.map((kpi, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</span>
                        <span className="text-base font-bold text-slate-900 tabular-nums">{kpi.value}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">{t('analytics.weeklyTrend')}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('analytics.weeklyTrendDesc')}</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={data.weekly_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorBookings)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">{t('analytics.dailyLoad')}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('analytics.dailyLoadDesc')}</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={data.daily_load} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Bar dataKey="bookings" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {data.channels && data.channels.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
                        {t('analytics.channelsTitle')}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                        {t('analytics.channelsDesc')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {data.channels.map((ch) => (
                            <div
                                key={ch.id}
                                className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center justify-between"
                            >
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {ch.name}
                                </span>
                                <span className="text-lg font-bold text-slate-900 tabular-nums">
                                    {ch.count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
