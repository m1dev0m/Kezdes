import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, MapPin, ChevronDown, Clock, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';
import { Logo } from '@/components/ui/Logo';
type DGLib = {
    then: (cb: () => void) => Promise<void>;
    map: (container: HTMLDivElement, options: Record<string, unknown>) => unknown;
    marker: (coords: [number, number]) => { addTo: (map: unknown) => { bindPopup: (html: string) => void } };
};

interface Restaurant {
    id: number;
    name: string;
    description: string;
    address: string;
    photo_url: string;
    rating: number;
    average_price: number;
    price_level: number;
    latitude: number;
    longitude: number;
}

const CITIES = [
    { value: '', label: 'Все города', coords: [48.0196, 66.9237] }, // Center of Kazakhstan
    { value: 'Алматы', label: 'Алматы', coords: [43.238949, 76.889709] },
    { value: 'Астана', label: 'Астана', coords: [51.169392, 71.449074] },
];

export default function Search() {
    const { t } = useI18n();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const mapRef = useRef<unknown>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const isMapInitialized = useRef(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const fetchRestaurants = useCallback(async (search = searchQuery, city = cityFilter) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (search) params.search = search;
            if (city) params.city = city;
            const res = await api.get('/restaurants/', { params });
            setRestaurants(res.data.results ?? res.data);
        } catch {
            toast.error(t('errors.fetchFailed'));
        } finally {
            setLoading(false);
        }
    }, [cityFilter, searchQuery, t]);

    const debouncedSearch = useCallback((query: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            fetchRestaurants(query, cityFilter);
        }, 300);
    }, [fetchRestaurants, cityFilter]);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleCityChange = (city: string) => {
        setCityFilter(city);
        setShowCityDropdown(false);
        fetchRestaurants(searchQuery, city);
    };

    const initMap = useCallback(() => {
        if (isMapInitialized.current) return;

        const DG = (window as Window & { dg?: DGLib }).dg;
        if (!DG || !mapContainerRef.current) return;

        const container = mapContainerRef.current;

        DG.then(() => {
            const cityCoords = CITIES.find(c => c.value === cityFilter)?.coords || CITIES[0].coords;

            mapRef.current = DG.map(container, {
                center: cityCoords,
                zoom: 12,
                zoomControl: true,
                fullscreenControl: false
            });

            isMapInitialized.current = true;

            restaurants.forEach(rest => {
                if (rest.latitude && rest.longitude) {
                    DG.marker([rest.latitude, rest.longitude])
                        .addTo(mapRef.current)
                        .bindPopup(`<div style="font-family: 'Space Grotesk', sans-serif; padding: 5px;">
                        <b style="color: #8037FF;">${rest.name}</b><br/>
                        <span style="font-size: 10px; color: #666;">${rest.address}</span>
                      </div>`);
                }
            });
        }).catch((err: unknown) => {
            console.error('2GIS initialization failed:', err);
        });
    }, [restaurants, cityFilter]);

    useEffect(() => {
        fetchRestaurants();

        const checkDG = setInterval(() => {
            if ((window as Window & { dg?: DGLib }).dg) {
                initMap();
                clearInterval(checkDG);
            }
        }, 500);

        return () => {
            clearInterval(checkDG);
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const filteredRestaurants = useMemo(() => {
        if (!searchQuery) return restaurants;
        const query = searchQuery.toLowerCase();
        return restaurants.filter(r =>
            r.name.toLowerCase().includes(query) ||
            r.address.toLowerCase().includes(query)
        );
    }, [restaurants, searchQuery]);

    const selectedCity = CITIES.find(c => c.value === cityFilter) || CITIES[0];

    return (
        <div className="relative flex min-h-screen flex-col bg-white dark:bg-[#0D0D1F] font-sans selection:bg-primary/20">
            <header className="sticky top-0 z-[100] bg-white dark:bg-brand-dark border-b border-slate-100 dark:border-white/5 shadow-sm">
                <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-3">
                    <div className="flex items-center justify-between gap-4 lg:gap-8 mb-3">
                        <Link to="/" className="flex items-center gap-3 group shrink-0">
                            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 transition-all group-hover:scale-105">
                                K
                            </div>
                            <span className="text-xl font-black tracking-tighter hidden md:block"><Logo /></span>
                        </Link>

                        <div className="flex-1 max-w-3xl flex items-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-inner">
                            <div className="flex-1 flex items-center px-3 lg:px-4 border-r border-slate-200 dark:border-white/10 group">
                                <SearchIcon className="text-slate-400 group-focus-within:text-primary transition-colors w-4 lg:w-5" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder={t('public.searchPlaceholder') || 'Поиск ресторанов...'}
                                    className="w-full px-2 lg:px-4 py-2.5 lg:py-3.5 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400"
                                />
                            </div>

                            <div className="relative h-full">
                                <button
                                    onClick={() => setShowCityDropdown(!showCityDropdown)}
                                    className="flex items-center px-3 lg:px-4 h-full border-r border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors gap-2"
                                >
                                    <MapPin size={14} className="text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">{selectedCity.label}</span>
                                    <ChevronDown size={12} className={`transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showCityDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 mt-2 min-w-[160px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[100]"
                                        >
                                            {CITIES.map(city => (
                                                <button
                                                    key={city.value}
                                                    onClick={() => handleCityChange(city.value)}
                                                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-primary/10 transition-colors flex items-center gap-2 ${cityFilter === city.value ? 'text-primary bg-primary/5' : 'text-slate-700 dark:text-slate-300'}`}
                                                >
                                                    <MapPin size={14} className={cityFilter === city.value ? 'text-primary' : 'text-slate-400'} />
                                                    {city.label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                onClick={() => fetchRestaurants(searchQuery, cityFilter)}
                                className="bg-primary text-white p-2.5 lg:p-3.5 hover:bg-primary/90 transition-colors rounded-r-2xl"
                            >
                                <SearchIcon size={16} className="lg:w-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 lg:gap-3">
                            <Link
                                to="/login"
                                className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors px-3 lg:px-4"
                            >
                                Войти
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                <div className="flex flex-col h-[calc(100vh-80px)] overflow-y-auto w-full lg:w-[480px] xl:w-[560px] border-r border-slate-100 dark:border-white/5">
                    <div className="px-4 lg:px-8 py-4 lg:py-6 border-b border-slate-50 dark:border-white/5">
                        <h2 className="text-lg lg:text-xl font-black text-brand-dark dark:text-white tracking-tight uppercase">
                            {filteredRestaurants.length} заведений {selectedCity.value ? `в ${selectedCity.label}` : ''}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {loading ? 'Поиск...' : 'Найдено'}
                        </p>
                    </div>

                    <div className="p-4 lg:p-6">
                        {loading ? (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Загрузка...</p>
                            </div>
                        ) : filteredRestaurants.length === 0 ? (
                            <div className="py-20 text-center">
                                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Рестораны не найдены</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 lg:gap-6">
                                <AnimatePresence mode="popLayout">
                                    {filteredRestaurants.map((rest, i) => (
                                        <motion.div
                                            key={rest.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: Math.min(i * 0.03, 0.2) }}
                                        >
                                            <Link to={`/restaurant/${rest.id}`} className="group flex bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden hover:shadow-xl transition-all hover:scale-[1.01]">
                                                <div className="w-28 lg:w-32 h-24 lg:h-28 shrink-0 overflow-hidden">
                                                    <img
                                                        src={rest.photo_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=200"}
                                                        alt={rest.name}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                </div>
                                                <div className="flex-1 p-3 lg:p-4 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className="text-sm lg:text-base font-black text-brand-dark dark:text-white tracking-tight truncate uppercase">
                                                            {rest.name}
                                                        </h3>
                                                        <div className="flex items-center gap-1 text-primary bg-primary/5 px-1.5 py-0.5 rounded-lg text-[10px] font-black shrink-0">
                                                            <Star size={10} className="fill-primary" />
                                                            {rest.rating ? Number(rest.rating).toFixed(1) : 'NEW'}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1 truncate">
                                                        {rest.address.split(',')[0]}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Clock size={12} className="text-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase">Свободно</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                <div className="hidden lg:block flex-1 relative bg-slate-100">
                    <div ref={mapContainerRef} className="w-full h-full" id="map-cont" />
                </div>
            </main>
        </div>
    );
}
