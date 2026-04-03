import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { buildRestaurantBookHref, getLocalDateString } from '@/features/reservations/shared';

interface FavoriteRestaurant {
    id: number;
    name: string;
    address: string;
    photo_url: string;
    rating: number;
    price_level: number;
    opening_time: string;
    closing_time: string;
}

type RecentBookingContext = {
    restaurantId?: number;
    date?: string;
    time?: string;
    guests?: number;
    status?: string;
};

function loadRecentBookingContext(restaurantId: number): RecentBookingContext | null {
    if (typeof window === 'undefined') return null;

    const keys = [
        `kezdes:reservation-success:${restaurantId}`,
        `kezdes:booking-success:${restaurantId}`,
        `kezdes:waitlist-success:${restaurantId}`,
    ];

    for (const key of keys) {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) continue;

        try {
            const parsed = JSON.parse(raw) as RecentBookingContext;
            if (parsed && parsed.restaurantId === restaurantId) return parsed;
        } catch {
            continue;
        }
    }

    return null;
}

function formatRepeatContext(context: RecentBookingContext | null) {
    if (!context?.date) return null;
    const date = new Date(`${context.date}T00:00:00`);
    const dateLabel = Number.isNaN(date.getTime())
        ? context.date
        : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date);
    const timeLabel = context.time?.slice(0, 5) || '19:00';
    const guestsLabel = context.guests ? `${context.guests} гостей` : '2 гостя';
    return `${dateLabel} · ${timeLabel} · ${guestsLabel}`;
}

