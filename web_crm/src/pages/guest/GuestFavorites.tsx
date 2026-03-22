import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Heart, MapPin, Search, Star } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';

interface FavoriteRestaurant {
    id: number;
    name: string;
    address: string;
    photo_url: string;
    rating: number;
    price_level: number;
    opening_time: string;
    closing_time: string;
    capacity: number;
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
            <div className="space-y-8 pb-12">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-72 w-full rounded-3xl" count={6} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-black text-brand-green tracking-tight">My Favorites</h2>
                    <p className="text-slate-600 mt-1">Your curated list of top dining experiences</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:ring-brand-green/20 focus:border-brand-green"
                            placeholder="Search favorites..."
                            type="text"
                        />
                    </div>
                </div>
            </header>

            <div className="flex flex-wrap gap-3">
                <button type="button" className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-full text-sm font-medium">
                    All Cuisine
                    <ChevronDown className="w-4 h-4" />
                </button>
                <button type="button" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-50">
                    Location
                    <ChevronDown className="w-4 h-4" />
                </button>
                <button type="button" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-50">
                    Price Range
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>

            {filteredFavorites.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Heart className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No favorites yet</h3>
                    <p className="text-slate-500 mb-6">Start exploring restaurants and save your favorites!</p>
                    <Link to="/discover" className="inline-flex items-center gap-2 bg-brand-green text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-green/90 transition-colors">
                        Discover Restaurants
                    </Link>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredFavorites.map((restaurant) => (
                            <div key={restaurant.id} className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    {restaurant.photo_url ? (
                                        <img
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            src={restaurant.photo_url}
                                            alt={restaurant.name}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                            <MapPin className="w-12 h-12 text-slate-300" />
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeFavorite(restaurant.id)}
                                        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-brand-green shadow-sm"
                                        aria-label="Remove favorite"
                                    >
                                        <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                                    </button>
                                    <div className="absolute bottom-3 left-3 bg-brand-green/90 text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                        Premium
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-lg text-brand-green tracking-tight">{restaurant.name}</h3>
                                        <div className="flex items-center gap-1 text-brand-green">
                                            <Star className="w-4 h-4 fill-brand-green text-brand-green" />
                                            <span className="text-sm font-bold">{restaurant.rating?.toFixed(1) || 'New'}</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-sm mb-4">{restaurant.address}</p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-xs text-slate-400">{Math.max(40, Math.round((restaurant.rating || 4.8) * 50))} reviews</span>
                                        <Link
                                            to={`/restaurant/${restaurant.id}`}
                                            className="bg-brand-green hover:bg-brand-green/90 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Book Table
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-1 bg-gradient-to-r from-brand-green/20 to-gold/20 rounded-2xl">
                        <div className="bg-brand-green rounded-xl overflow-hidden flex flex-col lg:flex-row items-stretch">
                            <div className="lg:w-1/2 min-h-[300px] bg-slate-200">
                                <img
                                    className="w-full h-full object-cover"
                                    alt="Featured favorite restaurant"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAo9KnMxn4pmXH6H6JBFvyGIqZPAt_iK6n0aS5ozTjnrW9n4JYb-wMTUNQzZktTf0HWlMHnBcq2ikzDZ8P69jj6nPPOKlw3WHdrATgDn6hg--gW6tyZhcpNZa6dMzwW8vbGou57ldiXm0f4X3ITzu6mfGvqcAIS_WwhdUiT5dP3agmc1FC3PqrvwOSdMNfT1MFA4TPO98QcfmhOZf2P8wnk4w1DHImN45Wmnspff2RDfiTgx8xoHUAk0LMcXlYNxeG2s-mJt88l4rXi"
                                />
                            </div>
                            <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex text-gold">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                                        ))}
                                    </div>
                                    <span className="text-gold text-xs font-bold tracking-widest uppercase">Editor's Choice</span>
                                </div>
                                <h3 className="text-3xl font-black text-white mb-2">Grand Heritage Grill</h3>
                                <p className="text-slate-200 mb-6 leading-relaxed">
                                    Voted the #1 steakhouse in the city for three consecutive years. Your favorite spot for celebrating special occasions with impeccable service.
                                </p>
                                <div className="flex items-center gap-4">
                                    <Link
                                        to="/discover"
                                        className="bg-gold text-brand-green px-8 py-3 rounded-xl font-bold transition-transform active:scale-95"
                                    >
                                        Reserve Now
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                        className="flex items-center gap-2 text-white font-medium hover:text-gold transition-colors"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        View on Map
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
