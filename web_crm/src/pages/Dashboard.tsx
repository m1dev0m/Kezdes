import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useI18n } from '@/i18n/index.tsx';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle, Armchair, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
    const { t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, confirmed: 0, seated: 0 });

    const fetchData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await api.get(`/bookings/my_restaurant/?date=${today}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setBookings(data);

            const confirmed = data.filter((b: any) => ['confirmed', 'approved', 'seated'].includes(b.status)).length;
            const seated = data.filter((b: any) => b.status === 'seated').length;
            setStats({
                total: data.length,
                confirmed,
                seated
            });
            setError(null);
        } catch (err) {
            setError("Failed to fetch fresh data from API");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    // Читаю DESIGN.md. Использую: bg=var(--bg-primary) text=var(--text-primary) surface=var(--bg-surface) primary=var(--color-primary)
    return (
        <div className="space-y-gap pb-12">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('dashboard.title')}</h1>
                    <p className="text-sm text-text-muted mt-1 uppercase tracking-widest font-medium">Daily Operations Overview</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchData(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-slate-200 rounded-card text-xs font-bold uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 text-slate-600"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin text-primary" : "text-slate-400"} />
                    <span className={loading ? "text-primary" : ""}>Refresh</span>
                </button>
            </header>

            {loading && !bookings.length ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-gap">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-bg-surface rounded-card animate-pulse border border-slate-100 shadow-sm"></div>
                    ))}
                    <div className="md:col-span-3 h-96 bg-bg-surface rounded-card animate-pulse border border-slate-100 shadow-sm"></div>
                </div>
            ) : error ? (
                <div className="p-card bg-danger/5 text-danger rounded-card border border-danger/20 flex items-center gap-4">
                    <AlertCircle size={24} />
                    <p className="font-medium">{error}</p>
                </div>
            ) : (
                <div className="space-y-gap">
                    {/* Counters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-gap">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="p-card bg-bg-surface rounded-card shadow-sm border border-slate-100 flex items-center justify-between"
                        >
                            <div>
                                <p className="text-text-muted text-[10px] uppercase font-bold tracking-[0.2em] mb-1">Total Bookings</p>
                                <p className="text-3xl font-bold">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                                <CalendarDays size={24} />
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                            className="p-card bg-bg-surface rounded-card shadow-sm border border-slate-100 flex items-center justify-between"
                        >
                            <div>
                                <p className="text-text-muted text-[10px] uppercase font-bold tracking-[0.2em] mb-1">Confirmed</p>
                                <p className="text-3xl font-bold text-success">{stats.confirmed}</p>
                            </div>
                            <div className="w-12 h-12 bg-success/5 rounded-2xl flex items-center justify-center text-success">
                                <CheckCircle size={24} />
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="p-card bg-bg-surface rounded-card shadow-sm border border-slate-100 flex items-center justify-between"
                        >
                            <div>
                                <p className="text-text-muted text-[10px] uppercase font-bold tracking-[0.2em] mb-1">Seated</p>
                                <p className="text-3xl font-bold text-primary">{stats.seated}</p>
                            </div>
                            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                                <Armchair size={24} />
                            </div>
                        </motion.div>
                    </div>

                    {/* Today's Bookings */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: 0.15 }}
                        className="bg-bg-surface rounded-card shadow-sm border border-slate-100 overflow-hidden"
                    >
                        <div className="p-card border-b border-slate-100 flex justify-between items-center bg-white/50">
                            <h2 className="text-lg font-bold tracking-tight">Today&apos;s Schedule</h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{bookings.length} reservations</p>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {bookings.length === 0 ? (
                                <div className="p-20 text-center space-y-4">
                                    <CalendarDays size={48} className="mx-auto text-slate-100" />
                                    <p className="text-text-muted font-medium uppercase tracking-widest text-xs">No reservations for today</p>
                                </div>
                            ) : (
                                bookings.map((b, i) => (
                                    <motion.div
                                        key={b.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2, delay: i * 0.03 }}
                                        className="p-card flex items-center justify-between hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-bg-primary border border-slate-100 flex items-center justify-center text-primary font-bold text-lg shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                {b.user_name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm tracking-tight">{b.user_name}</h4>
                                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">
                                                    {b.time?.substring(0, 5)} • {b.guests} PAX {b.table_number && `• Table ${b.table_number}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${['confirmed', 'approved'].includes(b.status) ? 'bg-success/5 text-success border-success/10' :
                                                b.status === 'seated' ? 'bg-primary/5 text-primary border-primary/10' :
                                                    b.status === 'pending' ? 'bg-warning/5 text-warning border-warning/10' :
                                                        'bg-slate-50 text-text-muted border-slate-100'
                                                }`}>
                                                {b.status === 'approved' ? 'confirmed' : b.status}
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
