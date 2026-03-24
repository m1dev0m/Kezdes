import { useState, useEffect } from 'react';
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
        const timeout = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadCustomers = async () => {
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('search', debouncedSearch);
            params.set('ordering', '-last_visit');

            const res = await api.get(`/crm/customers/?${params.toString()}`);
            setCustomers(res.data.results || (Array.isArray(res.data) ? res.data : []));
            setError(null);
        } catch {
            setError("Failed to fetch guest database");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
        const interval = setInterval(loadCustomers, 15000);
        return () => clearInterval(interval);
    }, [debouncedSearch]);

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
        <div className="space-y-gap pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-gap mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('customers.title')}</h1>
                    <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-1">CRM Database Manager</p>
                </div>
                <div className="flex gap-gap">
                    <button onClick={handleExport} className="px-6 py-2.5 bg-bg-surface border border-slate-100 rounded-card text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-gap">
                <div className="relative flex-1 group">
                    <Search className="absolute left-card top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-all" size={16} />
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="w-full pl-12 pr-6 py-4 bg-bg-surface border border-slate-100 rounded-card focus:border-primary transition-all shadow-sm outline-none text-sm font-medium"
                    />
                </div>
            </div>

            {loading && !customers.length ? (
                <div className="space-y-gap">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-bg-surface rounded-card animate-pulse border border-slate-50 shadow-sm"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-card bg-danger/5 text-danger rounded-card border border-danger/20 flex items-center gap-gap">
                    <AlertCircle size={24} />
                    <p className="font-bold">{error}</p>
                </div>
            ) : (
                <div className="bg-bg-surface rounded-card border border-slate-100 shadow-xl shadow-slate-900/5 divide-y divide-slate-50 overflow-hidden">
                    {customers.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <User size={64} className="mx-auto text-slate-100 opacity-50" />
                            <p className="text-text-muted uppercase font-bold tracking-[0.2em] text-xs transition-opacity">Database empty</p>
                        </div>
                    ) : (
                        customers.map((c, i) => (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, scale: 0.99, x: -5 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                className="p-card flex flex-col md:flex-row md:items-center justify-between gap-gap hover:bg-bg-primary/30 transition-all group cursor-pointer relative overflow-hidden"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl transition-all shadow-inner border border-slate-100 italic ${c.is_vip ? 'bg-warning/10 text-warning border-warning/20' : 'bg-bg-primary text-primary/40 group-hover:bg-primary group-hover:text-white group-hover:border-primary'}`}>
                                        {c.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold tracking-tight text-base">{c.full_name || 'Anonymous Guest'}</h4>
                                            {c.is_vip && <div className="px-2 py-0.5 rounded-lg bg-warning/10 text-warning text-[8px] font-black uppercase tracking-widest border border-warning/20">VIP ELITE</div>}
                                        </div>
                                        <div className="flex items-center gap-3 text-text-muted text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">
                                            <span className="flex items-center gap-1"><Phone size={10} /> {c.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-6 lg:gap-12 md:px-card border-slate-50">
                                    <div className="text-center group-hover:scale-105 transition-transform duration-300">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Visits</p>
                                        <p className="text-lg font-bold text-text-primary tabular-nums tracking-tighter shadow-sm font-sans">{c.visits_count || 0}</p>
                                    </div>
                                    <div className="text-center group-hover:scale-105 transition-transform duration-300">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Last seen</p>
                                        <p className="text-[12px] font-bold text-text-primary uppercase tracking-tighter opacity-80 tabular-nums font-sans">
                                            {c.last_visit ? new Date(c.last_visit).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : 'Never'}
                                        </p>
                                    </div>
                                    {c.notes && (
                                        <div className="max-w-[200px] text-left opacity-60 group-hover:opacity-100 transition-opacity">
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-2"><Star size={8} /> Guest Preference</p>
                                            <p className="text-[10px] font-medium leading-relaxed truncate group-hover:overflow-visible group-hover:whitespace-normal group-hover:break-words transition-all font-sans italic">“{c.notes}”</p>
                                        </div>
                                    )}
                                </div>

                                <button className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                    <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
