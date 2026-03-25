import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CalendarDays, Plus, MessageSquare, RefreshCw, AlertCircle, Phone, Check, X, Users } from 'lucide-react';
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
                const [tablesRes, availRes] = await Promise.all([
                    api.get('/tables/'),
                    api.get('/bookings/available_tables/', {
                        params: {
                            restaurant_id: user?.restaurant,
                            date: booking.date,
                            time: booking.time.substring(0, 5)
                        }
                    })
                ]);
                const data = Array.isArray(tablesRes.data) ? tablesRes.data : (tablesRes.data.results || []);
                setTables(data);
                setAvailableIds(availRes.data.available_table_ids || []);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="font-bold text-slate-900">Выберите стол</h2>
                        <p className="text-xs text-slate-500">Для {booking.user_name} ({booking.guests} персон)</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700">&times;</button>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-primary opacity-50" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-slate-500 font-medium text-sm">Нет свободных столов на {booking.guests} чел.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                            {filtered.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedId(t.id)}
                                    className={`col-span-1 border rounded-lg p-3 text-left transition-all ${selectedId === t.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-slate-200 hover:border-primary/40 focus:bg-slate-50'}`}
                                >
                                    <div className="font-bold text-slate-900">{t.name || t.number}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                        <Users size={12} /> {t.capacity || t.seats} мест
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">Отмена</button>
                    <button
                        onClick={() => selectedId && onConfirm(selectedId)}
                        disabled={!selectedId}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors tracking-wide"
                    >
                        Посадить
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'requests', label: 'Запросы и Активные', statuses: ['pending', 'confirmed', 'approved', 'seated'] },
    { id: 'past', label: 'Прошедшие', statuses: ['completed'] },
    { id: 'cancelled', label: 'Отмененные', statuses: ['rejected', 'cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'no_show', 'expired'] },
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

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadBookings = async () => {
        setRefreshing(true);
        try {
            const params = new URLSearchParams();
            params.set('ordering', '-date,-time');
            const res = await api.get(`/bookings/my_restaurant/?${params.toString()}`);
            setBookings(res.data.results || (Array.isArray(res.data) ? res.data : []));
            setError(null);
        } catch {
            setError("Failed to fetch reservation stream");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadBookings();
        const interval = setInterval(loadBookings, 15000);
        return () => clearInterval(interval);
    }, []);

    const filteredBookings = useMemo(() => {
        const tabStatuses = TABS.find(t => t.id === activeTab)?.statuses || [];
        let list = bookings.filter(b => tabStatuses.includes(b.status));

        if (debouncedSearch) {
            const lower = debouncedSearch.toLowerCase();
            list = list.filter(b =>
                (b.user_name || '').toLowerCase().includes(lower) ||
                (b.user_phone || '').includes(lower)
            );
        }
        return list;
    }, [bookings, activeTab, debouncedSearch]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'approved': return 'bg-success/10 text-success border-success/20';
            case 'seated': return 'bg-primary/10 text-primary border-primary/20';
            case 'pending': return 'bg-warning/10 text-warning border-warning/20';
            case 'rejected':
            case 'cancelled':
            case 'cancelled_by_user': return 'bg-danger/10 text-danger border-danger/20';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const ACTION_LABELS: Record<string, string> = {
        confirm: 'Бронь подтверждена',
        reject: 'Бронь отклонена',
        seat: 'Гость посажен',
        complete: 'Бронь завершена',
        cancel_by_restaurant: 'Бронь отменена',
    };

    const handleAction = async (bookingId: number, action: string, extraData: any = {}) => {
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
            // First assign the table, then seat
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

    return (
        <div className="space-y-6 min-h-screen pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('bookings.title', 'Бронирования')}</h1>
                    <p className="text-sm text-slate-500 mt-1">Управление потоком гостей</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2"
                >
                    <Plus size={16} /> Новая бронь
                </button>
            </header>

            {/* TABS */}
            <div className="flex space-x-1 border-b border-slate-200 mb-6">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-sm font-semibold tracking-wide flex items-center gap-2 transition-colors relative ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        {tab.label}
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {bookings.filter(b => tab.statuses.includes(b.status)).length}
                        </span>
                        {activeTab === tab.id && (
                            <motion.div layoutId="book-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                        )}
                    </button>
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
                <div className="relative group flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all" size={16} />
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Поиск по имени или телефону..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-md focus:border-primary transition-all shadow-sm outline-none text-sm font-medium"
                    />
                </div>
                <button onClick={loadBookings} className="h-10 w-10 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-500 hover:text-primary transition-all">
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                </button>
            </div>

            {loading && !bookings.length ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-white rounded-md animate-pulse border border-slate-200 shadow-sm"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-4 bg-danger/10 text-danger rounded-md border border-danger/20 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p className="font-semibold text-sm">{error}</p>
                </div>
            ) : (
                <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-x-auto">
                    {filteredBookings.length === 0 ? (
                        <div className="p-16 text-center space-y-3">
                            <CalendarDays size={48} className="mx-auto text-slate-200" />
                            <p className="text-slate-500 font-medium text-sm">В этой вкладке ничего нет</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pax</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Table</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence mode="popLayout">
                                    {filteredBookings.map((b, i) => (
                                        <motion.tr
                                            layout
                                            key={b.id}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="hover:bg-slate-50 transition-colors group"
                                        >
                                            <td className="py-2.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-700 font-bold text-xs shadow-sm">
                                                        {b.user_name?.charAt(0).toUpperCase() || 'G'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-semibold text-sm text-slate-900 block truncate max-w-[150px]">{b.user_name || 'Guest'}</span>
                                                        <span className={`inline-flex px-1.5 py-0.5 rounded flex items-center w-max gap-1 text-[10px] uppercase font-bold border mt-0.5 ${getStatusStyle(b.status)}`}>
                                                            {b.status_display || b.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-4 text-sm text-slate-600">
                                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                    <Phone size={12} className="text-slate-400" /> {b.user_phone || '—'}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-4 text-sm font-bold text-slate-900">{b.guests}</td>
                                            <td className="py-2.5 px-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-900">{b.time?.substring(0, 5)}</span>
                                                    <span className="text-xs text-slate-500">{new Date(b.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-4">
                                                {b.table_number || b.table ? (
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200">T{b.table_number || b.table}</span>
                                                ) : <span className="text-slate-400 text-xs italic">Не назначен</span>}
                                                {b.special_requests && (
                                                    <button onClick={() => toast("Special Request: " + b.special_requests)} className="px-2 py-1 ml-1 inline-flex text-slate-400 hover:text-primary transition-colors cursor-pointer" title="View Special Request">
                                                        <MessageSquare size={14} />
                                                    </button>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2 lg:opacity-30 lg:group-hover:opacity-100 transition-opacity">
                                                    {b.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => handleAction(b.id, 'confirm')} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success text-xs font-bold rounded-lg hover:bg-success/20 transition-colors tracking-wide">
                                                                <Check size={14} /> Принять
                                                            </button>
                                                            <button onClick={() => handleAction(b.id, 'reject')} className="flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 text-danger text-xs font-bold rounded-lg hover:bg-danger/20 transition-colors tracking-wide">
                                                                <X size={14} /> Отклонить
                                                            </button>
                                                        </>
                                                    )}
                                                    {(b.status === 'confirmed' || b.status === 'approved') && (
                                                        <button onClick={() => handleSeatClick(b)} className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-primary/90 transition-colors tracking-wide">Посадить (Seat)</button>
                                                    )}
                                                    {b.status === 'seated' && (
                                                        <button onClick={() => handleAction(b.id, 'complete')} className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors tracking-wide">Завершить</button>
                                                    )}
                                                    {['confirmed', 'approved'].includes(b.status) && (
                                                        <button onClick={() => handleAction(b.id, 'cancel_by_restaurant')} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors tracking-wide">Отмена</button>
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
