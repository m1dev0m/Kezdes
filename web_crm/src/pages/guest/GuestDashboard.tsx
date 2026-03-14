import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { format, parseISO, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Loader2, XCircle } from 'lucide-react';
import { useI18n } from '@/i18n';

interface Booking {
    id: number;
    restaurant_name: string;
    restaurant_photo_url?: string;
    restaurant_city?: string;
    date: string;
    time: string;
    guests: number;
    status: string;
    status_display: string;
}

const STATUS_STYLES: Record<string, { cls: string }> = {
    approved: { cls: 'bg-green-100 text-green-600' },
    pending: { cls: 'bg-amber-100 text-amber-600' },
    arrived: { cls: 'bg-blue-100 text-blue-600' },
    seated: { cls: 'bg-blue-100 text-blue-700' },
    completed: { cls: 'bg-slate-100 text-slate-500' },
    cancelled_by_user: { cls: 'bg-red-100 text-red-500' },
    cancelled_by_restaurant: { cls: 'bg-red-100 text-red-500' },
    rejected: { cls: 'bg-red-100 text-red-500' },
    no_show: { cls: 'bg-slate-100 text-slate-400' },
};

export default function GuestDashboard() {
    const { t } = useI18n();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);

    useEffect(() => { loadBookings(); }, []);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/bookings/');
            setBookings(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch {
            toast.error(t('guestDashboard.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id: number) => {
        setCancellingId(id);
        setConfirmCancelId(null);
        try {
            await api.post(`/bookings/${id}/cancel/`);
            toast.success(t('guestDashboard.reservationCancelled'));
            loadBookings();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || t('guestDashboard.couldNotCancel'));
        } finally {
            setCancellingId(null);
        }
    };

    const formatDate = (d: string) => {
        const dt = parseISO(`${d}T00:00:00`);
        return isValid(dt) ? format(dt, 'EEE, d MMM', { locale: ru }) : d;
    };

    const activeBookings = bookings.filter(b => ['pending', 'approved', 'arrived', 'seated'].includes(b.status));
    const pastBookings = bookings.filter(b => ['completed', 'no_show', 'cancelled_by_user', 'cancelled_by_restaurant', 'rejected'].includes(b.status));

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                        {t('guestDashboard.welcomeBack')} <span className="text-primary">{user?.username || 'Гость'}</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">
                        {activeBookings.length > 0
                            ? t('guestDashboard.upcomingReservations', { count: activeBookings.length })
                            : t('guestDashboard.noUpcomingReservations')}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/discover')}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/30 hover:bg-blue-700 transition-all"
                >
                    <span className="material-symbols-outlined text-xl">add</span>
                    {t('guestDashboard.newBooking')}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-10">

                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                {t('guestDashboard.activeBookings')}
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{activeBookings.length}</span>
                            </h2>
                            <Link to="/discover" className="text-primary text-sm font-semibold hover:underline">+ {t('common.add')}</Link>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2].map(i => <div key={i} className="h-52 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                            </div>
                        ) : activeBookings.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-16 text-center">
                                <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">calendar_today</span>
                                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-2">{t('guestDashboard.noActiveReservations')}</h3>
                                <p className="text-slate-400 text-sm mb-6">{t('guestDashboard.discoverSubtitle')}</p>
                                <button
                                    onClick={() => navigate('/discover')}
                                    className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
                                >
                                    {t('guestDashboard.findRestaurants')}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeBookings.map(booking => {
                                    const s = STATUS_STYLES[booking.status] || { cls: 'bg-slate-100 text-slate-500' };
                                    const label = (t as any)(`guestDashboard.status.${booking.status}`) || booking.status;
                                    return (
                                        <div key={booking.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                                    {booking.restaurant_photo_url
                                                        ? <img src={booking.restaurant_photo_url} className="w-full h-full object-cover" alt={booking.restaurant_name} />
                                                        : <span className="material-symbols-outlined text-slate-400">restaurant</span>
                                                    }
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
                                                    {label}
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">{booking.restaurant_name}</h3>

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
                                                    <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
                                                    {formatDate(booking.date)}
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
                                                    <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                                                    {booking.time.substring(0, 5)}
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
                                                    <span className="material-symbols-outlined text-primary text-lg">group</span>
                                                    {booking.guests} {t('guestDashboard.guests')}
                                                </div>
                                            </div>

                                            {(booking.status === 'pending' || booking.status === 'approved') && (
                                                <div className="mt-4">
                                                    {confirmCancelId === booking.id ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setConfirmCancelId(null)}
                                                                className="flex-1 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-colors"
                                                            >
                                                                {t('guestDashboard.keep')}
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancel(booking.id)}
                                                                disabled={cancellingId === booking.id}
                                                                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-1 disabled:opacity-60"
                                                            >
                                                                {cancellingId === booking.id
                                                                    ? <Loader2 size={14} className="animate-spin" />
                                                                    : <><XCircle size={14} /> {t('guestDashboard.cancel')}</>
                                                                }
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                onClick={() => setConfirmCancelId(booking.id)}
                                                                className="flex-1 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                            >
                                                                {t('guestDashboard.cancel')}
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(`/guest/bookings/${booking.id}`)}
                                                                className="flex-1 py-2 rounded-lg bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
                                                            >
                                                                {t('guestDashboard.details')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {pastBookings.length > 0 && (
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t('guestDashboard.visitHistory')}</h2>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {pastBookings.slice(0, 5).map(booking => {
                                        const s = STATUS_STYLES[booking.status] || { cls: 'bg-slate-100 text-slate-500' };
                                        const label = (t as any)(`guestDashboard.status.${booking.status}`) || booking.status;
                                        return (
                                            <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary overflow-hidden">
                                                        {booking.restaurant_photo_url
                                                            ? <img src={booking.restaurant_photo_url} className="w-full h-full object-cover" alt="" />
                                                            : <span className="material-symbols-outlined">restaurant_menu</span>
                                                        }
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{booking.restaurant_name}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{label}</span>
                                                            <span className="text-xs text-slate-400">{formatDate(booking.date)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/discover')}
                                                    className="bg-primary/5 text-primary text-sm font-bold px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-all"
                                                >
                                                    {t('guestDashboard.bookAgain')}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-primary rounded-3xl p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 size-40 bg-white/10 rounded-full blur-2xl" />
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">{t('guestDashboard.member')}</span>
                                <span className="material-symbols-outlined">stars</span>
                            </div>
                            <p className="text-blue-100 text-sm font-medium">{t('guestDashboard.currentLevel')}</p>
                            <h3 className="text-3xl font-black mt-1 mb-6 tracking-tight">{t('guestDashboard.goldMember')}</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs opacity-80 mb-1">{t('guestDashboard.totalPoints')}</p>
                                        <p className="text-2xl font-bold">{bookings.length * 150} <span className="text-sm font-normal opacity-70">{t('guestDashboard.pts')}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs opacity-80 mb-1">{t('guestDashboard.toNextTier')}</p>
                                        <p className="text-lg font-bold">2,550</p>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full" style={{ width: `${Math.min((bookings.length * 150 / 15000) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <button className="w-full mt-6 bg-white text-primary font-bold py-3 rounded-xl hover:bg-slate-100 transition-colors text-sm">
                                {t('guestDashboard.redeemRewards')}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h4 className="text-sm font-bold mb-4 text-slate-900 dark:text-slate-100">{t('guestDashboard.quickStats')}</h4>
                        <div className="space-y-4">
                            {[
                                { label: t('guestDashboard.activeBookings'), value: activeBookings.length, icon: 'event_available' },
                                { label: t('guestDashboard.pastVisits'), value: pastBookings.length, icon: 'history' },
                                { label: t('guestDashboard.totalBookings'), value: bookings.length, icon: 'summarize' },
                            ].map(stat => (
                                <div key={stat.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-sm">{stat.icon}</span>
                                        </div>
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.label}</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden text-white">
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-primary to-blue-600" />
                        <div className="relative z-10">
                            <h4 className="text-lg font-bold mb-2">{t('guestDashboard.weekendSpecial')}</h4>
                            <p className="text-sm text-slate-300 mb-4">{t('guestDashboard.promoText')}</p>
                            <button onClick={() => navigate('/discover')} className="inline-flex items-center text-primary font-bold text-sm hover:gap-2 transition-all gap-1">
                                {t('guestDashboard.exploreRestaurants')}
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

