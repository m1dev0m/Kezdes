import { useState, useEffect, useMemo } from 'react';
import {
    XCircle,
    CalendarDays,
    Users,
    Phone,
    Clock,
    MessageSquare,
    ChevronRight,
    ChevronLeft,
    Search,
    CheckCircle2,
    MoreVertical,
    Pencil,
    Table2,
    Trash2,
    X,
    ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useI18n } from '@/i18n';
import { AxiosError } from 'axios';

interface Booking {
    id: number;
    restaurant: number;
    user_name: string;
    user_phone: string;
    date: string;
    time: string;
    guests: number;
    status: string;
    status_display: string;
    special_requests: string;
    table_number?: string;
    duration_minutes?: number;
    is_deposit_paid?: boolean;
    deposit_required?: string | number;
    preorder?: {
        id: number;
        total_amount?: number | string;
        status?: string;
        payment_status?: string;
    } | null;
    history?: Array<{
        id: number;
        event_type: string;
        status: string;
        from_status?: string | null;
        to_status?: string | null;
        from_table_number?: string | null;
        to_table_number?: string | null;
        actor_username?: string | null;
        changed_at: string;
    }>;
}

interface TableModel {
    id: number;
    number: string;
    seats: number;
    is_active: boolean;
}

export default function Bookings() {
    const { t } = useI18n();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'guests'>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [editForm, setEditForm] = useState({ guests: 0, time: '', special_requests: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [actionMenuId, setActionMenuId] = useState<number | null>(null);
    const [expandedTimelineId, setExpandedTimelineId] = useState<number | null>(null);
    const [quickRange, setQuickRange] = useState<'all' | 'today' | 'weekend'>('all');
    const navigate = useNavigate();

    const [tables, setTables] = useState<TableModel[]>([]);
    const [reassignBooking, setReassignBooking] = useState<Booking | null>(null);
    const [reassignLoading, setReassignLoading] = useState(false);
    const [availableTableIds, setAvailableTableIds] = useState<number[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<number | ''>('');
    const [reassignSaving, setReassignSaving] = useState(false);
    const pageSize = 15;

    useEffect(() => {
        loadBookings();
    }, [filter, page, dateFrom, dateTo, quickRange]);

    useEffect(() => {
        api.get('/restaurants/tables/')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setTables(data);
            })
            .catch(() => {
                setTables([]);
            });
    }, []);

    const tablesById = useMemo(() => {
        const m = new Map<number, TableModel>();
        for (const t of tables) m.set(t.id, t);
        return m;
    }, [tables]);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);
            const today = new Date();

            if (quickRange === 'today') {
                const iso = today.toISOString().split('T')[0];
                params.set('date', iso);
            } else if (quickRange === 'weekend') {
                const day = today.getDay() || 7; // 1‑7
                const diffToSat = 6 - day;
                const saturday = new Date(today);
                saturday.setDate(today.getDate() + diffToSat);
                const sunday = new Date(saturday);
                sunday.setDate(saturday.getDate() + 1);
                const satStr = saturday.toISOString().split('T')[0];
                const sunStr = sunday.toISOString().split('T')[0];
                params.set('date_from', satStr);
                params.set('date_to', sunStr);
            } else {
                if (dateFrom) params.set('date_from', dateFrom);
                if (dateTo) params.set('date_to', dateTo);
            }
            params.set('page', String(page));
            params.set('page_size', String(pageSize));
            const res = await api.get(`/bookings/my_restaurant/?${params.toString()}`);
            if (res.data.results) {
                setBookings(res.data.results);
                setTotalPages(Math.ceil((res.data.count || 0) / pageSize));
            } else {
                setBookings(Array.isArray(res.data) ? res.data : []);
                setTotalPages(1);
            }
        } catch {
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: number, action: string) => {
        try {
            await api.post(`/bookings/${id}/${action}/`);
            toast.success(t('bookings.successAction'));
            loadBookings();
            setConfirmAction(null);
            setActionMenuId(null);
        } catch (err: unknown) {
            const apiErr = err as AxiosError<{ detail?: string }>;
            toast.error(apiErr.response?.data?.detail || `Failed to ${action} booking`);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/bookings/${id}/`);
            toast.success(t('bookings.successDelete'));
            loadBookings();
            setConfirmAction(null);
            setActionMenuId(null);
        } catch {
            toast.error('Failed to delete booking');
        }
    };

    const handleEditSave = async () => {
        if (!editingBooking) return;
        setEditSaving(true);
        try {
            await api.patch(`/bookings/${editingBooking.id}/`, {
                guests: editForm.guests,
                time: editForm.time,
                special_requests: editForm.special_requests,
            });
            toast.success(t('bookings.successUpdate'));
            setEditingBooking(null);
            loadBookings();
        } catch {
            toast.error('Failed to update booking');
        } finally {
            setEditSaving(false);
        }
    };

    const openEdit = (b: Booking) => {
        setEditingBooking(b);
        setEditForm({ guests: b.guests, time: b.time, special_requests: b.special_requests || '' });
        setActionMenuId(null);
    };

    const openReassign = async (b: Booking) => {
        setActionMenuId(null);
        setReassignBooking(b);
        setSelectedTableId('');
        setAvailableTableIds([]);
        setReassignLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('restaurant_id', String(b.restaurant));
            params.set('date', b.date);
            params.set('time', b.time?.substring(0, 5));
            if (b.duration_minutes) params.set('duration_minutes', String(b.duration_minutes));
            const res = await api.get(`/bookings/available_tables/?${params.toString()}`);
            setAvailableTableIds(res.data.available_table_ids || []);
        } catch {
            toast.error('Failed to check table availability');
            setAvailableTableIds([]);
        } finally {
            setReassignLoading(false);
        }
    };

    const handleReassignSave = async () => {
        if (!reassignBooking) return;
        if (!selectedTableId) return;
        setReassignSaving(true);
        try {
            await api.post(`/bookings/${reassignBooking.id}/reassign_table/`, { table_id: selectedTableId });
            toast.success(t('bookings.successAction'));
            setReassignBooking(null);
            loadBookings();
        } catch (err: unknown) {
            const apiErr = err as AxiosError<{ detail?: string }>;
            toast.error(apiErr.response?.data?.detail || 'Failed to reassign table');
        } finally {
            setReassignSaving(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30';
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30';
            case 'payment_pending': return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30';
            case 'completed': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
            case 'rejected': case 'cancelled_by_user': case 'cancelled_by_restaurant': case 'no_show':
                return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/30';
            default: return 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timeout);
    }, [search]);

    let filteredBookings = bookings.filter(b =>
    (b.user_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        b.user_phone?.includes(debouncedSearch))
    );

    // Pending requests always appear first
    filteredBookings = [...filteredBookings].sort((a, b) => {
        const aPending = a.status === 'pending' ? 0 : 1;
        const bPending = b.status === 'pending' ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;

        if (sortBy === 'date') {
            const cmp = a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
            return sortDir === 'asc' ? cmp : -cmp;
        }
        const cmp = a.guests - b.guests;
        return sortDir === 'asc' ? cmp : -cmp;
    });

    const toggleSort = (col: 'date' | 'guests') => {
        if (sortBy === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(col);
            setSortDir('desc');
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('bookings.title')}</h1>
                    <p className="text-slate-500 font-medium mt-1">{t('bookings.manageAllBookings')}</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('bookings.searchBy')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-700 transition-all outline-none text-sm"
                    />
                </div>

                <div className="flex flex-col gap-3 items-start">
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setPage(1); setQuickRange('all'); }}
                            className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 outline-none"
                        />
                        <span className="text-slate-300 text-xs">→</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setPage(1); setQuickRange('all'); }}
                            className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 outline-none"
                        />
                        {(dateFrom || dateTo) && (
                            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-slate-400 hover:text-slate-700 transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => { setQuickRange('today'); setPage(1); }}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${quickRange === 'today'
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-300'
                                }`}
                        >
                            Сегодня
                        </button>
                        <button
                            onClick={() => { setQuickRange('weekend'); setPage(1); }}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${quickRange === 'weekend'
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-300'
                                }`}
                        >
                            Выходные
                        </button>
                        <button
                            onClick={() => { setQuickRange('all'); setPage(1); }}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${quickRange === 'all'
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-300'
                                }`}
                        >
                            Все даты
                        </button>
                    </div>
                </div>

                    <button
                        onClick={() => toggleSort('date')}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${sortBy === 'date' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
                    >
                        {t('bookings.date')} {sortBy === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                    <button
                        onClick={() => toggleSort('guests')}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${sortBy === 'guests' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
                    >
                        {t('bookings.guests')} {sortBy === 'guests' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar shadow-inner">
                {[
                    { id: 'all', label: t('bookings.statusAll') },
                    { id: 'pending', label: t('bookings.statusNew') },
                    { id: 'payment_pending', label: 'Ожидает оплаты' },
                    { id: 'approved', label: t('bookings.statusConfirmed') },
                    { id: 'completed', label: t('bookings.statusCompleted') },
                    { id: 'cancelled_by_user,cancelled_by_restaurant,rejected,no_show', label: t('bookings.statusCancelled') }
                ].map((s) => (
                    <button
                        key={s.id}
                        onClick={() => { setFilter(s.id); setPage(1); }}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === s.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full rounded-3xl" count={4} />
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-20 text-center">
                        <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{t('bookings.noBookings')}</h3>
                        <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm">{t('bookings.noMatch')}</p>
                    </div>
                ) : (
                    filteredBookings.map((booking) => (
                        <div key={booking.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group relative">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                <div className="flex items-center gap-4 lg:w-1/4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black text-lg">
                                        {booking.user_name?.charAt(0) || 'G'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{booking.user_name || 'Anonymous Guest'}</h3>
                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mt-0.5">
                                            <Phone className="w-3 h-3" />
                                            {booking.user_phone || 'No phone'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 lg:w-1/4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                            <CalendarDays className="w-4 h-4 text-slate-400" />
                                            {new Date(booking.date + 'T00:00:00').toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                                            <Clock className="w-4 h-4" />
                                            {booking.time?.substring(0, 5)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span className="font-bold text-slate-900 dark:text-white">{booking.guests}</span>
                                    </div>
                                </div>

                                <div className="lg:w-1/6 flex flex-col items-start gap-2">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-bold text-[10px] uppercase tracking-wider ${getStatusStyles(booking.status)}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                        {booking.status === 'payment_pending' ? 'Ожидает оплаты' : (booking.status_display || booking.status)}
                                    </div>

                                    {Number(booking.deposit_required) > 0 && booking.is_deposit_paid && (
                                        <div className="flex bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-lg">
                                            💰 Оплачено {Number(booking.deposit_required).toLocaleString()} ₸
                                        </div>
                                    )}
                                    {Number(booking.deposit_required) > 0 && !booking.is_deposit_paid && (
                                        <div className="flex bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-lg">
                                            ⏳ Депозит {Number(booking.deposit_required).toLocaleString()} ₸
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-2">
                                    {booking.special_requests && (
                                        <div className="flex items-start gap-2 text-slate-500 mb-2">
                                            <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p className="text-xs font-medium line-clamp-1 italic">{booking.special_requests}</p>
                                        </div>
                                    )}
                                    {booking.table_number && (
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Стол</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{booking.table_number}</span>
                                        </div>
                                    )}
                                    {booking.preorder && (
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest">
                                            <ShoppingBag className="w-3 h-3" />
                                            <span>Предзаказ</span>
                                            {booking.preorder.total_amount && (
                                                <span>₸{Number(booking.preorder.total_amount).toLocaleString()}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-2 lg:w-1/5 sticky bottom-0 lg:static bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm lg:backdrop-blur-0 px-2 py-2 lg:px-0 lg:py-0 rounded-2xl lg:rounded-none">
                                    {booking.status === 'pending' && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                                                onClick={() => setConfirmAction({ id: booking.id, action: 'reject' })}
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
                                                onClick={() => setConfirmAction({ id: booking.id, action: 'confirm' })}
                                            >
                                                <CheckCircle2 className="w-5 h-5" />
                                            </Button>
                                        </>
                                    )}
                                    {booking.status === 'approved' && (
                                        <Button
                                            variant="primary"
                                            className="text-[10px] uppercase font-black"
                                            onClick={() => setConfirmAction({ id: booking.id, action: 'complete' })}
                                        >
                                            {t('bookings.guestArrived')}
                                        </Button>
                                    )}
                                    {booking.status === 'payment_pending' && (
                                        <Button
                                            variant="secondary"
                                            className="text-[10px] uppercase font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/45"
                                            onClick={async () => {
                                                try {
                                                    await api.post(`/bookings/${booking.id}/pay_deposit/`);
                                                    toast.success("Депозит успешно оплачен");
                                                    loadBookings();
                                                } catch (e) {
                                                    toast.error("Ошибка при оплате депозита");
                                                }
                                            }}
                                        >
                                            Оплатить
                                        </Button>
                                    )}
                                    <div className="relative">
                                        <button
                                            className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                            onClick={() => setActionMenuId(actionMenuId === booking.id ? null : booking.id)}
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                        {actionMenuId === booking.id && (
                                            <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/5 dark:shadow-none z-50 overflow-hidden">
                                                <button
                                                    onClick={() => openReassign(booking)}
                                                    className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                                                >
                                                    <Table2 size={14} /> Пересадить
                                                </button>
                                                <button
                                                    onClick={() => openEdit(booking)}
                                                    className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                                                >
                                                    <Pencil size={14} /> {t('bookings.editBooking')}
                                                </button>
                                                <button
                                                    onClick={() => { setConfirmAction({ id: booking.id, action: 'delete' }); setActionMenuId(null); }}
                                                    className="w-full px-4 py-3 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3 transition-colors"
                                                >
                                                    <Trash2 size={14} /> {t('bookings.delete')}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        navigate('/app/messages', { state: { bookingId: booking.id } });
                                                        setActionMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                                                >
                                                    <MessageSquare size={14} /> Открыть чат
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                                <button
                                    onClick={() => setExpandedTimelineId(expandedTimelineId === booking.id ? null : booking.id)}
                                    className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    Timeline
                                </button>
                                <div className="text-[10px] font-bold text-slate-400">
                                    #{booking.id}
                                </div>
                            </div>

                            {expandedTimelineId === booking.id && (
                                <div className="mt-4 space-y-2">
                                    {(booking.history || []).length === 0 ? (
                                        <div className="text-xs font-medium text-slate-500">No events</div>
                                    ) : (
                                        (booking.history || []).map(ev => (
                                            <div key={ev.id} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-3">
                                                <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 mt-2" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                            {ev.event_type}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 shrink-0">
                                                            {new Date(ev.changed_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                                        {ev.actor_username ? `${ev.actor_username} • ` : ''}
                                                        {ev.from_status && ev.to_status && ev.from_status !== ev.to_status ? `${ev.from_status} → ${ev.to_status}` : ev.status}
                                                        {ev.from_table_number || ev.to_table_number ? ` • стол ${ev.from_table_number || '—'} → ${ev.to_table_number || '—'}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-500">
                    {t('bookings.page')} {page} {t('bookings.of')} {totalPages} • {filteredBookings.length} {t('bookings.results')}
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

            <ConfirmModal
                isOpen={!!confirmAction && confirmAction.action !== 'delete'}
                title={t('bookings.confirmActionTitle')}
                description={`${t('bookings.sureTo')} ${confirmAction?.action === 'reject' ? 'отклонить' :
                    confirmAction?.action === 'complete' ? 'завершить' : 'подтвердить'
                    } ${t('bookings.thisBooking')}`}
                onConfirm={() => confirmAction && handleAction(confirmAction.id, confirmAction.action)}
                onCancel={() => setConfirmAction(null)}
                confirmLabel={confirmAction?.action === 'reject' ? t('bookings.yesReject') : t('bookings.yesProceed')}
            />

            <ConfirmModal
                isOpen={!!confirmAction && confirmAction.action === 'delete'}
                title={t('bookings.deleteBookingTitle')}
                description={t('bookings.deleteBookingDesc')}
                onConfirm={() => confirmAction && handleDelete(confirmAction.id)}
                onCancel={() => setConfirmAction(null)}
                confirmLabel={t('bookings.deletePermanently')}
            />

            {editingBooking && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingBooking(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-8 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('bookings.editTitle')}</h3>
                            <button onClick={() => setEditingBooking(null)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('bookings.guestName')}</label>
                                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white">
                                    {editingBooking.user_name}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('bookings.guests')}</label>
                                <input
                                    type="number" min={1} max={50}
                                    value={editForm.guests}
                                    onChange={e => setEditForm(f => ({ ...f, guests: Number(e.target.value) }))}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-slate-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('bookings.time')}</label>
                                <input
                                    type="time"
                                    value={editForm.time?.substring(0, 5)}
                                    onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-slate-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('bookings.specialRequests')}</label>
                                <textarea
                                    value={editForm.special_requests}
                                    onChange={e => setEditForm(f => ({ ...f, special_requests: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-slate-500 transition-colors resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setEditingBooking(null)}>{t('bookings.cancel')}</Button>
                            <Button variant="primary" className="flex-1" onClick={handleEditSave} isLoading={editSaving}>{t('bookings.saveChanges')}</Button>
                        </div>
                    </div>
                </div>
            )}

            {reassignBooking && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReassignBooking(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-8 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Пересадить</h3>
                            <button onClick={() => setReassignBooking(null)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Бронь</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                {reassignBooking.user_name || 'Anonymous Guest'} • {reassignBooking.date} {reassignBooking.time?.substring(0, 5)} • {reassignBooking.guests} гостей
                            </div>
                        </div>

                        {reassignLoading ? (
                            <div className="text-sm font-medium text-slate-500">Loading...</div>
                        ) : (
                            <div className="space-y-2">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Стол</div>
                                <select
                                    value={selectedTableId}
                                    onChange={e => setSelectedTableId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-slate-500 transition-colors"
                                >
                                    <option value="">Выбрать стол</option>
                                    {availableTableIds.map(id => {
                                        const tinfo = tablesById.get(id);
                                        const label = tinfo ? `Стол ${tinfo.number} • ${tinfo.seats} мест` : `Table #${id}`;
                                        return (
                                            <option key={id} value={id}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                                {availableTableIds.length === 0 && (
                                    <div className="text-xs font-medium text-slate-500">Нет доступных столов</div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setReassignBooking(null)}>{t('bookings.cancel')}</Button>
                            <Button variant="primary" className="flex-1" onClick={handleReassignSave} isLoading={reassignSaving} disabled={!selectedTableId || reassignLoading || availableTableIds.length === 0}>Сохранить</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
