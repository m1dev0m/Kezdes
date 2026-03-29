import { useState, useEffect } from 'react';
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
import { useI18n } from '@/i18n';

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
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#0047FF]/20 border-t-[#0047FF]"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Synthesizing intelligence...</span>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="max-w-[1440px] mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">{t('analytics.title')}</h1>
                    <p className="text-lg text-slate-500 font-medium">Platform-wide operational performance and guest intelligence.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button
                        onClick={loadAnalytics}
                        className="flex-1 md:flex-none h-14 px-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:border-[#0047FF] hover:text-[#0047FF] transition-all flex items-center justify-center gap-3"
                    >
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                        {t('analytics.refresh')}
                    </button>
                    <button className="flex-1 md:flex-none h-14 px-8 rounded-2xl bg-[#0047FF] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0039cc] transition-all shadow-2xl shadow-[#0047FF]/20 flex items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        {t('analytics.export')}
                    </button>
                </div>
            </header>

            {/* Primary KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiTile label={t('analytics.bookingsToday')} value={data.bookings_today} icon="calendar_today" trend="+12%" />
                <KpiTile label={t('analytics.monthlyBookings')} value={data.bookings_month} icon="trending_up" trend="+5.4%" color="text-emerald-500" />
                <KpiTile label={t('analytics.confirmationRate')} value={`${data.confirmation_rate}%`} icon="verified" trend="Stable" color="text-amber-500" />
                <KpiTile label={t('analytics.repeatCustomers')} value={`${data.repeat_customer_rate}%`} icon="person_add" trend="+8%" color="text-indigo-500" />
            </div>

            {/* Visual Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue/Trend Area Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('analytics.weeklyTrend')}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">7-Day Transactional Volume</p>
                        </div>
                        <div className="p-3 bg-[#0047FF]/5 rounded-2xl">
                            <span className="material-symbols-outlined text-[#0047FF]">query_stats</span>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.weekly_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0047FF" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#0047FF" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px' }}
                                    itemStyle={{ fontWeight: 900, color: '#0047FF' }}
                                />
                                <Area type="monotone" dataKey="total" stroke="#0047FF" strokeWidth={4} fillOpacity={1} fill="url(#colorTrend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Daily Load Bar Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('analytics.dailyLoad')}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Peak Distribution</p>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
                            <span className="material-symbols-outlined text-indigo-500">leaderboard</span>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.daily_load} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px' }}
                                />
                                <Bar dataKey="bookings" fill="#4C51BF" radius={[12, 12, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Channels & Efficiency Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Channel Performance */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-10">
                    <header className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('analytics.channelsTitle')}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('analytics.channelsDesc')}</p>
                    </header>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {data.channels?.map((ch) => (
                            <div key={ch.id} className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ch.name}</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{ch.count}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Efficiency Sideboard */}
                <div className="bg-[#0047FF] rounded-[2.5rem] p-10 text-white space-y-8 relative overflow-hidden shadow-2xl shadow-[#0047FF]/20">
                    <div className="absolute -top-20 -right-20 size-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="relative z-10 space-y-6">
                        <header className="space-y-1">
                            <h3 className="text-xl font-black uppercase tracking-widest italic">Core Efficiency</h3>
                            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Global Operational Index</p>
                        </header>

                        <div className="space-y-6">
                            <EfficiencyRow label="Resource Occupancy" value={`${data.occupancy_percent}%`} />
                            <EfficiencyRow label="Guest Retention" value={`${data.retention_30_days || 0}%`} />
                            <EfficiencyRow label="Avg Party Size" value={String(data.avg_guests)} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiTile({ label, value, icon, trend, color = 'text-[#0047FF]' }: { label: string; value: string | number; icon: string; trend: string; color?: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 group hover:-translate-y-1 transition-all">
            <div className="flex justify-between items-start">
                <div className={`p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl ${color} transition-colors group-hover:bg-[#0047FF] group-hover:text-white`}>
                    <span className="material-symbols-outlined text-[24px]">{icon}</span>
                </div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-3 py-1 rounded-full">{trend}</span>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
                <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{value}</h4>
            </div>
        </div>
    );
}

function EfficiencyRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/80">{label}</span>
            <span className="text-2xl font-black italic tracking-tighter">{value}</span>
        </div>
    );
}
