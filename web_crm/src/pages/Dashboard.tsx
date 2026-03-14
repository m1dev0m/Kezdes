import { useState, useEffect } from 'react';
import {
    CalendarDays,
    Receipt,
    Percent,
    ArrowRight,
    RefreshCw,
    TrendingUp,
    UserCheck,
    Target,
    History as HistoryIcon,
    Armchair,
    Clock,
    CheckCircle
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '@/services/api';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n/index.tsx';
import { KpiCard } from '@/components/KpiCard';
import { useDashboardStats } from '@/modules/analytics/logic/useDashboardStats';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const { t } = useI18n();
    const { stats, loading, refreshing, refresh } = useDashboardStats();
    const [recentBookings, setRecentBookings] = useState<any[]>([]);

    useEffect(() => {
        const loadRecent = async () => {
            try {
                const bRes = await api.get('/bookings/my_restaurant/?limit=5');
                const data = bRes.data;
                setRecentBookings(Array.isArray(data) ? data.slice(0, 5) : data.results?.slice(0, 5) || []);
            } catch (err) {
                console.error("Failed to load recent bookings", err);
            }
        };
        loadRecent();
    }, []);

    if (loading) {
        return (
            <div className="space-y-10">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Skeleton className="h-48 w-full rounded-[2.5rem]" count={4} />
                </div>
            </div>
        );
    }

    const cards = [
        {
            label: t('dashboard.bookingsToday'),
            value: stats?.bookings_today ?? 0,
            icon: CalendarDays,
            color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10',
        },
        {
            label: t('dashboard.upcomingBookings'),
            value: stats?.upcoming_bookings ?? 0,
            icon: Clock,
            color: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10',
        },
        {
            label: t('dashboard.occupiedTables'),
            value: stats?.occupied_tables ?? 0,
            icon: Armchair,
            color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10',
        },
        {
            label: t('dashboard.availableTables'),
            value: stats?.available_tables ?? 0,
            icon: CheckCircle,
            color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
        },
        {
            label: t('dashboard.confirmationRate'),
            value: `${stats?.confirmation_rate ?? 0}%`,
            icon: Percent,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
        },
        {
            label: t('dashboard.repeatCustomers'),
            value: `${stats?.repeat_customer_rate ?? 0}%`,
            icon: UserCheck,
            color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
        },
    ];

    const chartData = stats?.weekly_chart?.length ? stats.weekly_chart : [];

    return (
        <div className="space-y-10 pb-12">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('dashboard.title')}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing}>
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        <span className="ml-2">{refreshing ? t('dashboard.syncing') : t('dashboard.refresh')}</span>
                    </Button>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {cards.map((card, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.07 }}
                    >
                        <KpiCard
                            label={card.label}
                            value={card.value}
                            icon={card.icon}
                            iconBgClassName={card.color}
                            className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                        />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2rem] p-8 shadow-premium dark:shadow-none">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t('dashboard.bookingTrends')}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Volume Growth</p>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4300FF" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#4300FF" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', background: '#0F172A', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="#4300FF" strokeWidth={5} fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Revenue</p>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">₸{(stats?.revenue || 0).toLocaleString()}</h4>
                                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[10px] mt-2 bg-emerald-50 w-fit px-2 py-0.5 rounded-lg">
                                    <TrendingUp size={12} /> +24% vs Prev
                                </div>
                            </div>
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-500">
                                <Receipt size={32} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Target</p>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">84%</h4>
                                <div className="mt-4 w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: '84%' }}></div>
                                </div>
                            </div>
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-500">
                                <Target size={32} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm flex flex-col h-full">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('dashboard.recentGuests')}</h3>
                            <Link to="/app/bookings" className="text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors flex items-center gap-1">{t('dashboard.viewAll')} <ArrowRight size={12} /></Link>
                        </div>
                        <div className="space-y-6 flex-1">
                            {recentBookings.length === 0 ? (
                                <div className="py-12 text-center text-slate-300">
                                    <HistoryIcon size={32} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">{t('dashboard.noRecentActivity')}</p>
                                </div>
                            ) : (
                                recentBookings.map((b: any, j) => (
                                    <motion.div
                                        key={b.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + j * 0.1 }}
                                        className="flex items-center justify-between group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary font-black text-xs group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                {b.user_name?.charAt(0)?.toUpperCase() || 'G'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[100px]">{b.user_name || 'Guest'}</p>
                                                    {b.guests >= 4 && (
                                                        <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Group</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{b.time?.substring(0, 5)} • {b.guests}p</p>
                                            </div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${b.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
