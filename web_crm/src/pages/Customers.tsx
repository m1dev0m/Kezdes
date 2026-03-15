import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Search,
    Download,
    ChevronRight,
    Mail,
    Phone,
    Calendar,
    ChevronLeft,
    Star
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n';

interface Customer {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    total_bookings: number;
    last_visit: string;
    notes: string;
    is_vip: boolean;
    tags?: string;
}

export default function Customers() {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [segment, setSegment] = useState<'all' | 'vip' | 'regular'>('all');
    const pageSize = 20;

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [segment, debouncedSearch]);

    useEffect(() => {
        loadCustomers();
    }, [page, debouncedSearch]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('page_size', String(pageSize));
            if (debouncedSearch.trim()) {
                params.set('search', debouncedSearch.trim());
            }
            const res = await api.get(`/crm/customers/?${params.toString()}`);
            if (res.data.results) {
                setCustomers(res.data.results);
                setTotalPages(Math.ceil((res.data.count || 0) / pageSize));
            } else {
                setCustomers(Array.isArray(res.data) ? res.data : []);
                setTotalPages(1);
            }
        } catch {
            toast.error(t('customers.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const res = await api.get('/crm/customers/export/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'customers.csv';
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success(t('customers.exportDownloaded'));
        } catch {
            toast.error(t('customers.exportNotAvailable'));
        }
    };

    const filtered = customers.filter(c => {
        const isVip = (c.total_bookings || 0) >= 5 || c.is_vip;
        if (segment === 'vip') return isVip;
        if (segment === 'regular') return !isVip;
        return true;
    });

    const getSegmentLabel = (s: string) => {
        switch (s) {
            case 'all': return t('customers.filterAll');
            case 'vip': return t('customers.filterVip');
            case 'regular': return t('customers.filterRegular');
            default: return s;
        }
    };

    return (
        <div className="space-y-4 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.2em] italic">{t('customers.title')}</h1>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5 opacity-60">{t('customers.manageRelationships')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-100 bg-white flex items-center gap-2" onClick={handleExport}>
                        <Download className="w-3 h-3 opacity-60" /> {t('customers.export')}
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {(['all', 'vip', 'regular'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setSegment(s)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap flex items-center gap-2 border ${segment === s
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                            : 'bg-white text-slate-400 border-slate-100 hover:text-indigo-600 hover:bg-slate-50'}`}
                    >
                        {s === 'vip' && <Star size={10} className={segment === s ? 'text-amber-400 fill-amber-400' : 'text-amber-500'} />}
                        {getSegmentLabel(s)}
                    </button>
                ))}
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-50 dark:border-slate-900/50 flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder={t('customers.searchBy')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-600 transition-all outline-none text-[10px] font-black uppercase tracking-widest text-slate-900 placeholder:text-slate-300"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                            {filtered.length} {t('customers.guestsCount')}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/30 border-b border-slate-50">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{t('customers.guestInfo')}</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{t('customers.contact')}</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">{t('customers.visits')}</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{t('customers.lastVisit')}</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{t('customers.tags')}</th>
                                <th className="px-5 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={6} className="px-5 py-4">
                                            <Skeleton className="h-10 w-full rounded-lg" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-20 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <Users size={20} className="text-slate-200" />
                                        </div>
                                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">{t('customers.noGuestsFound')}</h3>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter opacity-60">{t('customers.guestsAutomaticallyAdded')}</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((customer) => {
                                    const isVip = (customer.total_bookings || 0) >= 5 || customer.is_vip;
                                    return (
                                        <tr
                                            key={customer.id}
                                            className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                                            onClick={() => navigate(`/app/customers/${customer.id}`)}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black transition-colors ${isVip
                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100/50'
                                                        : 'bg-slate-50 text-slate-900 border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                                        {customer.full_name?.charAt(0)?.toUpperCase() || 'G'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic">{customer.full_name}</p>
                                                            {isVip && (
                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-widest">
                                                                    <Star size={8} className="fill-current" /> VIP
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">ID://{customer.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-tight tabular-nums">
                                                        <Mail size={12} className="opacity-30" /> {customer.email || '—'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-tight tabular-nums">
                                                        <Phone size={12} className="opacity-30" /> {customer.phone || '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className={`inline-flex items-center justify-center min-w-[2.5rem] h-6 rounded-md font-black text-[10px] border tabular-nums ${isVip
                                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                    : 'bg-slate-50 text-slate-900 border-slate-100'}`}>
                                                    {customer.total_bookings || 0}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest tabular-nums italic">
                                                    <Calendar size={12} className="opacity-30" />
                                                    {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : t('customers.never')}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {customer.tags ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {customer.tags.split(',').map(tag => (
                                                            <span
                                                                key={tag}
                                                                className="px-2 py-0.5 rounded-md bg-slate-50 text-[8px] font-black text-slate-500 border border-slate-100 uppercase tracking-widest"
                                                            >
                                                                {tag.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest opacity-40">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end">
                                                    <ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-600 transition-all transform group-hover:translate-x-1" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-50 dark:border-slate-900/50 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                        {t('customers.page')} {page} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 w-8 p-0 rounded-lg border-slate-100 bg-white">
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0 rounded-lg border-slate-100 bg-white">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
