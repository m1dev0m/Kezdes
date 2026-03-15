import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Phone, Star, Users, Info, MessageCircle, ArrowRight, Share2, Heart, UtensilsCrossed, TrendingUp } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import ClientChat from '@/components/ClientChat';
import { DEFAULT_COORDS } from '@/constants';

declare global {
    interface Window {
        DG: {
            map: (container: HTMLDivElement, options: Record<string, unknown>) => { remove: () => void };
            marker: (coords: [number, number]) => { addTo: (map: { remove: () => void }) => { bindPopup: (text: string) => void } };
        };
    }
}

interface PublicTable {
    id: number;
    number: string;
    seats: number;
    is_active: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    table_type: string;
}

interface MenuItem {
    id: number;
    name: string;
    description: string;
    price: string;
    image_url: string;
    is_available: boolean;
}

interface MenuCategory {
    id: number;
    name: string;
    items: MenuItem[];
}

interface PublicRestaurant {
    id: number;
    name: string;
    description: string;
    address: string;
    phone: string;
    image_url: string;
    photo_url: string;
    opening_time: string;
    closing_time: string;
    capacity: number;
    rating: number;
    price_level: number;
    latitude: number;
    longitude: number;
    tables: PublicTable[];
}

export default function RestaurantPage() {
    const { id } = useParams();
    const [restaurant, setRestaurant] = useState<PublicRestaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const dgMap = useRef<{ remove: () => void } | null>(null);

    const loadRestaurant = useCallback(async () => {
        try {
            const res = await api.get(`/restaurants/${id}/`);
            setRestaurant(res.data);
        } catch {
            toast.error('Failed to load restaurant');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadMenu = useCallback(async () => {
        try {
            const res = await api.get(`/restaurants/${id}/menu/`);
            const payload = res.data as { categories?: MenuCategory[]; results?: MenuCategory[] } | MenuCategory[];
            const categories: MenuCategory[] = Array.isArray(payload) ? payload : payload.categories || payload.results || [];
            setMenu(categories);
            if (categories.length > 0) setActiveCategory(categories[0].id);
        } catch (e) {
            console.error('Failed to load menu:', e);
        }
    }, [id]);

    useEffect(() => {
        loadRestaurant();
        loadMenu();
    }, [id, loadMenu, loadRestaurant]);

    useEffect(() => {
        if (restaurant && mapRef.current && window.DG) {
            const container = mapRef.current;
            setTimeout(() => {
                if (dgMap.current) {
                    dgMap.current.remove();
                }

                try {
                    dgMap.current = window.DG.map(container, {
                        center: [restaurant.latitude || DEFAULT_COORDS.latitude, restaurant.longitude || DEFAULT_COORDS.longitude],
                        zoom: 15,
                        scrollWheelZoom: false
                    });

                    window.DG.marker([restaurant.latitude || DEFAULT_COORDS.latitude, restaurant.longitude || DEFAULT_COORDS.longitude])
                        .addTo(dgMap.current)
                        .bindPopup(restaurant.name);
                } catch (e) {
                    console.warn('Map initialization failed:', e);
                }
            }, 100);
        }

        return () => {
            if (dgMap.current) {
                dgMap.current.remove();
            }
        };
    }, [restaurant]);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-12 animate-pulse py-8 px-6">
                <div className="h-[450px] bg-slate-100 rounded-[3rem] w-full"></div>
                <div className="grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-6">
                        <div className="h-12 bg-slate-100 rounded-2xl w-3/4"></div>
                        <div className="h-4 bg-slate-100 rounded-xl w-1/2"></div>
                        <div className="h-32 bg-slate-100 rounded-[2rem]"></div>
                    </div>
                    <div className="h-64 bg-slate-100 rounded-[2.5rem]"></div>
                </div>
            </div>
        );
    }

    if (!restaurant) {
        return (
            <div className="text-center py-32">
                <div className="bg-slate-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Info className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">Restaurant not found</h1>
                <Link to="/discover" className="text-primary font-bold hover:underline">Browse other venues</Link>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto py-8 px-6 pb-24"
        >
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="relative h-[500px] w-full bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-300/50 group"
            >
                <img
                    src={restaurant.photo_url || restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2000'}
                    alt={restaurant.name}
                    className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                <div className="absolute top-10 right-10 flex gap-4">
                    <button className="bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white p-4 rounded-2xl transition-all border border-white/10 shadow-xl">
                        <Share2 className="w-5 h-5" />
                    </button>
                    <button className="bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white p-4 rounded-2xl transition-all border border-white/10 shadow-xl group/heart">
                        <Heart className="w-5 h-5 group-hover:fill-rose-500 group-hover:text-rose-500 transition-colors" />
                    </button>
                </div>

                <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.3, type: "spring" }}
                                className="bg-primary text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30"
                            >
                                {restaurant.price_level ? '₸'.repeat(restaurant.price_level) : '₸₸'}
                            </motion.div>
                            {restaurant.rating > 0 && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.4, type: "spring" }}
                                    className="bg-amber-400 text-slate-900 px-5 py-2 rounded-full text-[10px] font-black flex items-center gap-2 uppercase tracking-wider"
                                >
                                    <Star className="w-4 h-4 fill-current" /> {restaurant.rating.toFixed(1)}
                                </motion.div>
                            )}
                        </div>
                        <motion.h1
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-2xl"
                        >
                            {restaurant.name}
                        </motion.h1>
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap items-center gap-8 text-white/80 font-bold text-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                {restaurant.address}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-primary" />
                                </div>
                                {restaurant.opening_time?.substring(0, 5)} - {restaurant.closing_time?.substring(0, 5)}
                            </div>
                        </motion.div>
                    </div>

                    <Link
                        to={`/restaurant/${id}/book`}
                        className="bg-primary hover:bg-primary/90 text-white font-black py-6 px-14 rounded-[2rem] transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(0,71,255,0.3)] text-center uppercase tracking-widest text-xs flex items-center justify-center gap-3 group/btn"
                    >
                        Reserve a Table
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </Link>
                </div>
            </motion.div>

            <div className="grid lg:grid-cols-12 gap-16 mt-20">
                <div className="lg:col-span-8 space-y-20">
                    <motion.section
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-primary shadow-inner">
                                <Info className="w-6 h-6" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">About {restaurant.name}</h2>
                        </div>
                        <p className="text-slate-500 font-medium leading-relaxed text-xl max-w-4xl">
                            {restaurant.description || 'Welcome to our premium dining venue. We offer an exceptional atmosphere combined with the finest cuisine prepared by world-class chefs.'}
                        </p>
                    </motion.section>

                    {restaurant.tables && restaurant.tables.length > 0 && (
                        <motion.section
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="space-y-10"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-primary shadow-inner">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Our Floor Plan</h2>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    Real-time Availability
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-[3.5rem] p-12 border-2 border-slate-50 relative overflow-hidden aspect-[16/10] shadow-inner flex items-center justify-center group/floor">
                                <svg viewBox="0 0 1000 800" className="w-full h-full max-w-3xl drop-shadow-2xl">
                                    <defs>
                                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                            <feOffset dx="0" dy="4" result="offsetblur" />
                                            <feComponentTransfer><feFuncA type="linear" slope="0.1" /></feComponentTransfer>
                                            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                                        </filter>
                                    </defs>
                                    {restaurant.tables.map(table => (
                                        <g key={table.id} transform={`translate(${table.x}, ${table.y})`} filter="url(#shadow)">
                                            {table.table_type === 'circle' ? (
                                                <circle
                                                    r={table.width / 2}
                                                    cx={table.width / 2}
                                                    cy={table.height / 2}
                                                    className="fill-white stroke-2 stroke-slate-100 transition-all hover:stroke-primary"
                                                />
                                            ) : (
                                                <rect
                                                    width={table.width}
                                                    height={table.height}
                                                    rx={12}
                                                    className="fill-white stroke-2 stroke-slate-100 transition-all hover:stroke-primary"
                                                />
                                            )}
                                            <text x={table.width / 2} y={table.height / 2} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-black fill-slate-900">T{table.number}</text>
                                            <text x={table.width / 2} y={table.height / 2 + 12} textAnchor="middle" dominantBaseline="middle" className="text-[8px] font-bold fill-slate-400">{table.seats}p</text>
                                        </g>
                                    ))}
                                </svg>
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/floor:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                        </motion.section>
                    )}

                    {menu.length > 0 && (
                        <motion.section
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="space-y-10"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-primary shadow-inner">
                                    <UtensilsCrossed className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Our Menu</h2>
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {menu.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat.id
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {menu.filter(c => c.id === activeCategory).map(cat => (
                                <div key={cat.id} className="grid sm:grid-cols-2 gap-6">
                                    {cat.items.map(item => (
                                        <div
                                            key={item.id}
                                            className={`bg-white border border-slate-100 rounded-[2rem] overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all group ${!item.is_available ? 'opacity-50 grayscale' : ''
                                                }`}
                                        >
                                            {item.image_url && (
                                                <div className="h-48 overflow-hidden bg-slate-100">
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                </div>
                                            )}
                                            <div className="p-6 space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <h3 className="font-black text-slate-900 text-lg tracking-tight">{item.name}</h3>
                                                    <span className="text-primary font-black text-lg whitespace-nowrap">₸{Number(item.price).toLocaleString()}</span>
                                                </div>
                                                {item.description && (
                                                    <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2">{item.description}</p>
                                                )}
                                                {!item.is_available && (
                                                    <span className="inline-block text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">Unavailable</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </motion.section>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-10">
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white border-2 border-slate-50 rounded-[3rem] p-10 space-y-10 sticky top-28 shadow-2xl shadow-slate-200/50"
                    >
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Location & Hours</h3>

                        <div className="space-y-8">
                            <div className="flex items-start gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                                    <Phone className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact Number</p>
                                    <p className="font-bold text-slate-900 text-lg">{restaurant.phone || 'Not provided'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                                    <Clock className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Working Hours</p>
                                    <p className="font-bold text-slate-900 text-lg">{restaurant.opening_time?.substring(0, 5)} - {restaurant.closing_time?.substring(0, 5)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t-2 border-slate-50">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 shadow-inner">
                                    <TrendingUp className="w-5 h-5 text-amber-500" />
                                </div>
                                <h4 className="font-black text-slate-900 tracking-tight">Popular Times</h4>
                            </div>
                            <div className="h-24 flex items-end gap-1.5 px-2">
                                {[30, 45, 60, 90, 100, 85, 40, 20].map((height, i) => (
                                    <div key={i} className="flex-1 bg-slate-100 rounded-t-lg relative group overflow-hidden">
                                        <div
                                            className="absolute bottom-0 w-full bg-amber-400 opacity-20 group-hover:opacity-100 transition-opacity"
                                            style={{ height: `${height}%` }}
                                        />
                                        <div
                                            className="absolute bottom-0 w-full bg-amber-500 rounded-t-sm"
                                            style={{ height: '4px' }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                                <span>6 PM</span>
                                <span>11 PM</span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t-2 border-slate-50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Find us on map</p>
                            <div
                                ref={mapRef}
                                className="w-full h-64 rounded-[2rem] bg-slate-100 overflow-hidden border-2 border-slate-50 shadow-inner relative z-10"
                            >
                                {!window.DG && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                        Loading 2GIS Map...
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                onClick={() => setIsChatOpen(true)}
                                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-slate-800 shadow-xl shadow-slate-200 group/msg uppercase tracking-widest text-[10px]"
                            >
                                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Direct Message
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            <ClientChat
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
            />
        </motion.div>
    );
}
