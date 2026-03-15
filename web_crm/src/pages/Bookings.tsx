import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XCircle,
    CalendarDays,
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
    Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
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
    const [sortBy] = useState<'date' | 'guests'>('date');
    const [sortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [editForm, setEditForm] = useState({ guests: 0, time: '', special_requests: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [actionMenuId, setActionMenuId] = useState<number | null>(null);

    const [quickRange, setQuickRange] = useState<'all' | 'today' | 'weekend' | 'now' | 'plus30'>('all');
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
            } else if (quickRange === 'now') {
                const isoDate = today.toISOString().split('T')[0];
                const timeStr = today.getHours().toString().padStart(2, '0') + ':' + today.getMinutes().toString().padStart(2, '0');
                params.set('date', isoDate);
                params.set('time_from', timeStr);
            } else if (quickRange === 'plus30') {
                const isoDate = today.toISOString().split('T')[0];
                const later = new Date(today.getTime() + 30 * 60000);
                const timeFrom = today.getHours().toString().padStart(2, '0') + ':' + today.getMinutes().toString().padStart(2, '0');
                const timeTo = later.getHours().toString().padStart(2, '0') + ':' + later.getMinutes().toString().padStart(2, '0');
                params.set('date', isoDate);
                params.set('time_from', timeFrom);
                params.set('time_to', timeTo);
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
        if (actionSubmitting) return;
        setActionSubmitting(true);
        try {
            await api.post(`/bookings/${id}/${action}/`);
            toast.success(t('bookings.successAction'));
            loadBookings();
            setConfirmAction(null);
            setActionMenuId(null);
        } catch (err: unknown) {
            const apiErr = err as AxiosError<{ detail?: string }>;
            toast.error(apiErr.response?.data?.detail || `Failed to ${action} booking`);
        } finally {
            setActionSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (actionSubmitting) return;
        setActionSubmitting(true);
        try {
            await api.delete(`/bookings/${id}/`);
            toast.success(t('bookings.successDelete'));
            loadBookings();
            setConfirmAction(null);
            setActionMenuId(null);
        } catch {
            toast.error('Failed to delete booking');
        } finally {
            setActionSubmitting(false);
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
            case 'approved':
            case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30';
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30';
            case 'payment_pending': return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30';
            case 'completed': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
            case 'rejected':
            case 'cancelled':
            case 'cancelled_by_user':
            case 'cancelled_by_restaurant':
            case 'no_show':
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



    return (
        <div className="space-y-8 pb-12 pt-1 transition-all">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                <div>
                    <h1 className="text-[20px] font-black text-slate-900 dark:text-white uppercase tracking-[0.1em] italic leading-none">
                        {t('bookings.title')}
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 opacity-40 italic">
                        {t('bookings.manageAllBookings')}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-[14px]">
                        {([
                            { id: 'all', label: 'All' },
                            { id: 'now', label: 'Now' },
                            { id: 'plus30', label: '+30m' },
                            { id: 'today', label: 'Today' },
                            { id: 'weekend', label: 'Weekend' }
                        ] as const).map((r) => (
                            <button
                                key={r.id}
                                onClick={() => { setQuickRange(r.id); setPage(1); }}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${quickRange === r.id
                                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-white p-6 rounded-[24px] border border-slate-100 shadow-xl shadow-slate-900/5">
                <div className="relative w-full lg:max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-all" />
                    <input
                        type="text"
                        placeholder={t('bookings.searchBy')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-[18px] focus:border-indigo-600 transition-all outline-none text-[10px] font-black uppercase tracking-[0.1em] text-slate-900 placeholder:text-slate-300 shadow-inner italic"
                    />
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-[18px] border border-slate-100">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setPage(1); setQuickRange('all'); }}
                            className="bg-transparent text-[9px] font-black uppercase tracking-widest text-slate-600 outline-none h-10 px-3 cursor-pointer"
                        />
                        <span className="text-slate-300 text-[8px] font-black tracking-widest italic opacity-40">TO</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setPage(1); setQuickRange('all'); }}
                            className="bg-transparent text-[9px] font-black uppercase tracking-widest text-slate-600 outline-none h-10 px-3 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                    { id: 'all', label: t('bookings.statusAll') },
                    { id: 'pending', label: t('bookings.statusNew') },
                    { id: 'payment_pending', label: 'Payment' },
                    { id: 'approved', label: t('bookings.statusConfirmed') },
                    { id: 'completed', label: t('bookings.statusCompleted') },
                    { id: 'cancelled_by_user,cancelled_by_restaurant,rejected,no_show', label: t('bookings.statusCancelled') }
                ].map((s) => (
                    <button
                        key={s.id}
                        onClick={() => { setFilter(s.id); setPage(1); }}
                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border italic ${filter === s.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/10'
                            : 'bg-white text-slate-400 border-slate-100 hover:text-indigo-600 hover:border-indigo-600'
                            }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-2">
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-16 w-full rounded-xl" count={8} />
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-200 rounded-[32px] p-24 text-center shadow-sm">
                        <CalendarDays className="w-10 h-10 text-slate-100 mx-auto mb-6" />
                        <h3 className="text-[12px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{t('bookings.noBookings')}</h3>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest opacity-40 italic">{t('bookings.noMatch')}</p>
                    </div>
                ) : (
                    filteredBookings.map((booking) => (
                        <div key={booking.id} className="bg-white border border-slate-100 rounded-[28px] p-5 transition-all hover:border-indigo-600 group relative shadow-sm hover:shadow-2xl hover:shadow-indigo-600/5 flex flex-col md:flex-row md:items-center gap-6">

                            <div className="flex items-center gap-6 lg:w-[25%]">
                                <div className="w-14 h-14 rounded-[20px] bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600 font-black text-xl italic shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                    {booking.user_name?.charAt(0).toUpperCase() || 'G'}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[14px] font-black text-slate-900 truncate uppercase tracking-tight italic leading-none">{booking.user_name || 'Anonymous Guest'}</h3>
                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 opacity-40">
                                        <Phone size={10} className="italic" />
                                        {booking.user_phone || 'No active connection'}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 lg:w-[25%] border-l border-slate-50 lg:pl-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-[0.15em] italic">
                                        <CalendarDays size={12} className="text-slate-300" />
                                        {new Date(booking.date + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest tabular-nums italic opacity-60">
                                        <Clock size={12} className="opacity-40" />
                                        {booking.time?.substring(0, 5)}
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <div className="flex items-baseline gap-1 bg-slate-50 px-3 py-1 rounded-[12px] border border-slate-100">
                                        <span className="font-black text-[14px] text-slate-900 tabular-nums italic">{booking.guests}</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-40">PAX</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-[15%] flex flex-col items-start gap-2 border-l border-slate-50 lg:pl-8">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-[0.2em] italic ${getStatusStyles(booking.status)}`}>
                                    <div className="w-1 h-1 rounded-full bg-current opacity-60 animate-pulse"></div>
                                    {booking.status === 'payment_pending' ? 'Payment pending' : (booking.status_display || booking.status)}
                                </div>

                                {Number(booking.deposit_required) > 0 && (
                                    <div className={`flex font-black text-[9px] px-3 py-1 rounded-xl border uppercase tracking-[0.1em] italic ${booking.is_deposit_paid
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                        {booking.is_deposit_paid ? 'PAID' : 'DUE'} ₸{Number(booking.deposit_required).toLocaleString()}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex items-center gap-4 border-l border-slate-50 lg:pl-8 overflow-hidden">
                                {booking.table_number && (
                                    <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/10">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">TABLE</span>
                                        <span className="text-[12px] font-black tabular-nums italic">{booking.table_number}</span>
                                    </div>
                                )}
                                {booking.special_requests && (
                                    <div className="flex items-center gap-2 text-slate-400 truncate group/note" title={booking.special_requests}>
                                        <MessageSquare size={12} className="shrink-0 opacity-20 group-hover/note:opacity-100 transition-opacity" />
                                        <p className="text-[10px] font-bold truncate tracking-tight opacity-40 group-hover/note:opacity-100 transition-opacity italic">{booking.special_requests}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 lg:w-[15%]">
                                <button
                                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-indigo-600 transition-all hover:bg-slate-50 rounded-[14px] border border-transparent hover:border-slate-100"
                                    onClick={() => navigate('/app/messages', { state: { bookingId: booking.id } })}
                                    title="Open Internal Comms"
                                >
                                    <MessageSquare size={16} />
                                </button>

                                {(booking.status === 'pending' || booking.status === 'payment_pending') && (
                                    <div className="flex items-center gap-2">
                                        {booking.status === 'pending' && (
                                            <button
                                                className="w-10 h-10 flex items-center justify-center text-rose-500/40 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-500/10 rounded-[14px] transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
                                                onClick={() => setConfirmAction({ id: booking.id, action: 'reject' })}
                                                disabled={actionSubmitting}
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        )}
                                        <button
                                            className="w-10 h-10 flex items-center justify-center text-emerald-500/40 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 rounded-[14px] transition-all border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30"
                                            onClick={() => setConfirmAction({ id: booking.id, action: 'confirm' })}
                                            disabled={actionSubmitting}
                                        >
                                            <CheckCircle2 size={16} />
                                        </button>
                                    </div>
                                )}

                                {['approved', 'confirmed'].includes(booking.status) && (
                                    <button
                                        className="h-10 px-5 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/20 hover:opacity-90 active:scale-95 italic"
                                        onClick={() => setConfirmAction({ id: booking.id, action: 'check_in' })}
                                        disabled={actionSubmitting}
                                    >
                                        {t('bookings.checkIn')}
                                    </button>
                                )}

                                <div className="relative">
                                    <button
                                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-[14px] transition-all border border-transparent hover:border-slate-100"
                                        onClick={() => setActionMenuId(actionMenuId === booking.id ? null : booking.id)}
                                        disabled={actionSubmitting}
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                    <AnimatePresence>
                                        {actionMenuId === booking.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                className="absolute right-0 top-full mt-3 w-48 bg-white border border-slate-100 rounded-[20px] shadow-2xl z-50 overflow-hidden p-2 ring-1 ring-black/5"
                                            >
                                                {['approved', 'confirmed'].includes(booking.status) && (
                                                    <>
                                                        <button
                                                            onClick={() => { setConfirmAction({ id: booking.id, action: 'complete' }); setActionMenuId(null); }}
                                                            className="w-full px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-all rounded-xl italic"
                                                            disabled={actionSubmitting}
                                                        >
                                                            <CheckCircle2 size={14} className="opacity-20" /> {t('bookings.complete')}
                                                        </button>
                                                        <button
                                                            onClick={() => { setConfirmAction({ id: booking.id, action: 'no_show' }); setActionMenuId(null); }}
                                                            className="w-full px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-all rounded-xl italic"
                                                            disabled={actionSubmitting}
                                                        >
                                                            <XCircle size={14} className="opacity-20" /> {t('bookings.noShow')}
                                                        </button>
                                                        <button
                                                            onClick={() => { setConfirmAction({ id: booking.id, action: 'cancel_by_restaurant' }); setActionMenuId(null); }}
                                                            className="w-full px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-rose-500 hover:bg-rose-50 flex items-center gap-3 transition-all rounded-xl italic"
                                                            disabled={actionSubmitting}
                                                        >
                                                            <XCircle size={14} className="opacity-60" /> {t('bookings.cancelByRestaurant')}
                                                        </button>
                                                        <div className="h-px bg-slate-100 my-2" />
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => openReassign(booking)}
                                                    className="w-full px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-all rounded-xl italic"
                                                    disabled={actionSubmitting}
                                                >
                                                    <Table2 size={14} className="opacity-20" /> Reassign
                                                </button>
                                                <button
                                                    onClick={() => openEdit(booking)}
                                                    className="w-full px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-all rounded-xl italic"
                                                    disabled={actionSubmitting}
                                                >
                                                    <Pencil size={14} className="opacity-20" /> {t('bookings.editBooking')}
                                                </button>
                                                <div className="h-px bg-slate-100 my-2" />
                                                <button
                                                    onClick={() => { setConfirmAction({ id: booking.id, action: 'delete' }); setActionMenuId(null); }}
                                                    className="w-full px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-rose-500 hover:bg-rose-50 flex items-center gap-3 transition-all rounded-xl italic"
                                                    disabled={actionSubmitting}
                                                >
                                                    <Trash2 size={14} className="opacity-60" /> {t('bookings.delete')}
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex items-center justify-between pt-10 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic opacity-60">
                    {t('bookings.page')} {page} {t('bookings.of')} {totalPages} • {filteredBookings.length} {t('bookings.results')}
                </span>
                <div className="flex gap-3">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="w-10 h-10 flex items-center justify-center rounded-[14px] bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-20 shadow-sm"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="w-10 h-10 flex items-center justify-center rounded-[14px] bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-20 shadow-sm"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!confirmAction && confirmAction.action !== 'delete'}
                title={t('bookings.confirmActionTitle')}
                description={`${t('bookings.sureTo')} ${confirmAction?.action === 'reject' ? 'отклонить' :
                    confirmAction?.action === 'check_in' ? 'отметить прибытие' :
                        confirmAction?.action === 'cancel_by_restaurant' ? 'отменить (ресторан)' :
                            confirmAction?.action === 'no_show' ? 'отметить неявку' :
                                confirmAction?.action === 'complete' ? 'завершить' : 'подтвердить'
                    } ${t('bookings.thisBooking')}`}
                onConfirm={() => confirmAction && handleAction(confirmAction.id, confirmAction.action)}
                onCancel={() => setConfirmAction(null)}
                confirmLabel={confirmAction?.action === 'reject' ? t('bookings.yesReject') : t('bookings.yesProceed')}
                confirmDisabled={actionSubmitting}
                confirmLoading={actionSubmitting}
            />

            <ConfirmModal
                isOpen={!!confirmAction && confirmAction.action === 'delete'}
                title={t('bookings.deleteBookingTitle')}
                description={t('bookings.deleteBookingDesc')}
                onConfirm={() => confirmAction && handleDelete(confirmAction.id)}
                onCancel={() => setConfirmAction(null)}
                confirmLabel={t('bookings.deletePermanently')}
                confirmDisabled={actionSubmitting}
                confirmLoading={actionSubmitting}
            />

            {editingBooking && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all" onClick={() => setEditingBooking(null)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-[32px] w-full max-w-md p-10 space-y-10 shadow-2xl shadow-black/20 border border-slate-100"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <h3 className="text-[14px] font-black text-slate-900 tracking-[0.25em] uppercase italic">{t('bookings.editTitle')}</h3>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block ml-1">{t('bookings.guestName')}</label>
                                <div className="px-5 py-4 bg-slate-50 rounded-[18px] text-[12px] font-black text-slate-900 border border-slate-100 uppercase tracking-[0.1em] italic opacity-40">
                                    {editingBooking.user_name}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block ml-1">{t('bookings.guests')}</label>
                                    <input
                                        type="number" min={1} max={50}
                                        value={editForm.guests}
                                        onChange={e => setEditForm(f => ({ ...f, guests: Number(e.target.value) }))}
                                        className="w-full px-5 py-4 bg-white border border-slate-100 rounded-[18px] text-[12px] font-black outline-none focus:border-indigo-600 transition-all tabular-nums text-slate-900 italic"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block ml-1">{t('bookings.time')}</label>
                                    <input
                                        type="time"
                                        value={editForm.time?.substring(0, 5)}
                                        onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))}
                                        className="w-full px-5 py-4 bg-white border border-slate-100 rounded-[18px] text-[12px] font-black outline-none focus:border-indigo-600 transition-all tabular-nums text-slate-900 italic"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block ml-1">{t('bookings.specialRequests')}</label>
                                <textarea
                                    value={editForm.special_requests}
                                    onChange={e => setEditForm(f => ({ ...f, special_requests: e.target.value }))}
                                    rows={3}
                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-[18px] text-[12px] font-black outline-none focus:border-indigo-600 transition-all resize-none text-slate-900 italic"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                className="flex-1 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] py-4 border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all italic"
                                onClick={() => setEditingBooking(null)}
                            >
                                {t('bookings.cancel')}
                            </button>
                            <button
                                className="flex-1 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] py-4 bg-indigo-600 text-white shadow-xl shadow-indigo-600/10 hover:opacity-90 active:scale-95 transition-all italic"
                                onClick={handleEditSave}
                            >
                                {editSaving ? 'SAVING...' : t('bookings.saveChanges')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {reassignBooking && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all" onClick={() => setReassignBooking(null)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-[32px] w-full max-w-md p-10 space-y-10 shadow-2xl shadow-black/20 border border-slate-100"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <h3 className="text-[14px] font-black text-slate-900 tracking-[0.25em] uppercase italic">Update Seating</h3>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 text-center space-y-2">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-40">ACTIVE SLOT</div>
                            <div className="text-[13px] font-black text-slate-900 uppercase tracking-widest italic leading-relaxed">
                                {reassignBooking.user_name || 'Guest'} <br />
                                <span className="text-[10px] text-slate-400 opacity-60 font-black">{reassignBooking.date} • {reassignBooking.time?.substring(0, 5)}</span>
                            </div>
                        </div>

                        {reassignLoading ? (
                            <div className="flex justify-center py-6"><Skeleton className="h-14 w-full rounded-[18px]" /></div>
                        ) : (
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block text-center opacity-60">SELECT AVAILABLE TABLE</label>
                                <div className="relative">
                                    <select
                                        value={selectedTableId}
                                        onChange={e => setSelectedTableId(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full px-6 py-4 bg-white border border-slate-100 rounded-[18px] text-[11px] font-black outline-none focus:border-indigo-600 transition-all text-slate-900 appearance-none text-center cursor-pointer italic tracking-widest"
                                    >
                                        <option value="">— SELECT TABLE —</option>
                                        {availableTableIds.map(id => {
                                            const tinfo = tablesById.get(id);
                                            const label = tinfo ? `TABLE ${tinfo.number} (${tinfo.seats} SEATS)` : `TABLE #${id}`;
                                            return <option key={id} value={id}>{label}</option>;
                                        })}
                                    </select>
                                </div>
                                {availableTableIds.length === 0 && (
                                    <div className="text-[8px] font-black text-rose-500 uppercase tracking-[0.2em] text-center animate-pulse italic">Maximum Capacity Reached at this Time</div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <button
                                className="flex-1 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] py-4 border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all italic"
                                onClick={() => setReassignBooking(null)}
                            >
                                ... (I'll truncate the rest as it's repetitive but necessary for full cleanup)
                                {t('bookings.cancel')}
                            </button>
                            <button
                                className="flex-1 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] py-4 bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all italic disabled:opacity-20"
                                onClick={handleReassignSave}
                                disabled={!selectedTableId || reassignLoading || availableTableIds.length === 0}
                            >
                                {reassignSaving ? 'APPLYING...' : 'APPLY SEAT'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
