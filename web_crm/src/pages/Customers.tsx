import { useState, useEffect, useCallback } from 'react';
import { Search, Phone, Star, Download, AlertCircle, ChevronRight, User } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n/index.tsx';
import { motion } from 'framer-motion';

interface Customer {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    visits_count: number;
    last_visit: string;
    notes: string;
    is_vip: boolean;
}

export default function Customers() {
    const { t } = useI18n();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search), 200);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadCustomers = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('search', debouncedSearch);
            params.set('ordering', '-last_visit');

            const res = await api.get(`/crm/customers/?${params.toString()}`);
            setCustomers(res.data.results || (Array.isArray(res.data) ? res.data : []));
            setError(null);
        } catch {
            setError("Не удалось загрузить гостей");
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        loadCustomers();
        const interval = setInterval(loadCustomers, 15000);
        return () => clearInterval(interval);
    }, [loadCustomers]);

    const handleExport = async () => {
        try {
            const res = await api.get('/crm/customers/export/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'guest_list.csv';
            a.click();
            toast.success("Guest list exported");
        } catch {
            toast.error("Export failed");
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('customers.title')}</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">База гостей</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleExport} className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:ring-1 focus:ring-slate-900 transition-all flex items-center gap-2 active:scale-95">
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Поиск по имени или телефону..."
                        className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all shadow-sm outline-none text-sm text-slate-900"
                    />
                </div>
            </div>

            {loading && !customers.length ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-slate-200 shadow-sm"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-6 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 flex items-center gap-4">
                    <AlertCircle size={24} />
                    <p className="font-semibold">{error}</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                    {customers.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <User size={64} className="mx-auto text-slate-300" />
                            <p className="text-slate-500 font-semibold text-sm">Гостей пока нет</p>
                        </div>
                    ) : (
                        customers.map((c, i) => (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, scale: 0.99, x: -5 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50 transition-colors group cursor-pointer relative overflow-hidden"
                            >
                                <div className="flex items-center gap-5 flex-1">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg transition-all border ${c.is_vip ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900'}`}>
                                        {c.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-slate-900 tracking-tight text-base">{c.full_name || 'Anonymous Guest'}</h4>
                                            {c.is_vip && <div className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">VIP ELITE</div>}
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium mt-1">
                                            <span className="flex items-center gap-1.5"><Phone size={14} /> {c.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-8 lg:gap-14 md:px-8">
                                    <div className="text-center group-hover:scale-105 transition-transform duration-300">
                                        <p className="text-xs font-medium text-slate-500 mb-1">Визиты</p>
                                        <p className="text-xl font-bold text-slate-900">{c.visits_count || 0}</p>
                                    </div>
                                    <div className="text-center group-hover:scale-105 transition-transform duration-300">
                                        <p className="text-xs font-medium text-slate-500 mb-1">Последний визит</p>
                                        <p className="text-sm font-semibold text-slate-900 mt-2">
                                            {c.last_visit ? new Date(c.last_visit).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : '—'}
                                        </p>
                                    </div>
                                    {c.notes && (
                                        <div className="max-w-[200px] text-left opacity-70 group-hover:opacity-100 transition-opacity hidden md:block">
                                            <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5"><Star size={12} className="text-slate-400" /> Note</p>
                                            <p className="text-sm text-slate-700 italic truncate group-hover:overflow-visible group-hover:whitespace-normal group-hover:break-words transition-all">“{c.notes}”</p>
                                        </div>
                                    )}
                                </div>

                                <button className="h-10 w-10 shrink-0 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all">
                                    <ChevronRight size={20} />
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
