import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { useI18n } from '@/i18n/index.tsx';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle, Armchair, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, confirmed: 0, seated: 0 });

    const fetchData = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await api.get(`/bookings/my_restaurant/?date=${today}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setBookings(data);

            const confirmed = data.filter((b: any) => ['confirmed', 'approved', 'seated'].includes(b.status)).length;
            const seated = data.filter((b: any) => b.status === 'seated').length;
            setStats({ total: data.length, confirmed, seated });
            setError(null);
        } catch {
            setError("Не удалось загрузить данные");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div className="space-y-6 pb-12">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('dashboard.title')}</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Операции на сегодня</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchData(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 text-slate-700 shadow-sm"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin text-slate-900" : "text-slate-400"} />
                    <span className={loading ? "text-slate-900" : ""}>Обновить</span>
                </button>
            </header>

            {loading && !bookings.length ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-white rounded-xl animate-pulse border border-slate-200 shadow-sm"></div>
                    ))}
                    <div className="md:col-span-3 h-96 bg-white rounded-xl animate-pulse border border-slate-200 shadow-sm"></div>
                </div>
            ) : error ? (
                <div className="p-6 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 flex items-center gap-4 shadow-sm">
                    <AlertCircle size={24} />
                    <p className="font-semibold">{error}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Counters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between"
                        >
                            <div>
                                <p className="text-slate-500 text-sm font-medium mb-1">Всего броней</p>
                                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                                <CalendarDays size={24} />
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                            className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between"
                        >
                            <div>
                                <p className="text-slate-500 text-sm font-medium mb-1">Подтверждено</p>
                                <p className="text-3xl font-bold text-emerald-600">{stats.confirmed}</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                <CheckCircle size={24} />
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between"
                        >
                            <div>
                                <p className="text-slate-500 text-sm font-medium mb-1">За столом</p>
                                <p className="text-3xl font-bold text-[#0F172A]">{stats.seated}</p>
                            </div>
                            <div className="w-12 h-12 bg-[#F1F5F9] rounded-2xl flex items-center justify-center text-[#0F172A]">
                                <Armchair size={24} />
                            </div>
                        </motion.div>
                    </div>

                    {/* Today's Bookings */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: 0.15 }}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Расписание на сегодня</h2>
                            <p className="text-sm font-medium text-slate-500">{bookings.length} бронирований</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {bookings.length === 0 ? (
                                <div className="p-20 text-center space-y-4">
                                    <CalendarDays size={48} className="mx-auto text-slate-300" />
                                    <p className="text-slate-500 font-semibold text-sm">Бронирований на сегодня нет</p>
                                </div>
                            ) : (
                                bookings.map((b, i) => (
                                    <motion.div
                                        key={b.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2, delay: i * 0.03 }}
                                        className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer"
                                        onClick={() => navigate('/app/bookings')}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                                {b.user_name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-base tracking-tight">{b.user_name}</h4>
                                                <p className="text-sm text-slate-500 font-medium mt-0.5">
                                                    {b.time?.substring(0, 5)} • {b.guests} PAX {b.table_number && `• Table ${b.table_number}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${['confirmed', 'approved'].includes(b.status)
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    b.status === 'seated'
                                                        ? 'bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]' :
                                                        b.status === 'pending'
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}>
                                                {b.status === 'approved' ? 'Confirmed' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                            </div>
                                            <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-600 transition-all translate-x-0 group-hover:translate-x-1" />
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
