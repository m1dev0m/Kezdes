import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';

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

export default function GuestFavorites() {
    const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const res = await api.get('/restaurants/favorites/');
            setFavorites(res.data);
        } catch (err) {
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
        } catch (err) {
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

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                <div className="size-12 border-4 border-[#1d4ed8]/20 border-t-[#1d4ed8] rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Загружаем вашу коллекцию...</span>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1280px] px-6 py-8 space-y-12 pb-20">
            {/* Header section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-3">
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">Персональная коллекция</div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">Избранное</h1>
                    <p className="max-w-xl text-sm font-medium leading-7 text-slate-600">Ваша персональная подборка лучших заведений, где вы всегда желанный гость.</p>
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

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-3">
                {['Все кухни', 'Fine Dining', 'Quick Bite', 'Цена'].map(tag => (
                    <button key={tag} className="px-5 py-2.5 rounded-xl border border-slate-100 bg-white text-xs font-bold uppercase tracking-widest text-slate-500 hover:border-[#1d4ed8] hover:text-[#1d4ed8] transition-all flex items-center gap-2">
                        {tag}
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                    </button>
                ))}
            </div>

            {filteredFavorites.length === 0 ? (
                <div className="rounded-[3rem] border-2 border-dashed border-slate-100 bg-white p-24 text-center space-y-6">
                    <div className="size-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <span className="material-symbols-outlined text-slate-300 text-[48px]">favorite</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">Ваша коллекция пуста</h3>
                        <p className="text-slate-500 font-medium max-w-sm mx-auto">Начните исследовать лучшие заведения города и сохраняйте их здесь.</p>
                    </div>
                    <Link to="/discover" className="inline-flex h-14 items-center gap-3 bg-[#1d4ed8] text-white px-8 rounded-2xl font-bold shadow-2xl shadow-blue-200 hover:bg-[#1e40af] transition-all active:scale-[0.98]">
                        <span className="material-symbols-outlined">explore</span>
                        Исследовать рестораны
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredFavorites.map((restaurant) => (
                        <article key={restaurant.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-100 transition-all hover:-translate-y-1">
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <img
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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

                                <Link
                                    to={`/restaurant/${restaurant.id}`}
                                    className="w-full h-11 flex items-center justify-center bg-[#1d4ed8] text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all hover:bg-[#1e40af]"
                                >
                                    Забронировать
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* Featured Experience Section */}
            <div className="pt-8">
                <div className="bg-slate-950 rounded-[3rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl border border-slate-800">
                    <div className="lg:w-1/2 relative min-h-[400px]">
                        <img
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                            alt="Featured favorite restaurant"
                            src="https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent lg:hidden" />
                    </div>
                    <div className="lg:w-1/2 p-12 lg:p-20 flex flex-col justify-center space-y-8 relative">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex text-[#1d4ed8]">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <span key={i} className="material-symbols-outlined text-[16px] fill-1">star</span>
                                    ))}
                                </div>
                                <span className="text-[#1d4ed8] text-[9px] font-black tracking-[0.3em] uppercase">Выбор редакции</span>
                            </div>
                            <h3 className="text-5xl font-extrabold text-white tracking-tighter leading-[0.9]">Grand Heritage Grill</h3>
                            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md">
                                Почувствуйте кулинарное совершенство в вашем любимом заведении. Топ-1 стейкхаус города три года подряд.
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link
                                to="/discover"
                                className="h-14 bg-[#1d4ed8] text-white px-10 rounded-2xl font-bold transition-all hover:bg-[#1e40af] hover:-translate-y-1 shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center text-xs uppercase tracking-widest"
                            >
                                Забронировать сейчас
                            </Link>
                            <button
                                className="flex items-center gap-3 text-white font-bold text-xs uppercase tracking-widest hover:text-[#1d4ed8] transition-colors group"
                            >
                                <span className="material-symbols-outlined group-hover:bounce">near_me</span>
                                Маршрут
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
