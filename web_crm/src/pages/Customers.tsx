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
        loadCustomers();
    }, [page]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('page_size', String(pageSize));
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
        const matchesSearch = c.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            c.phone?.includes(debouncedSearch) ||
            c.email?.toLowerCase().includes(debouncedSearch.toLowerCase());
        const isVip = (c.total_bookings || 0) >= 5 || c.is_vip;
        if (segment === 'vip') return matchesSearch && isVip;
        if (segment === 'regular') return matchesSearch && !isVip;
        return matchesSearch;
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
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('customers.title')}</h1>
                    <p className="text-slate-500 font-medium mt-1">{t('customers.manageRelationships')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" className="flex items-center gap-2" onClick={handleExport}>
                        <Download className="w-4 h-4" /> {t('customers.export')}
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl w-fit shadow-inner">
                {(['all', 'vip', 'regular'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setSegment(s)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${segment === s ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        {s === 'vip' && <Star size={12} className="text-amber-500" />}
                        {getSegmentLabel(s)}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4 bg-slate-50/30 dark:bg-slate-800/20">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder={t('customers.searchBy')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-700 transition-all outline-none text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                            {filtered.length} {t('customers.guestsCount')}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('customers.guestInfo')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('customers.contact')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t('customers.visits')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('customers.lastVisit')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('customers.tags')}</th>
                                <th className="px-8 py-5 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-8 py-4">
                                            <Skeleton className="h-12 w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                            <Users size={32} className="text-slate-200" />
                                        </div>
                                        <p className="font-black text-slate-900 dark:text-white tracking-tight">{t('customers.noGuestsFound')}</p>
                                        <p className="text-sm text-slate-400 mt-1">{t('customers.guestsAutomaticallyAdded')}</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((customer) => {
                                    const isVip = (customer.total_bookings || 0) >= 5 || customer.is_vip;
                                    return (
                                        <tr
                                            key={customer.id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                                            onClick={() => navigate(`/app/customers/${customer.id}`)}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isVip ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'}`}>
                                                        {customer.full_name?.charAt(0)?.toUpperCase() || 'G'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-900 dark:text-white">{customer.full_name}</p>
                                                            {isVip && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-100 dark:border-amber-500/20">
                                                                    <Star size={10} /> VIP
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{customer.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                        <Mail size={14} className="text-slate-300" /> {customer.email || '—'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                        <Phone size={14} className="text-slate-300" /> {customer.phone || '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 rounded-lg font-bold text-xs ${isVip ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'}`}>
                                                    {customer.total_bookings || 0}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                    <Calendar size={14} className="text-slate-300" />
                                                    {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString() : t('customers.never')}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {customer.tags ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {customer.tags.split(',').map(tag => (
                                                            <span
                                                                key={tag}
                                                                className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-700"
                                                            >
                                                                {tag.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">—</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <ChevronRight size={20} className="text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-all group-hover:translate-x-1 ml-auto" />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
                    <span className="text-xs font-medium text-slate-500">
                        {t('customers.page')} {page} {t('customers.of')} {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
