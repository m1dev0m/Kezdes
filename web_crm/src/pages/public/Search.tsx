import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Search as SearchIcon, MapPin, ChevronDown, Star, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';

interface Restaurant {
    id: number;
    name: string;
    description: string;
    address: string;
    photo_url: string;
    rating: number;
    latitude: number;
    longitude: number;
}

const CITIES = [
    { value: '', label: 'Все', coords: [48.0196, 66.9237] },
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
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => fetchRestaurants(query, cityFilter), 300);
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

    useEffect(() => {
        fetchRestaurants();
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    const filteredRestaurants = useMemo(() => {
        if (!searchQuery) return restaurants;
        const query = searchQuery.toLowerCase();
        return restaurants.filter(r => r.name.toLowerCase().includes(query) || r.address.toLowerCase().includes(query));
    }, [restaurants, searchQuery]);
    const selectedCity = CITIES.find(c => c.value === cityFilter) || CITIES[0];

    const filters = [
        { key: 'all', label: 'All Venues' },
        { key: 'michelin', label: 'Michelin Star' },
        { key: 'romantic', label: 'Romantic' },
        { key: 'new', label: 'New Openings' },
        { key: 'rooftop', label: 'Rooftop' },
        { key: 'price', label: 'Price: $$$$' },
    ] as const;
    const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]['key']>('all');

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden font-display text-slate-900">
            <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
                <section className="mb-12">
                    <div className="flex flex-col gap-2 mb-8">
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Discover Excellence</h1>
                        <p className="text-slate-600 text-lg">Curated dining experiences for the discerning palate.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-2 bg-white rounded-2xl shadow-xl shadow-brand-green/5 border border-slate-200">
                        <div className="lg:col-span-5 flex items-center px-4 py-2 gap-3 border-b lg:border-b-0 lg:border-r border-slate-100">
                            <SearchIcon className="w-5 h-5 text-brand-green" />
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400"
                                placeholder="Search restaurants, cuisines..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                            />
                        </div>

                        <div className="lg:col-span-4 flex items-center px-4 py-2 gap-3 border-b lg:border-b-0 lg:border-r border-slate-100">
                            <MapPin className="w-5 h-5 text-slate-400" />
                            <div className="relative w-full">
                                <button
                                    type="button"
                                    onClick={() => setShowCityDropdown(!showCityDropdown)}
                                    className="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 flex items-center justify-between gap-4 py-2"
                                >
                                    <span className={selectedCity.value ? 'text-slate-900' : 'text-slate-400'}>
                                        {selectedCity.value ? selectedCity.label : 'Location'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showCityDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 shadow-xl z-[100] rounded-xl overflow-hidden"
                                        >
                                            {CITIES.map((city) => (
                                                <button
                                                    key={city.value}
                                                    type="button"
                                                    onClick={() => handleCityChange(city.value)}
                                                    className={`w-full px-5 py-3 text-left text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-3 ${cityFilter === city.value ? 'text-slate-900 bg-slate-50' : 'text-slate-600'}`}
                                                >
                                                    <MapPin size={14} className={cityFilter === city.value ? 'text-brand-green' : 'text-transparent'} />
                                                    {city.label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="lg:col-span-3 flex items-center px-4 py-2 gap-3">
                            <button
                                type="button"
                                className="w-full bg-brand-green text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Search
                            </button>
                        </div>
                    </div>
                </section>

                <section className="flex gap-3 pb-8 overflow-x-auto">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setActiveFilter(f.key)}
                            className={
                                f.key === activeFilter
                                    ? 'flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-brand-green text-white px-6 font-medium shadow-lg shadow-brand-green/20'
                                    : 'flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white border border-slate-200 px-6 font-medium hover:border-brand-green hover:text-brand-green transition-colors'
                            }
                        >
                            {f.label}
                            {f.key === 'price' && <ChevronDown className="w-4 h-4" />}
                        </button>
                    ))}
                </section>

                <section className="mb-16">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-slate-900">Featured Collections</h2>
                        <Link to="/discover" className="text-brand-green font-semibold flex items-center gap-1 hover:underline">
                            View all
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="py-24 text-center">
                            <div className="w-8 h-8 mx-auto border-2 border-slate-200 border-t-brand-green rounded-full animate-spin" />
                        </div>
                    ) : filteredRestaurants.length === 0 ? (
                        <div className="py-24 text-center">
                            <p className="text-slate-500">Ничего не найдено</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <AnimatePresence mode="popLayout">
                                {filteredRestaurants.map((rest, i) => (
                                    <motion.div
                                        key={rest.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: i * 0.03, duration: 0.35 }}
                                        className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300"
                                    >
                                        <div className="relative h-64 overflow-hidden">
                                            <img
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                alt={rest.name}
                                                src={rest.photo_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1400'}
                                            />
                                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-brand-green flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-brand-green text-brand-green" />
                                                {rest.rating ? Number(rest.rating).toFixed(1) : 'NEW'}
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                                                        {rest.name}
                                                    </h3>
                                                    <p className="text-slate-500 text-sm">{selectedCity.value || 'Premium'} • {rest.address}</p>
                                                </div>
                                            </div>
                                            <p className="text-slate-600 text-sm mb-4 line-clamp-2">{rest.description || ''}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                <span className="text-slate-900 font-bold">$$$</span>
                                                <Link
                                                    to={`/restaurant/${rest.id}`}
                                                    className="text-brand-green text-sm font-bold flex items-center gap-1 hover:translate-x-1 transition-transform"
                                                >
                                                    Reserve Table
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </section>

                <section className="rounded-3xl overflow-hidden relative h-[400px] bg-slate-200 border border-slate-200">
                    <img
                        alt="Stylized map showing premium restaurant locations"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 grayscale-[0.5]"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUxuWfwDn_QEoy-v1FO-NNljioyiD06gryqLJXGZmZwsdmXrbmVA6Yu03QKnyurL0gED5viLesRLOiwrf8VL67rPwSwGUsjsA8z-NSytlvTkvk6Q0qpMPbhjyTxoH1SiYNW3T0C0bjAoDb-cWJYdi8GAPRRjPA1Llo8J6E1r3_bcA2ViGNRnOZVN4M7lKtffQ3h3WQuK57y8-CDDB5dK86JdBmnEHgfOFNVH9uAV08xmCGeLoZt3iqHDy-1cbFnGKCo2DzssHV2SjU"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121d1a]/80 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                        <MapPin className="w-12 h-12 text-brand-green mb-4" />
                        <h2 className="text-3xl font-extrabold text-white mb-4">Explore by Location</h2>
                        <p className="text-slate-200 max-w-md mb-8">Find the perfect table in your favorite neighborhood with our interactive map view.</p>
                        <Link
                            to="/discover/map"
                            className="bg-white text-brand-green px-8 py-3 rounded-full font-bold hover:bg-brand-green hover:text-white transition-all shadow-xl"
                        >
                            Open Interactive Map
                        </Link>
                    </div>
                </section>

                <footer className="mt-16 border-t border-slate-200 pt-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 text-brand-green">
                        <Logo className="h-6" />
                    </div>
                    <p className="text-slate-400 text-xs">© 2024 Kezdes Dining Group. All rights reserved.</p>
                    <div className="flex gap-6">
                        <span className="text-slate-400 text-xs flex items-center gap-1 italic">Always Fresh. Always Premium.</span>
                    </div>
                </footer>
            </main>
        </div>
    );
}
