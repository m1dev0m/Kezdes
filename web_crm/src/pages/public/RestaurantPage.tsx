import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Phone, Star, ArrowRight, Share2, Heart } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import ClientChat from '@/components/ClientChat';
import { DEFAULT_COORDS } from '@/constants';
import { Logo } from '@/components/ui/Logo';

declare global {
    interface Window {
        DG: any;
    }
}

interface PublicTable { id: number; number: string; seats: number; is_active: boolean; x: number; y: number; width: number; height: number; table_type: string; }
interface MenuItem { id: number; name: string; description: string; price: string; image_url: string; is_available: boolean; }
interface MenuCategory { id: number; name: string; items: MenuItem[]; }
interface PublicRestaurant { id: number; name: string; description: string; address: string; phone: string; image_url: string; photo_url: string; opening_time: string; closing_time: string; capacity: number; rating: number; price_level: number; latitude: number; longitude: number; tables: PublicTable[]; }


export default function RestaurantPage() {
    const { id } = useParams();
    const [restaurant, setRestaurant] = useState<PublicRestaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const dgMap = useRef<any>(null);

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
            const payload = res.data;
            const categories = Array.isArray(payload) ? payload : (payload.categories || payload.results || []);
            setMenu(categories);
            if (categories.length > 0) setActiveCategory(categories[0].id);
        } catch { }
    }, [id]);

    useEffect(() => { loadRestaurant(); loadMenu(); }, [id, loadMenu, loadRestaurant]);

    useEffect(() => {
        if (restaurant && mapRef.current && window.DG) {
            setTimeout(() => {
                if (dgMap.current) dgMap.current.remove();
                try {
                    dgMap.current = window.DG.map(mapRef.current, {
                        center: [restaurant.latitude || DEFAULT_COORDS.latitude, restaurant.longitude || DEFAULT_COORDS.longitude],
                        zoom: 15,
                        scrollWheelZoom: false
                    });
                    window.DG.marker([restaurant.latitude || DEFAULT_COORDS.latitude, restaurant.longitude || DEFAULT_COORDS.longitude])
                        .addTo(dgMap.current)
                        .bindPopup(restaurant.name);
                } catch { }
            }, 100);
        }
        return () => { if (dgMap.current) dgMap.current.remove(); };
    }, [restaurant]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto py-12 px-6 animate-pulse">
                <div className="h-[500px] bg-zinc-100 mb-12"></div>
                <div className="h-10 w-1/3 bg-zinc-100 mb-4"></div>
                <div className="h-32 bg-zinc-100"></div>
            </div>
        );
    }

    if (!restaurant) return (<div className="text-center py-32 font-serif text-2xl text-zinc-900 bg-[#FDFBF7] min-h-screen">Ресторан не найден.</div>);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#FDFBF7] min-h-screen pb-24 font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white">
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-zinc-200">
                <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
                    <Link to="/search" className="flex items-center gap-3 text-xs font-medium tracking-[0.2em] uppercase text-zinc-400 hover:text-zinc-900 transition-colors">
                        <ArrowRight className="w-4 h-4 rotate-180" /> НАЗАД
                    </Link>
                    <Link to="/" className="flex items-center"><Logo className="h-7" /></Link>
                    <div className="flex gap-4">
                        <button className="text-zinc-400 hover:text-zinc-900 transition-colors"><Share2 className="w-4 h-4" /></button>
                        <button className="text-zinc-400 hover:text-zinc-900 transition-colors"><Heart className="w-4 h-4" /></button>
                    </div>
                </div>
            </header>

            <div className="pt-24 max-w-7xl mx-auto px-6 lg:px-10">
                <div className="w-full h-[60vh] bg-zinc-100 relative mb-16 overflow-hidden">
                    <img src={restaurant.photo_url || restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2000'} alt={restaurant.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/30 to-transparent"></div>
                    <div className="absolute bottom-10 left-10 text-white">
                        <div className="flex items-center gap-4 mb-4 font-light text-xs tracking-[0.2em] uppercase">
                            <span>{restaurant.price_level ? '₸'.repeat(restaurant.price_level) : '₸₸'}</span>
                            {restaurant.rating > 0 && (
                                <span className="flex items-center gap-1 text-gold"><Star className="w-3 h-3 fill-gold" /> {restaurant.rating.toFixed(1)}</span>
                            )}
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-serif text-white tracking-tight">{restaurant.name}</h1>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-16">
                    <div className="lg:col-span-8 space-y-16">
                        <section>
                            <h2 className="text-3xl font-serif mb-6 text-zinc-900">О ресторане</h2>
                            <p className="text-zinc-500 font-light leading-relaxed text-lg">{restaurant.description || 'Изысканная атмосфера и превосходная кухня, созданная нашими шеф-поварами. Идеальное место для незабываемых вечеров и важных встреч.'}</p>
                        </section>

                        <hr className="border-zinc-200" />

                        {menu.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-3xl font-serif text-zinc-900">Меню</h2>
                                </div>
                                <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar border-b border-zinc-200 mb-8">
                                    {menu.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`text-[10px] font-medium uppercase tracking-[0.2em] pb-3 border-b-2 whitespace-nowrap transition-colors ${activeCategory === cat.id ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>

                                {menu.filter(c => c.id === activeCategory).map(cat => (
                                    <div key={cat.id} className="grid sm:grid-cols-2 gap-y-10 gap-x-8">
                                        {cat.items.map(item => (
                                            <div key={item.id} className="group">
                                                {item.image_url && (
                                                    <div className="h-56 bg-zinc-100 overflow-hidden mb-4">
                                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-start gap-4 mb-2">
                                                    <h3 className="font-serif text-xl text-zinc-900">{item.name}</h3>
                                                    <span className="text-zinc-500 font-light text-lg">₸{Number(item.price).toLocaleString()}</span>
                                                </div>
                                                {item.description && <p className="text-zinc-400 font-light text-sm line-clamp-2">{item.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </section>
                        )}

                        {restaurant.tables && restaurant.tables.length > 0 && (
                            <>
                                <hr className="border-zinc-200" />
                                <section>
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="text-3xl font-serif text-zinc-900">План зала</h2>
                                        <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-900 animate-pulse"></div> Live</span>
                                    </div>
                                    <div className="bg-white border border-zinc-200 p-8 aspect-[16/10] relative flex justify-center items-center">
                                        <svg viewBox="0 0 1000 800" className="w-full h-full">
                                            {restaurant.tables.map(table => (
                                                <g key={table.id} transform={`translate(${table.x}, ${table.y})`} className="group cursor-pointer">
                                                    {table.table_type === 'circle' ? (
                                                        <circle r={table.width / 2} cx={table.width / 2} cy={table.height / 2} className="fill-white stroke-zinc-300 stroke-[1.5] group-hover:stroke-zinc-900 group-hover:fill-zinc-50 transition-all" />
                                                    ) : (
                                                        <rect width={table.width} height={table.height} rx={0} className="fill-white stroke-zinc-300 stroke-[1.5] group-hover:stroke-zinc-900 group-hover:fill-zinc-50 transition-all" />
                                                    )}
                                                    <text x={table.width / 2} y={table.height / 2} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-medium fill-zinc-900">T{table.number}</text>
                                                    <text x={table.width / 2} y={table.height / 2 + 12} textAnchor="middle" dominantBaseline="middle" className="text-[8px] font-light fill-zinc-400">{table.seats}p</text>
                                                </g>
                                            ))}
                                        </svg>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>

                    <div className="lg:col-span-4">
                        <div className="sticky top-32 bg-white border border-zinc-200 p-10 space-y-8">
                            <div>
                                <h3 className="text-xl font-serif text-zinc-900 mb-6 border-b border-zinc-200 pb-4">Информация</h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                                        <div>
                                            <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-zinc-400 mb-1">Адрес</p>
                                            <p className="text-zinc-900 text-sm font-light">{restaurant.address}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Phone className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                                        <div>
                                            <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-zinc-400 mb-1">Телефон</p>
                                            <p className="text-zinc-900 text-sm font-light">{restaurant.phone || 'Не указан'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Clock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                                        <div>
                                            <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-zinc-400 mb-1">Режим работы</p>
                                            <p className="text-zinc-900 text-sm font-light">{restaurant.opening_time?.substring(0, 5)} - {restaurant.closing_time?.substring(0, 5)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-zinc-200">
                                <div ref={mapRef} className="w-full h-48 bg-zinc-100 grayscale mb-6"></div>
                                <Link to={`/restaurant/${id}/book`} className="block w-full bg-zinc-900 text-white text-center py-5 text-[10px] font-medium tracking-[0.25em] uppercase hover:bg-zinc-800 transition-colors">
                                    Забронировать
                                </Link>
                                <button onClick={() => setIsChatOpen(true)} className="mt-3 block w-full bg-transparent border border-zinc-200 text-zinc-900 text-center py-5 text-[10px] font-medium tracking-[0.25em] uppercase hover:bg-zinc-50 transition-colors">
                                    Связаться с нами
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ClientChat restaurantId={restaurant.id} restaurantName={restaurant.name} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </motion.div>
    );
}
