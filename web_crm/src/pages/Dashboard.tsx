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
import { useNavigate, Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n/index.tsx';
import { KpiCard } from '@/components/KpiCard';
import { useDashboardStats } from '@/modules/analytics/logic/useDashboardStats';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const { t } = useI18n();
    const navigate = useNavigate();
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
        <div className="space-y-10 pb-12 transition-all">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-800/80 pb-8"
            >
                <div>
                    <h1 className="text-[28px] font-black text-slate-900 tracking-tighter uppercase italic leading-none">{t('dashboard.title')}</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-3 opacity-40 italic">Venue Performance Overview</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={refresh}
                        disabled={refreshing}
                        className="flex items-center gap-3 px-6 py-3.5 bg-white border border-slate-100 rounded-[18px] text-[10px] font-black uppercase tracking-widest hover:border-indigo-600 transition-all shadow-sm active:scale-95 italic"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? t('dashboard.syncing') : t('dashboard.refresh')}
                    </button>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {cards.map((card, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <KpiCard
                            label={card.label}
                            value={card.value}
                            icon={card.icon}
                            iconBgClassName={card.color}
                        />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm overflow-hidden relative">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-[12px] font-black text-slate-900 tracking-[0.2em] uppercase italic leading-none">{t('dashboard.bookingTrends')}</h3>
                                <div className="flex items-center gap-2 mt-4 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100/50 w-fit">
                                    <TrendingUp size={12} className="text-emerald-500" />
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">+12% vs last month</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[300px] w-full min-w-0 min-h-[300px]">
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.4} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }}
                                        dy={15}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 4', opacity: 0.5 }}
                                        contentStyle={{ borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', background: '#0f172a', color: '#fff', padding: '12px 16px' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', padding: '4px 0' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 900, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" animationDuration={2000} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-100 rounded-[32px] p-8 flex items-center justify-between shadow-sm group hover:border-indigo-600 transition-all">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 italic opacity-60">Monthly Revenue</p>
                                <h4 className="text-4xl font-black text-slate-900 tracking-tighter leading-none italic">₸{(stats?.revenue || 0).toLocaleString()}</h4>
                                <div className="flex items-center gap-2 text-emerald-600 font-black text-[9px] mt-4 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100/50 uppercase tracking-widest italic">
                                    <TrendingUp size={12} /> +24% vs Prev
                                </div>
                            </div>
                            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-[20px] flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                <Receipt size={24} />
                            </div>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-[32px] p-8 flex items-center justify-between shadow-sm group hover:border-indigo-600 transition-all">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 italic opacity-60">Monthly Target</p>
                                <h4 className="text-4xl font-black text-slate-900 tracking-tighter leading-none italic">84%</h4>
                                <div className="mt-6 w-48 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-2000 ease-out" style={{ width: '84%' }}></div>
                                </div>
                            </div>
                            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-[20px] flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                <Target size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm flex flex-col h-full hover:border-indigo-600 transition-all">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-[12px] font-black text-slate-900 tracking-[0.2em] uppercase italic leading-none">{t('dashboard.recentGuests')}</h3>
                            <Link to="/app/bookings" className="text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] transition-all flex items-center gap-2 group italic">
                                {t('dashboard.viewAll')}
                                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <div className="space-y-6 flex-1">
                            {recentBookings.length === 0 ? (
                                <div className="py-16 text-center text-slate-300">
                                    <HistoryIcon size={32} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] italic">{t('dashboard.noRecentActivity')}</p>
                                </div>
                            ) : (
                                recentBookings.map((b: any, j) => (
                                    <motion.div
                                        key={b.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + j * 0.05 }}
                                        className="flex items-center justify-between group cursor-pointer"
                                        onClick={() => navigate('/app/bookings')}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-[16px] bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600 font-black text-lg italic shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                {b.user_name?.charAt(0)?.toUpperCase() || 'G'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[13px] font-black text-slate-900 tracking-tight truncate max-w-[120px] uppercase italic">{b.user_name || 'Guest'}</p>
                                                    {b.guests >= 4 && (
                                                        <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest leading-none scale-75 origin-left">VIP</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 tabular-nums uppercase tracking-[0.1em] mt-1.5 opacity-60 italic leading-none">{b.time?.substring(0, 5)} • {b.guests} PAX</p>
                                            </div>
                                        </div>
                                        <div className={`w-1.5 h-1.5 rounded-full ${(b.status === 'confirmed' || b.status === 'approved') ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : b.status === 'pending' ? 'bg-amber-400 shadow-lg shadow-amber-400/50' : 'bg-slate-100'}`} />
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
