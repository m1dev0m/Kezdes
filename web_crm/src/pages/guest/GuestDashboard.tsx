import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { format, parseISO, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ArrowRight, Bell, CalendarDays, Heart, Loader2, MapPin, Star, Users, XCircle } from 'lucide-react';
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

    const activeBookings = bookings.filter(b => ['pending', 'approved', 'confirmed', 'payment_pending', 'arrived', 'seated'].includes(b.status));
    const pastBookings = bookings.filter(b => ['completed', 'no_show', 'cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'rejected'].includes(b.status));

    const upcomingBooking = activeBookings[0];

    const loyaltyPoints = useMemo(() => bookings.length * 150, [bookings.length]);
    const favoriteRestaurants = useMemo(() => {
        const map = new Map<string, { name: string; city?: string; photo?: string; rating?: number }>();
        for (const b of bookings) {
            if (!b.restaurant_name) continue;
            if (!map.has(b.restaurant_name)) {
                map.set(b.restaurant_name, {
                    name: b.restaurant_name,
                    city: b.restaurant_city,
                    photo: b.restaurant_photo_url,
                    rating: 4.8,
                });
            }
        }
        return Array.from(map.values()).slice(0, 2);
    }, [bookings]);

    const recentActivity = useMemo(() => {
        const items: Array<{ title: string; subtitle: string; badge?: string }> = [];
        const past = pastBookings.slice(0, 2);
        if (past[0]) {
            items.push({
                title: `Visited '${past[0].restaurant_name}'`,
                subtitle: `${formatDate(past[0].date)}`,
                badge: `EARNED +150 PTS`,
            });
        }
        if (past[1]) {
            items.push({
                title: `New Review: ${past[1].restaurant_name}`,
                subtitle: `${formatDate(past[1].date)}`,
            });
        }
        if (items.length === 0) {
            items.push({ title: 'Discover your next table', subtitle: 'Start exploring premium restaurants' });
        }
        return items.slice(0, 3);
    }, [pastBookings]);

    return (
        <div className="space-y-10 pb-20 w-full animate-in fade-in duration-500">
            {/* Header Block */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm mt-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
                        Welcome back, {user?.username || 'Guest'}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        {activeBookings.length > 0
                            ? t('guestDashboard.upcomingReservations', { count: activeBookings.length })
                            : "You don't have any upcoming reservations. Let's change that."}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/discover')}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        {t('guestDashboard.findRestaurants')}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    <section>
                        <h2 className="text-xl font-black mb-6 text-slate-900 flex items-center gap-3">
                            <span className="bg-primary/10 text-primary p-2 rounded-lg">
                                <CalendarDays className="w-5 h-5" />
                            </span>
                            Upcoming Reservation
                        </h2>

                        {loading ? (
                            <div className="h-64 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
                        ) : !upcomingBooking ? (
                            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">restaurant</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">No Active Bookings</h3>
                                <p className="text-slate-500 max-w-sm mx-auto leading-relaxed mb-8">
                                    Your dining calendar is currently clear. Discover premium restaurants and book your next unforgettable meal.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/discover')}
                                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all"
                                >
                                    Explore Top Restaurants
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex flex-col md:flex-row">
                                <div className="w-full md:w-1/3 h-48 md:h-auto bg-slate-200 overflow-hidden">
                                    {upcomingBooking.restaurant_photo_url ? (
                                        <img
                                            src={upcomingBooking.restaurant_photo_url}
                                            alt={upcomingBooking.restaurant_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200" />
                                    )}
                                </div>

                                <div className="flex-1 p-6 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold tracking-widest text-brand-green uppercase">Confirmed • Upcoming</span>
                                            <span className="px-2 py-1 bg-brand-green/10 text-brand-green text-[10px] font-bold rounded uppercase tracking-wider">PREMIUM SEATING</span>
                                        </div>

                                        <h3 className="text-2xl font-bold mb-1">{upcomingBooking.restaurant_name}</h3>
                                        <p className="text-slate-500 flex items-center gap-2 text-sm mb-4">
                                            <MapPin className="w-4 h-4" />
                                            {upcomingBooking.restaurant_city || '—'}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <CalendarDays className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Date</p>
                                                    <p className="text-sm font-medium">{formatDate(upcomingBooking.date)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-slate-400">schedule</span>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Time</p>
                                                    <p className="text-sm font-medium">{upcomingBooking.time.substring(0, 5)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-6">
                                        <div className="flex -space-x-2">
                                            <div className="size-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">AT</div>
                                            <div className="size-8 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700">JT</div>
                                        </div>

                                        <div className="flex gap-2">
                                            {(['pending', 'approved', 'confirmed', 'payment_pending'].includes(upcomingBooking.status)) && (
                                                confirmCancelId === upcomingBooking.id ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmCancelId(null)}
                                                            className="px-4 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
                                                        >
                                                            {t('guestDashboard.keep')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancel(upcomingBooking.id)}
                                                            disabled={cancellingId === upcomingBooking.id}
                                                            className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-60"
                                                        >
                                                            {cancellingId === upcomingBooking.id
                                                                ? <Loader2 size={14} className="animate-spin" />
                                                                : <><XCircle size={14} /> {t('guestDashboard.cancel')}</>
                                                            }
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmCancelId(upcomingBooking.id)}
                                                        className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
                                                    >
                                                        {t('guestDashboard.cancel')}
                                                    </button>
                                                )
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => navigate(`/guest/bookings/${upcomingBooking.id}`)}
                                                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-slate-900">Curated For You</h2>
                            <Link to="/guest/favorites" className="text-primary text-sm font-bold hover:underline">View All</Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(favoriteRestaurants.length ? favoriteRestaurants : [{ name: 'Oumi Sushi' }, { name: 'Terra E Mare' }]).map((r) => (
                                <div
                                    key={r.name}
                                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 hover:border-brand-green/30 transition-all cursor-pointer group"
                                    onClick={() => navigate('/discover')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="size-20 rounded-lg bg-slate-200 shrink-0 overflow-hidden">
                                        {r.photo ? (
                                            <img src={r.photo} alt={r.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-200" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold group-hover:text-brand-green transition-colors">{r.name}</h4>
                                        <p className="text-xs text-slate-500 mb-2">{r.city || 'Premium'} • Discover</p>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            <span className="text-xs font-bold">{(r.rating ?? 4.8).toFixed(1)}</span>
                                            <span className="text-[10px] text-slate-400">(reviews)</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <section>
                        <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                            <span className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                                <Star className="w-5 h-5 fill-emerald-700" />
                            </span>
                            Dining Summary
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-brand-green/5 p-5 rounded-xl border border-brand-green/10">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-brand-green flex items-center justify-center text-white">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black">{bookings.length}</p>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Bookings</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-5">
                                    <div className="size-14 rounded-xl bg-slate-100 flex items-center justify-center text-primary">
                                        <Star className="w-7 h-7 fill-primary" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-black text-slate-900">{loyaltyPoints.toLocaleString('ru-RU')}</p>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loyalty Points</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-5">
                                    <div className="size-14 rounded-xl bg-slate-100 flex items-center justify-center text-rose-500">
                                        <Heart className="w-7 h-7 fill-rose-500" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-black text-slate-900">French</p>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Top Cuisine</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {recentActivity.map((a, idx) => (
                                    <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                                        <p className="text-sm font-bold">{a.title}</p>
                                        <p className="text-xs text-slate-400 mb-2">{a.subtitle}</p>
                                        {a.badge && (
                                            <div className="flex items-center gap-1">
                                                <div className="bg-brand-green/10 text-brand-green text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight">{a.badge}</div>
                                            </div>
                                        )}
                                        {!a.badge && idx === 1 && (
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <Star key={i} className="w-3 h-3 text-brand-green fill-brand-green" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate('/guest/dashboard')}
                                className="w-full py-3 text-sm font-bold text-slate-500 hover:text-brand-green border-t border-slate-100 transition-colors"
                            >
                                View History
                            </button>
                        </div>
                    </section>

                    <section className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden text-white">
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-brand-green to-gold" />
                        <div className="relative z-10">
                            <h4 className="text-lg font-bold mb-2">{t('guestDashboard.weekendSpecial')}</h4>
                            <p className="text-sm text-slate-300 mb-4">{t('guestDashboard.promoText')}</p>
                            <button
                                type="button"
                                onClick={() => navigate('/discover')}
                                className="inline-flex items-center gap-2 text-gold font-bold text-sm hover:gap-3 transition-all"
                            >
                                {t('guestDashboard.exploreRestaurants')}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

