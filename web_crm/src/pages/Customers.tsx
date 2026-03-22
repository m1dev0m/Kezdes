import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Download,
    ChevronRight,
    Mail,
    Phone,
    Calendar,
    Star
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { useI18n } from '@/i18n';

interface Customer {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    visits_count?: number;
    total_bookings?: number;
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
            params.set('ordering', '-last_visit');
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
        const visits = (c.visits_count ?? c.total_bookings ?? 0);
        const isVip = visits >= 5 || c.is_vip;
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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{t('customers.title')}</h1>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1.5 opacity-80">{t('customers.manageRelationships')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] border-slate-100 bg-white flex items-center gap-2" onClick={handleExport}>
                        <Download className="w-3 h-3 opacity-60" /> {t('customers.export')}
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {(['all', 'vip', 'regular'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setSegment(s)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap flex items-center gap-2 border ${segment === s
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                            : 'bg-white text-slate-400 border-slate-100 hover:text-primary hover:bg-slate-50'}`}
                    >
                        {s === 'vip' && <Star size={10} className={segment === s ? 'text-amber-400 fill-amber-400' : 'text-amber-500'} />}
                        {getSegmentLabel(s)}
                    </button>
                ))}
            </div>

            <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative flex-1 max-w-md group w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder={t('customers.searchBy')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-primary transition-all outline-none text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 placeholder:text-slate-300"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-80 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            {filtered.length} {t('customers.guestsCount')}
                        </div>
                    </div>
                </div>

                <Table<Customer>
                    columns={[
                        {
                            key: 'info',
                            title: t('customers.guestInfo'),
                            render: (customer) => {
                                const visits = (customer.visits_count ?? customer.total_bookings ?? 0);
                                const isVip = visits >= 5 || customer.is_vip;
                                return (
                                    <div className="flex items-center gap-4 py-2">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-colors ${isVip
                                            ? 'bg-amber-50 text-amber-600 border border-amber-200 shadow-sm'
                                            : 'bg-slate-50 text-slate-900 border border-slate-200 group-hover:bg-primary group-hover:text-white shadow-sm'}`}>
                                            {customer.full_name?.charAt(0)?.toUpperCase() || 'G'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-black text-slate-900 tracking-tighter">{customer.full_name}</p>
                                                {isVip && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-700 text-[9px] font-black uppercase tracking-[0.3em]">
                                                        <Star size={10} className="fill-current" /> VIP
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-80">ID://{customer.id}</p>
                                        </div>
                                    </div>
                                );
                            }
                        },
                        {
                            key: 'contact',
                            title: t('customers.contact'),
                            render: (customer) => (
                                <div className="space-y-1.5 py-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] tabular-nums">
                                        <Mail size={14} className="opacity-40" /> {customer.email || '—'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] tabular-nums">
                                        <Phone size={14} className="opacity-40" /> {customer.phone || '—'}
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'visits',
                            title: t('customers.visits'),
                            align: 'center',
                            render: (customer) => {
                                const visits = (customer.visits_count ?? customer.total_bookings ?? 0);
                                const isVip = visits >= 5 || customer.is_vip;
                                return (
                                    <div className={`inline-flex items-center justify-center min-w-[3rem] h-8 rounded-lg font-black text-[11px] border tabular-nums ${isVip
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-slate-50 text-slate-900 border-slate-200'}`}>
                                        {visits}
                                    </div>
                                );
                            }
                        },
                        {
                            key: 'last_visit',
                            title: t('customers.lastVisit'),
                            render: (customer) => (
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] tabular-nums">
                                    <Calendar size={14} className="opacity-40" />
                                    {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : t('customers.never')}
                                </div>
                            )
                        },
                        {
                            key: 'tags',
                            title: t('customers.tags'),
                            render: (customer) => customer.tags ? (
                                <div className="flex flex-wrap gap-1.5 py-2">
                                    {customer.tags.split(',').map(tag => (
                                        <span
                                            key={tag}
                                            className="px-2.5 py-1 rounded-lg bg-slate-50 text-[9px] font-black text-slate-600 border border-slate-200 uppercase tracking-[0.3em]"
                                        >
                                            {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">—</span>
                            )
                        },
                        {
                            key: 'action',
                            title: '',
                            align: 'right',
                            render: () => (
                                <div className="flex items-center justify-end">
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-all transform group-hover:translate-x-1" />
                                </div>
                            )
                        }
                    ]}
                    data={filtered}
                    rowKey={(c) => c.id.toString()}
                    isLoading={loading}
                    onRowClick={(c) => navigate(`/app/customers/${c.id}`)}
                    pagination={{
                        currentPage: page,
                        totalPages,
                        onPageChange: setPage,
                        pageSize: pageSize,
                        totalItems: totalPages * pageSize // approximate or leave out
                    }}
                    className="border-none shadow-none rounded-none"
                    stickyHeader={false}
                />
            </div>
        </div>
    );
}
