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
            <div className="space-y-8">
                <Skeleton className="h-10 w-48 rounded-xl" count={1} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Skeleton className="h-36 rounded-[2rem]" count={4} />
                </div>
                <Skeleton className="h-80 rounded-[2rem]" count={2} />
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
            color: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
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
            { label: t('analytics.noShowMonth', 'No‑show за месяц'), value: data.no_show_month },
        ] : []),
        ...(data.no_show_rate !== undefined ? [
            { label: t('analytics.noShowRate', 'Доля no‑show'), value: `${data.no_show_rate}%` },
        ] : []),
        ...(data.retention_30_days !== undefined ? [
            { label: t('analytics.retention30', 'Retention 30д'), value: `${data.retention_30_days}%` },
        ] : []),
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('analytics.title')}</h1>
                    <p className="text-slate-500 font-medium mt-1">{t('analytics.description')}</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={loadAnalytics}>
                        <RefreshCw size={14} className="mr-2" /> {t('analytics.refresh')}
                    </Button>
                    <Button variant="secondary">
                        <Download size={14} className="mr-2" /> {t('analytics.export')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {secondaryKpis.map((kpi, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">{kpi.value}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1">{t('analytics.weeklyTrend')}</h3>
                    <p className="text-xs font-bold text-slate-400 mb-6">{t('analytics.weeklyTrendDesc')}</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={data.weekly_chart}>
                            <defs>
                                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4300FF" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#4300FF" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0F172A',
                                    border: 'none',
                                    borderRadius: '16px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Area type="monotone" dataKey="total" stroke="#4300FF" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1">{t('analytics.dailyLoad')}</h3>
                    <p className="text-xs font-bold text-slate-400 mb-6">{t('analytics.dailyLoadDesc')}</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={data.daily_load}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{
                                    backgroundColor: '#0F172A',
                                    border: 'none',
                                    borderRadius: '16px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Bar dataKey="bookings" fill="#4300FF" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {data.channels && data.channels.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1">
                        {t('analytics.channelsTitle', 'Каналы бронирований')}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mb-6">
                        {t('analytics.channelsDesc', 'Сравнение CRM и публичных бронирований за месяц')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {data.channels.map((ch) => (
                            <div
                                key={ch.id}
                                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between"
                            >
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    {ch.name}
                                </span>
                                <span className="text-xl font-black text-slate-900 dark:text-white">
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
