import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CalendarDays, Plus, MessageSquare, RefreshCw, AlertCircle, Phone, Check, X, Users, Send } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n/index.tsx';
import { ManualBookingForm } from '@/components/ManualBookingForm';
import { useAuth } from '@/modules/auth/logic/AuthContext';

// ── Table Seating Modal ────────────────────────────────────────────────────────
interface TableSeatingModalProps {
    booking: any;
    onClose: () => void;
    onConfirm: (tableId: number) => void;
}

function TableSeatingModal({ booking, onClose, onConfirm }: TableSeatingModalProps) {
    const { user } = useAuth();
    const [tables, setTables] = useState<any[]>([]);
    const [availableIds, setAvailableIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    useEffect(() => {
        if (!booking) return;
        const load = async () => {
            try {
                const availRes = await api.get('/bookings/available_tables/', {
                    params: {
                        restaurant_id: user?.restaurant,
                        date: booking.date,
                        time: booking.time.substring(0, 5)
                    }
                });
                const availableTables = availRes.data.available_tables || [];
                setTables(availableTables);
                setAvailableIds(availableTables.map((t: any) => t.id));
            } catch (err) {
                toast.error("Ошибка загрузки столов");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [booking, user?.restaurant]);

    const filtered = tables.filter(t => availableIds.includes(t.id) && (t.capacity || t.seats) >= booking.guests);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <div>
                        <h2 className="font-bold text-slate-900 text-sm">Выберите стол</h2>
                        <p className="text-xs text-slate-500">Для {booking.user_name} ({booking.guests} персон)</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">&times;</button>
                </div>
                <div className="p-5">
                    {loading ? (
                        <div className="flex justify-center p-6"><RefreshCw className="animate-spin text-primary opacity-50" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center p-5 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-slate-500 font-medium text-sm">Нет свободных столов на {booking.guests} чел.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                            {filtered.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedId(t.id)}
                                    className={`border rounded-lg p-2.5 text-left transition-all duration-150 ${selectedId === t.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="font-bold text-sm text-slate-900">{t.name || t.number}</div>
                                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                        <Users size={11} /> {t.capacity || t.seats} мест
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex gap-2 bg-slate-50">
                    <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">Отмена</button>
                    <button
                        onClick={() => selectedId && onConfirm(selectedId)}
                        disabled={!selectedId}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-40 transition-colors"
                    >
                        Посадить
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Source Badge ────────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source?: string }) {
    if (source === 'telegram') {
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 text-[10px] font-semibold border border-sky-100">
                <Send size={9} />TG
            </span>
        );
    }
    if (source === 'admin') {
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 text-[10px] font-semibold border border-violet-100">
                Admin
            </span>
        );
    }
    if (source === 'phone') {
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-semibold border border-amber-100">
                <Phone size={9} />Phone
            </span>
        );
    }
    // web or undefined — show nothing (default)
    return null;
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'requests', label: 'Активные', statuses: ['pending', 'confirmed', 'approved', 'seated'] },
    { id: 'past', label: 'Прошедшие', statuses: ['completed'] },
    { id: 'cancelled', label: 'Отмененные', statuses: ['rejected', 'cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'no_show', 'expired'] },
];

const SOURCE_FILTERS = [
    { id: 'all', label: 'Все' },
    { id: 'web', label: 'Web' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'admin', label: 'Admin' },
];

export default function Bookings() {
    const { t } = useI18n();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    const [seatingBooking, setSeatingBooking] = useState<any | null>(null);
    const [sourceFilter, setSourceFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [pendingAction, setPendingAction] = useState<string | null>(null); // "bookingId:action"

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search), 200);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadBookings = useCallback(async () => {
        setRefreshing(true);
        try {
            const params = new URLSearchParams();
            params.set('ordering', '-date,-time');
            const res = await api.get(`/bookings/my_restaurant/?${params.toString()}`);
            setBookings(res.data.results || (Array.isArray(res.data) ? res.data : []));
            setError(null);
        } catch {
            setError("Не удалось загрузить бронирования");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadBookings();
        const interval = setInterval(loadBookings, 15000);
        return () => clearInterval(interval);
    }, [loadBookings]);

    const filteredBookings = useMemo(() => {
        const tabStatuses = TABS.find(t => t.id === activeTab)?.statuses || [];
        let list = bookings.filter(b => tabStatuses.includes(b.status));

        // Source filter
        if (sourceFilter !== 'all') {
            list = list.filter(b => {
                const src = b.source || (b.special_requests?.includes('source: telegram') ? 'telegram' : 'web');
                return src === sourceFilter;
            });
        }

        // Date filter
        if (dateFilter) {
            list = list.filter(b => b.date === dateFilter);
        }

        // Search
        if (debouncedSearch) {
            const lower = debouncedSearch.toLowerCase();
            list = list.filter(b =>
                (b.user_name || '').toLowerCase().includes(lower) ||
                (b.user_phone || '').includes(lower)
            );
        }
        return list;
    }, [bookings, activeTab, debouncedSearch, sourceFilter, dateFilter]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'seated': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'rejected':
            case 'cancelled':
            case 'cancelled_by_user':
            case 'cancelled_by_restaurant': return 'bg-rose-50 text-rose-600 border-rose-200';
            case 'no_show': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: 'Ожидает',
            confirmed: 'Подтв.',
            approved: 'Подтв.',
            seated: 'За столом',
            completed: 'Завершен',
            rejected: 'Отклонен',
            cancelled_by_user: 'Отменен',
            cancelled_by_restaurant: 'Отменен',
            no_show: 'Неявка',
            expired: 'Истекло',
        };
        return labels[status] || status;
    };

    const ACTION_LABELS: Record<string, string> = {
        confirm: 'Бронь подтверждена',
        reject: 'Бронь отклонена',
        seat: 'Гость посажен',
        complete: 'Бронь завершена',
        cancel_by_restaurant: 'Бронь отменена',
    };

    const DESTRUCTIVE_ACTIONS = new Set(['reject', 'cancel_by_restaurant']);
    const DESTRUCTIVE_CONFIRM: Record<string, string> = {
        reject: 'Отклонить бронирование?',
        cancel_by_restaurant: 'Отменить бронирование?',
    };

    const handleAction = async (bookingId: number, action: string, extraData: any = {}) => {
        if (DESTRUCTIVE_ACTIONS.has(action)) {
            if (!window.confirm(DESTRUCTIVE_CONFIRM[action] || 'Вы уверены?')) return;
        }
        const key = `${bookingId}:${action}`;
        setPendingAction(key);
        try {
            await api.post(`/bookings/${bookingId}/${action}/`, extraData);
            toast.success(ACTION_LABELS[action] || `Действие выполнено`);
            loadBookings();
        } catch (err: any) {
            const data = err?.response?.data;
            const msg = (typeof data?.detail === 'string' ? data.detail : null)
                || (typeof data?.error === 'string' ? data.error : null)
                || `Ошибка: ${action}`;
            toast.error(msg);
        } finally {
            setPendingAction(null);
        }
    };

    const handleSeatClick = (b: any) => {
        if (!b.table_number && !b.table) {
            setSeatingBooking(b);
        } else {
            handleAction(b.id, 'seat');
        }
    };

    const executeSeating = async (tableId: number) => {
        const booking = seatingBooking;
        setSeatingBooking(null);
        try {
            await api.post(`/bookings/${booking.id}/reassign_table/`, { table_id: tableId });
            await api.post(`/bookings/${booking.id}/seat/`);
            toast.success('Гость посажен');
            loadBookings();
        } catch (err: any) {
            const data = err?.response?.data;
            const msg = (typeof data?.detail === 'string' ? data.detail : null)
                || (typeof data?.error === 'string' ? data.error : null)
                || 'Ошибка посадки гостя';
            toast.error(msg);
        }
    };

    // Derive source for backward compat (old bookings without source field)
    const getSource = (b: any) => {
        if (b.source) return b.source;
        if (b.special_requests?.includes('source: telegram')) return 'telegram';
        return 'web';
    };

    // Count helpers
    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        TABS.forEach(tab => {
            counts[tab.id] = bookings.filter(b => tab.statuses.includes(b.status)).length;
        });
        return counts;
    }, [bookings]);

    return (
        <div className="space-y-4 pb-12">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('bookings.title', 'Бронирования')}</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Управление потоком гостей</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all duration-150 flex items-center gap-2 active:scale-[0.98]"
                >
                    <Plus size={16} /> Новая бронь
                </button>
            </header>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-200">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors duration-150 relative ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                            {tabCounts[tab.id] || 0}
                        </span>
                        {activeTab === tab.id && (
                            <motion.div layoutId="book-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                    </button>
                ))}
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <div className="relative group flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-150" size={16} />
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Поиск по имени или телефону..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-150 outline-none text-sm"
                    />
                </div>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all duration-150"
                    />
                    <select
                        value={sourceFilter}
                        onChange={e => setSourceFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all duration-150 cursor-pointer"
                    >
                        {SOURCE_FILTERS.map(sf => (
                            <option key={sf.id} value={sf.id}>{sf.label}</option>
                        ))}
                    </select>
                    <button onClick={loadBookings} className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-primary hover:border-slate-300 transition-all duration-150 shrink-0">
                        <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading && !bookings.length ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 bg-white rounded-lg animate-pulse border border-slate-200"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-200 flex items-center gap-3">
                    <AlertCircle size={18} />
                    <p className="font-semibold text-sm">{error}</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                    {filteredBookings.length === 0 ? (
                        <div className="p-12 text-center space-y-2">
                            <CalendarDays size={40} className="mx-auto text-slate-300" />
                            <p className="text-slate-500 font-medium text-sm">Нет бронирований</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80">
                                    <th className="py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Гость</th>
                                    <th className="py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Телефон</th>
                                    <th className="py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Пакс</th>
                                    <th className="py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Время</th>
                                    <th className="py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Стол</th>
                                    <th className="py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence mode="popLayout">
                                    {filteredBookings.map((b) => (
                                        <motion.tr
                                            layout
                                            key={b.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="hover:bg-slate-50 transition-colors duration-150 group"
                                        >
                                            {/* Guest */}
                                            <td className="py-2 px-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                                                        {b.user_name?.charAt(0).toUpperCase() || 'G'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-sm text-slate-900 truncate max-w-[130px]">{b.user_name || 'Guest'}</span>
                                                            <SourceBadge source={getSource(b)} />
                                                        </div>
                                                        <span className={`inline-flex px-1.5 py-px rounded text-[10px] font-semibold border mt-0.5 ${getStatusStyle(b.status)}`}>
                                                            {getStatusLabel(b.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Phone */}
                                            <td className="py-2 px-3 text-sm text-slate-600 whitespace-nowrap">
                                                <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {b.user_phone || '—'}</span>
                                            </td>
                                            {/* Guests */}
                                            <td className="py-2 px-3 text-sm font-bold text-slate-900">{b.guests}</td>
                                            {/* Time */}
                                            <td className="py-2 px-3 whitespace-nowrap">
                                                <span className="text-sm font-semibold text-slate-900">{b.time?.substring(0, 5)}</span>
                                                <span className="text-xs text-slate-500 ml-1.5">{new Date(b.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                            </td>
                                            {/* Table */}
                                            <td className="py-2 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    {b.table_number || b.table ? (
                                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200">T{b.table_number || b.table}</span>
                                                    ) : <span className="text-slate-400 text-xs">—</span>}
                                                    {b.special_requests && !b.special_requests.startsWith('source:') && (
                                                        <button onClick={() => toast(b.special_requests)} className="text-slate-400 hover:text-primary transition-colors duration-150" title="Запрос">
                                                            <MessageSquare size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Actions */}
                                            <td className="py-2 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {b.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleAction(b.id, 'confirm')}
                                                                disabled={!!pendingAction}
                                                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md hover:bg-emerald-100 border border-emerald-200 transition-colors duration-150 active:scale-[0.97] disabled:opacity-50"
                                                            >
                                                                {pendingAction === `${b.id}:confirm` ? <RefreshCw size={11} className="animate-spin" /> : <Check size={13} />} Принять
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(b.id, 'reject')}
                                                                disabled={!!pendingAction}
                                                                className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 text-xs font-semibold rounded-md hover:bg-rose-100 border border-rose-200 transition-colors duration-150 active:scale-[0.97] disabled:opacity-50"
                                                            >
                                                                {pendingAction === `${b.id}:reject` ? <RefreshCw size={11} className="animate-spin" /> : <X size={13} />} Отклонить
                                                            </button>
                                                        </>
                                                    )}
                                                    {(b.status === 'confirmed' || b.status === 'approved') && (
                                                        <>
                                                            <button
                                                                onClick={() => handleSeatClick(b)}
                                                                disabled={!!pendingAction}
                                                                className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                {pendingAction === `${b.id}:seat` ? <RefreshCw size={11} className="animate-spin" /> : null} Посадить
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(b.id, 'cancel_by_restaurant')}
                                                                disabled={!!pendingAction}
                                                                className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md hover:bg-slate-200 border border-slate-200 transition-colors duration-150 active:scale-[0.97] disabled:opacity-50"
                                                            >
                                                                {pendingAction === `${b.id}:cancel_by_restaurant` ? <RefreshCw size={11} className="animate-spin inline" /> : null} Отмена
                                                            </button>
                                                        </>
                                                    )}
                                                    {b.status === 'seated' && (
                                                        <button
                                                            onClick={() => handleAction(b.id, 'complete')}
                                                            disabled={!!pendingAction}
                                                            className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            {pendingAction === `${b.id}:complete` ? <RefreshCw size={11} className="animate-spin" /> : null} Завершить
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <ManualBookingForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={loadBookings}
            />

            {seatingBooking && (
                <TableSeatingModal
                    booking={seatingBooking}
                    onClose={() => setSeatingBooking(null)}
                    onConfirm={executeSeating}
                />
            )}
        </div>
    );
}
