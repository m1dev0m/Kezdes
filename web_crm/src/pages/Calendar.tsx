import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { extractResults, getLocalDateString, getReservationCustomerSignals, getReservationStatusMeta, getTableLabel, type ReservationRecord } from '@/features/reservations/shared';

const HOURS = Array.from({ length: 15 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
const HOUR_HEIGHT = 100;
const START_HOUR = 8;

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    confirmed: { bg: 'bg-[#0047FF]/5', text: 'text-[#0047FF]', border: 'border-[#0047FF]/20', icon: 'check_circle' },
    approved: { bg: 'bg-[#0047FF]/5', text: 'text-[#0047FF]', border: 'border-[#0047FF]/20', icon: 'verified' },
    pending: { bg: 'bg-amber-500/5', text: 'text-amber-600', border: 'border-amber-500/20', icon: 'pending' },
    seated: { bg: 'bg-indigo-500/5', text: 'text-indigo-600', border: 'border-indigo-500/20', icon: 'chair_alt' },
    cancelled: { bg: 'bg-rose-500/5', text: 'text-rose-600', border: 'border-rose-500/20', icon: 'cancel' },
    cancelled_by_user: { bg: 'bg-rose-500/5', text: 'text-rose-600', border: 'border-rose-500/20', icon: 'cancel' },
    cancelled_by_restaurant: { bg: 'bg-rose-500/5', text: 'text-rose-600', border: 'border-rose-500/20', icon: 'cancel' },
    rejected: { bg: 'bg-rose-500/5', text: 'text-rose-600', border: 'border-rose-500/20', icon: 'block' },
    no_show: { bg: 'bg-slate-500/5', text: 'text-slate-600', border: 'border-slate-500/20', icon: 'person_off' },
    completed: { bg: 'bg-slate-500/5', text: 'text-slate-600', border: 'border-slate-500/20', icon: 'done_all' },
};

interface CalendarBooking {
    id: number;
    date: string;
    time?: string;
    duration_hours?: number;
    duration_minutes?: number;
    guests?: number;
    comment?: string;
    user_name?: string;
    status?: string | keyof typeof STATUS_CONFIG;
    table_id?: number | null;
    table_number?: string | null;
    customer_summary?: ReservationRecord['customer_summary'];
}

interface CalendarTable {
    id: number;
    number: string;
    seats: number;
}

function formatDate(d: Date) {
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function addDays(d: Date, n: number) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function parseDateInput(value: string) {
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default function CalendarPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [bookings, setBookings] = useState<CalendarBooking[]>([]);
    const [tables, setTables] = useState<CalendarTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'timeline' | 'day'>('timeline');
    const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentDateValue = getLocalDateString(currentDate);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const dStr = getLocalDateString(currentDate);
            const [bRes, tRes] = await Promise.all([
                api.get(`/bookings/my_restaurant/?date=${dStr}`),
                api.get('/tables/status/').catch(() => api.get('/tables/'))
            ]);

            setBookings(extractResults<CalendarBooking>(bRes.data));
            setTables(extractResults<CalendarTable>(tRes.data));
        } catch (e) {
            setError('Не удалось загрузить календарь смены и бронирований. Проверьте соединение и повторите запрос.');
            toast.error('Не удалось загрузить расписание.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    useWebSocket({
        url: `ws/bookings/${user?.restaurant}/`,
        enabled: !!user?.restaurant,
        onMessage: (data) => {
            if (data && data.type === 'booking_update') {
                fetchData();
            }
        }
    });

    const filteredBookings = bookings.filter(b => {
        const matchSearch = !search || (b.user_name || '').toLowerCase().includes(search.toLowerCase());
        return matchSearch;
    });
    const selectedBookingSignals = selectedBooking ? getReservationCustomerSignals(selectedBooking as ReservationRecord) : [];

    const nightNowY = currentDate.toDateString() === new Date().toDateString()
        ? ((new Date().getHours() - START_HOUR) * 60 + new Date().getMinutes()) / 60 * HOUR_HEIGHT
        : null;

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-10rem)] flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm animate-in fade-in duration-700">
            {}
            <header className="flex flex-col md:flex-row items-center justify-between px-10 py-6 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 gap-6 z-30">
                <div className="flex items-center gap-6">
                    <div className="size-14 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-[#0047FF]">
                        <span className="material-symbols-outlined text-[28px]">calendar_month</span>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">Календарь смены</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{formatDate(currentDate)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex items-center">
                        <AnimatePresence>
                            {showSearch && (
                                <motion.input
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 220, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    placeholder="Поиск по имени..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="h-12 pl-4 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-[#0047FF]/10 transition-all"
                                />
                            )}
                        </AnimatePresence>
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className={`p-3 rounded-xl transition-all ${showSearch ? 'text-[#0047FF] bg-[#0047FF]/5' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined text-[22px]">{showSearch ? 'close' : 'search'}</span>
                        </button>
                    </div>

                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        {['timeline', 'day'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode as any)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white dark:bg-slate-700 text-[#0047FF] shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {mode === 'timeline' ? 'Таймлайн' : 'Список'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentDate(d => addDays(d, -1))} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 hover:text-[#0047FF] transition-all"><span className="material-symbols-outlined">chevron_left</span></button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            aria-label="calendar-today"
                            className="px-6 py-3 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#0047FF] transition-all"
                        >
                            Сегодня
                        </button>
                        <button
                            onClick={() => setCurrentDate(addDays(new Date(), 1))}
                            className="px-4 py-3 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#0047FF] transition-all"
                        >
                            Завтра
                        </button>
                        <input
                            type="date"
                            aria-label="calendar-date-input"
                            value={currentDateValue}
                            onChange={(event) => setCurrentDate(parseDateInput(event.target.value))}
                            className="h-12 rounded-xl border border-slate-100 bg-white px-4 text-xs font-bold text-slate-700 outline-none ring-2 ring-transparent transition-all focus:border-[#0047FF] focus:ring-[#0047FF]/10 dark:border-slate-800 dark:bg-slate-800"
                        />
                        <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 hover:text-[#0047FF] transition-all"><span className="material-symbols-outlined">chevron_right</span></button>
                    </div>

                    <button
                        onClick={() => navigate('/app/bookings/new')}
                        className="h-14 px-8 bg-[#0047FF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0039cc] transition-all flex items-center gap-3 shadow-2xl shadow-[#0047FF]/20"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        Новая бронь
                    </button>
                </div>
            </header>

            {}
            <div className="flex-1 overflow-hidden relative">
                <div ref={scrollRef} className="absolute inset-0 overflow-auto no-scrollbar bg-slate-50/20 dark:bg-slate-900/40">
                    {error && (
                        <div className="sticky top-0 z-30 mx-6 mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <span>{error}</span>
                                <button
                                    type="button"
                                    onClick={() => void fetchData()}
                                    className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-100"
                                >
                                    <RefreshCw size={14} />
                                    Повторить
                                </button>
                            </div>
                        </div>
                    )}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#0047FF]/20 border-t-[#0047FF]"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Синхронизация расписания...</span>
                        </div>
                    ) : viewMode === 'timeline' ? (
                        <div className="min-w-max relative bg-white dark:bg-slate-900">
                            {}
                            <div className="flex sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
                                <div className="w-40 py-5 px-8 border-r border-slate-100 dark:border-slate-800 font-black text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-800/30 shrink-0">Стол / Сектор</div>
                                {HOURS.map((h, i) => (
                                    <div key={i} className="w-40 py-5 text-center border-r border-slate-100 dark:border-slate-800 font-black text-[10px] text-slate-400 tabular-nums shrink-0">{h}</div>
                                ))}
                            </div>

                            {}
                            <div className="flex border-b border-slate-100 dark:border-slate-800 h-24 bg-slate-50/40 dark:bg-slate-800/20">
                                <div className="w-40 px-8 flex flex-col justify-center border-r border-slate-100 dark:border-slate-800 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[4px_0_10px_rgba(0,0,0,0.02)] shrink-0">
                                    <span className="font-black text-rose-500 text-[10px] uppercase tracking-[0.2em] italic">Лист ожидания</span>
                                </div>
                                <div className="flex-1 relative">
                                    {HOURS.map((_, i) => <div key={i} className="absolute h-full border-r border-slate-100/30 dark:border-slate-800/30" style={{ left: (i + 1) * 160 }} />)}
                                    {filteredBookings.filter(b => !b.table_id).map(b => (
                                        <BookingBlock key={b.id} booking={b} onClick={() => setSelectedBooking(b)} />
                                    ))}
                                </div>
                            </div>

                            {}
                            {tables.map(t => (
                                <div key={t.id} className="flex border-b border-slate-100 dark:border-slate-800 h-24 group">
                                    <div className="w-40 px-8 flex flex-col justify-center border-r border-slate-100 dark:border-slate-800 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[4px_0_10px_rgba(0,0,0,0.02)] shrink-0">
                                        <div className="flex items-center gap-2">
                                        <span className="font-black text-slate-900 dark:text-white text-lg italic tracking-tighter">#{t.number}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-[12px] text-[#0047FF]">group</span> {t.seats} гостей
                                    </span>
                                </div>
                                    <div className="flex-1 relative">
                                        {HOURS.map((_, i) => <div key={i} className="absolute h-full border-r border-slate-100/30 dark:border-slate-800/30" style={{ left: (i + 1) * 160 }} />)}
                                        {filteredBookings.filter(b => b.table_id === t.id).map(b => (
                                            <BookingBlock key={b.id} booking={b} onClick={() => setSelectedBooking(b)} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-h-full bg-white dark:bg-slate-900 relative">
                            <div className="w-24 shrink-0 border-r border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10">
                                {HOURS.map((h, i) => (
                                    <div key={i} style={{ height: HOUR_HEIGHT }} className="flex items-center justify-center font-black text-[10px] text-slate-400 tabular-nums">
                                        {h}
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 relative">
                                {HOURS.map((_, i) => <div key={i} className="absolute w-full border-t border-slate-100 dark:border-slate-800" style={{ top: i * HOUR_HEIGHT }} />)}
                                {nightNowY !== null && (
                                    <div className="absolute w-full z-20 pointer-events-none" style={{ top: nightNowY }}>
                                        <div className="h-px bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)] flex items-center">
                                            <div className="size-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 -ml-1.5 transition-transform animate-pulse" />
                                        </div>
                                    </div>
                                )}
                                <div className="p-6 relative">
                                    {filteredBookings.map(b => {
                                        const [h, m] = (b.time || '12:00').split(':').map(Number);
                                        const top = ((h - START_HOUR) * 60 + (m || 0)) * (HOUR_HEIGHT / 60);
                                        const height = (b.duration_minutes || 120) * (HOUR_HEIGHT / 60) - 8;
                                        const status = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                                        return (
                                            <div
                                                key={b.id}
                                                onClick={() => setSelectedBooking(b)}
                                                className={`absolute left-6 right-6 rounded-[1.5rem] p-6 border shadow-2xl shadow-black/5 cursor-pointer transition-all hover:scale-[1.005] hover:z-20 flex items-start justify-between backdrop-blur-sm ${status.bg} ${status.text} ${status.border}`}
                                                style={{ top, height }}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[18px]">{status.icon}</span>
                                                        <p className="font-black text-lg tracking-tight leading-none uppercase italic">{b.user_name || 'Гость'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-70">
                                                            <span className="material-symbols-outlined text-[14px]">groups</span> {b.guests} гостей
                                                        </p>
                                                        {b.table_number && (
                                                            <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-70">
                                                                <span className="material-symbols-outlined text-[14px]">table_bar</span> #{b.table_number}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className="text-xl font-black italic tabular-nums">{b.time?.slice(0, 5)}</span>
                                                    <span className="px-2 py-0.5 rounded-lg bg-white/40 dark:bg-black/20 text-[9px] font-black uppercase tracking-widest">{b.status}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {}
            <AnimatePresence>
                {selectedBooking && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[60]"
                            onClick={() => setSelectedBooking(null)}
                        />
                        <motion.aside
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-full md:w-[450px] bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 z-[70] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.1)]"
                        >
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] text-[10px]">Детали бронирования</h3>
                                <button onClick={() => setSelectedBooking(null)} className="material-symbols-outlined text-slate-400 hover:text-[#0047FF] transition-all">close</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-12">
                                <div className="text-center space-y-4">
                                    <div className="size-24 rounded-[2.5rem] bg-indigo-50 dark:bg-indigo-900/30 text-[#0047FF] flex items-center justify-center font-black text-3xl mx-auto border-4 border-white dark:border-slate-800 shadow-xl">
                                        {selectedBooking.user_name?.[0] || 'W'}
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">{selectedBooking.user_name || 'Гость'}</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Заявка #{selectedBooking.id}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <DetailCard label="Время" value={selectedBooking.time?.slice(0, 5)} icon="schedule" />
                                    <DetailCard label="Гостей" value={`${selectedBooking.guests} гостей`} icon="groups" />
                                    <DetailCard label="Стол" value={selectedBooking.table_id ? getTableLabel(selectedBooking as ReservationRecord) : 'Не назначен'} icon="table_bar" />
                                    <DetailCard label="Статус" value={getReservationStatusMeta(selectedBooking.status || 'pending').label} icon="sync_saved_locally" />
                                </div>

                                {selectedBookingSignals.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedBookingSignals.map((signal) => (
                                            <span
                                                key={signal.key}
                                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${signal.className}`}
                                            >
                                                {signal.label}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {selectedBooking.comment && (
                                    <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-3xl space-y-2">
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px]">notes</span> Комментарий гостя
                                        </p>
                                        <p className="text-sm text-amber-900 dark:text-amber-200 font-bold leading-relaxed">{selectedBooking.comment}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex flex-col gap-4">
                                <button
                                    onClick={() => navigate(`/app/bookings?id=${selectedBooking.id}`)}
                                    className="w-full h-16 bg-[#0047FF] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#0039cc] transition-all shadow-xl shadow-[#0047FF]/20 flex items-center justify-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                    Открыть в бронированиях
                                </button>
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="w-full h-14 border border-slate-100 dark:border-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-all"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function BookingBlock({ booking, onClick }: { booking: CalendarBooking; onClick: () => void }) {
    const [h, m] = (booking.time || '12:00').split(':').map(Number);
    const left = ((h - START_HOUR) * 60 + (m || 0)) * (160 / 60);
    const width = (booking.duration_minutes || 120) * (160 / 60) - 12;
    const status = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;

    return (
        <div
            onClick={onClick}
            className={`absolute top-4 bottom-4 rounded-2xl px-5 py-2 border shadow-sm cursor-pointer transition-all hover:scale-[1.02] hover:z-20 flex flex-col justify-center gap-0.5 group ${status.bg} ${status.text} ${status.border}`}
            style={{ left, width }}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="material-symbols-outlined text-[14px] shrink-0">{status.icon}</span>
                <p className="font-black text-[10px] uppercase tracking-widest truncate">{booking.user_name || 'Гость'}</p>
                {getReservationCustomerSignals(booking as ReservationRecord).map((s) => (
                    <span key={s.key} className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold leading-none ${s.className}`}>{s.label}</span>
                ))}
            </div>
            <div className="flex items-center gap-3 opacity-60">
                <p className="text-[9px] font-black flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">groups</span> {booking.guests}</p>
                <p className="text-[9px] font-black tabular-nums">{booking.time?.slice(0, 5)}</p>
            </div>
        </div>
    );
}

function DetailCard({ label, value, icon }: { label: string; value?: string | number; icon: string }) {
    return (
        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-3xl group hover:border-[#0047FF] transition-colors">
            <p className="text-[9px] font-black text-slate-400 group-hover:text-[#0047FF] uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[14px]">{icon}</span> {label}
            </p>
            <p className="font-black text-slate-900 dark:text-white text-lg tracking-tighter uppercase italic truncate">{value || '—'}</p>
        </div>
    );
}