export default function GuestFavorites() {
    const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        setError(null);
        setLoading(true);
        try {
            const res = await api.get('/restaurants/favorites/');
            const payload = res.data;
            setFavorites(Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : []);
        } catch {
            setFavorites([]);
            setError('Не удалось загрузить избранное. Проверьте соединение и попробуйте ещё раз.');
            toast.error('Failed to load favorites');
        } finally {
            setLoading(false);
        }
    };

    const removeFavorite = async (id: number) => {
        try {
            await api.delete(`/restaurants/${id}/favorite/`);
            setFavorites(prev => prev.filter(r => r.id !== id));
            toast.success('Removed from favorites');
        } catch {
            toast.error('Failed to remove');
        }
    };

    const filteredFavorites = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return favorites;
        return favorites.filter((r) => {
            const hay = `${r.name} ${r.address}`.toLowerCase();
            return hay.includes(q);
        });
    }, [favorites, query]);

    const favoriteContexts = useMemo(() => {
        return new Map(
            favorites.map((restaurant) => [restaurant.id, loadRecentBookingContext(restaurant.id)] as const),
        );
    }, [favorites]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                <div className="size-12 border-4 border-[#1d4ed8]/20 border-t-[#1d4ed8] rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Загружаем вашу коллекцию...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="size-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                    <span className="material-symbols-outlined text-[32px]">error</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Не удалось загрузить избранное</h2>
                <p className="max-w-lg text-sm font-medium leading-7 text-slate-500">{error}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button onClick={loadFavorites} className="inline-flex h-12 items-center gap-3 rounded-2xl bg-[#1d4ed8] px-6 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-[#1e40af]">
                        Повторить
                    </button>
                    <Link to="/restaurants" className="inline-flex h-12 items-center gap-3 rounded-2xl bg-slate-100 px-6 text-xs font-bold uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-200">
                        Найти ресторан
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1280px] px-6 py-8 space-y-12 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-3">
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">Персональная коллекция</div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">Избранное</h1>
                    <p className="max-w-xl text-sm font-medium leading-7 text-slate-600">
                        Быстрый доступ к любимым ресторанам и к последним параметрам бронирования, если вы уже недавно ходили туда.
                    </p>
                </div>

                <div className="group relative w-full md:w-80">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1d4ed8] transition-colors text-[20px]">search</span>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#1d4ed8]/5 focus:border-[#1d4ed8] transition-all text-sm font-bold"
                        placeholder="Поиск по избранному..."
                    />
                </div>
            </header>

            {filteredFavorites.length === 0 ? (
                <div className="rounded-[3rem] border-2 border-dashed border-slate-100 bg-white p-24 text-center space-y-6">
                    <div className="size-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <span className="material-symbols-outlined text-slate-300 text-[48px]">favorite</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">{query.trim() ? 'Ничего не найдено' : 'Ваша коллекция пуста'}</h3>
                        <p className="text-slate-500 font-medium max-w-sm mx-auto">
                            {query.trim()
                                ? 'Попробуйте другой запрос или сбросьте поиск, чтобы увидеть все сохранённые рестораны.'
                                : 'Начните исследовать лучшие заведения города и сохраняйте их здесь.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {query.trim() ? (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="inline-flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 font-bold text-xs uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50"
                            >
                                Сбросить поиск
                            </button>
                        ) : null}
                        <Link to="/restaurants" className="inline-flex h-14 items-center gap-3 bg-[#1d4ed8] text-white px-8 rounded-2xl font-bold shadow-2xl shadow-blue-200 hover:bg-[#1e40af] transition-all active:scale-[0.98]">
                            <span className="material-symbols-outlined">explore</span>
                            Перейти к ресторанам
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredFavorites.map((restaurant) => {
                        const repeatContext = favoriteContexts.get(restaurant.id) ?? null;

                        return (
                        <article key={restaurant.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm transition-all">
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <img
                                    className="w-full h-full object-cover transition-transform duration-700"
                                    src={restaurant.photo_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                                    alt={restaurant.name}
                                />
                                <button
                                    onClick={() => removeFavorite(restaurant.id)}
                                    className="absolute top-4 right-4 size-10 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-rose-500 shadow-xl border border-white/20 hover:scale-110 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-[20px] fill-1">favorite</span>
                                </button>
                                <div className="absolute bottom-4 left-4 flex gap-1.5">
                                    <div className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest text-[#1d4ed8] shadow-sm">
                                        {restaurant.price_level === 3 ? '$$$' : restaurant.price_level === 2 ? '$$' : '$'}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-900 truncate group-hover:text-[#1d4ed8] transition-colors leading-tight">{restaurant.name}</h3>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-yellow-500 text-[14px] fill-1">star</span>
                                        <span className="text-xs font-bold text-slate-900">{restaurant.rating?.toFixed(1) || '4.8'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400 mb-6">
                                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                                    <p className="text-[10px] font-bold truncate tracking-tight">{restaurant.address}</p>
                                </div>

                                {repeatContext ? (
                                    <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-medium leading-6 text-slate-700">
                                        <div className="font-bold uppercase tracking-widest text-[#1d4ed8]">Последняя бронь</div>
                                        <div className="mt-1">{formatRepeatContext(repeatContext)}</div>
                                    </div>
                                ) : null}

                                <div className="flex flex-col gap-3">
                                    <Link
                                        to={buildRestaurantBookHref(
                                            restaurant.id,
                                            repeatContext ?? {
                                                date: getLocalDateString(),
                                                time: '19:00',
                                                guests: 2,
                                            },
                                        )}
                                        className="w-full h-11 flex items-center justify-center bg-[#1d4ed8] text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all hover:bg-[#1e40af]"
                                    >
                                        {repeatContext ? 'Повторить бронь' : 'Забронировать'}
                                    </Link>
                                    <Link
                                        to={`/restaurant/${restaurant.id}`}
                                        className="w-full h-11 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50"
                                    >
                                        Открыть профиль
                                    </Link>
                                </div>
                            </div>
                        </article>
                        );
                    })}
                </div>
            )}
            <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 text-sm leading-7 text-slate-600">
                Избранное хранит быстрый вход в ресторан, а если вы недавно уже бронировали это место, кнопка сразу подставит прошлые параметры.
            </div>
        </div>
    );
}
