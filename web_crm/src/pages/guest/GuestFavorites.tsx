import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Star, Clock, Users } from 'lucide-react';
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Favorites</h1>
                    <p className="text-slate-500 font-medium mt-1">Your saved restaurants.</p>
                </div>
                <div className="text-sm font-bold text-slate-500">
                    {favorites.length} restaurant{favorites.length !== 1 ? 's' : ''}
                </div>
            </div>

            {favorites.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Heart className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No favorites yet</h3>
                    <p className="text-slate-500 mb-6">Start exploring restaurants and save your favorites!</p>
                    <Link to="/discover" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
                        Discover Restaurants
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((restaurant) => (
                        <div key={restaurant.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                            <div className="relative aspect-video overflow-hidden">
                                {restaurant.photo_url ? (
                                    <img src={restaurant.photo_url} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <MapPin className="w-12 h-12 text-slate-300" />
                                    </div>
                                )}
                                <button 
                                    onClick={() => removeFavorite(restaurant.id)}
                                    className="absolute top-4 right-4 w-10 h-10 bg-white/90 dark:bg-slate-900/90 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:scale-110 transition-all shadow-lg"
                                >
                                    <Heart className="w-5 h-5 fill-current" />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{restaurant.name}</h3>
                                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                                        <Star className="w-4 h-4 text-amber-500 fill-current" />
                                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{restaurant.rating?.toFixed(1) || 'New'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {restaurant.opening_time} - {restaurant.closing_time}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {restaurant.capacity}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                                    <MapPin className="w-4 h-4 shrink-0" />
                                    <span className="truncate">{restaurant.address}</span>
                                </div>
                                <Link 
                                    to={`/restaurant/${restaurant.id}`}
                                    className="block w-full text-center py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-colors"
                                >
                                    Book Now
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
