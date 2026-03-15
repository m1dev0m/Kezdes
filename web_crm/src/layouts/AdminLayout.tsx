import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useI18n } from '@/i18n/index.tsx';
import { Logo } from '@/components/ui/Logo';
import {
    LayoutDashboard,
    CalendarDays,
    CalendarRange,
    Users,
    Grid3X3,
    Briefcase,
    BarChart3,
    FileText,
    Settings,
    LogOut,
    Bell,
    Search,
    ChevronDown,
    Menu,
    X,
    UtensilsCrossed,
    ShoppingBag,
    MessageSquare,
    Zap,
    Star
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type OwnedRestaurantUser = {
    owned_restaurant?: { name?: string | null } | null;
};

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const { t } = useI18n();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);

    useEffect(() => {
        document.documentElement.classList.remove('dark');
    }, []);

    const menuItems = [
        { path: '/app/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { path: '/app/bookings', label: t('nav.bookings'), icon: CalendarDays },
        { path: '/app/calendar', label: t('nav.calendar'), icon: CalendarRange },
        { path: '/app/messages', label: t('nav.messages'), icon: MessageSquare },
        { path: '/app/customers', label: t('nav.customers'), icon: Users },
        { path: '/app/tables', label: t('nav.tables'), icon: Grid3X3 },
        { path: '/app/menu', label: t('nav.menu'), icon: UtensilsCrossed },
        { path: '/app/orders', label: t('nav.orders'), icon: ShoppingBag },
        { path: '/app/staff', label: t('nav.staff'), icon: Briefcase },
        { path: '/app/automations', label: t('nav.automations', { defaultValue: 'Автоматизация' }), icon: Zap },
        { path: '/app/reviews', label: t('nav.reviews', { defaultValue: 'Отзывы' }), icon: Star },
        { path: '/app/analytics', label: t('nav.analytics'), icon: BarChart3 },
        { path: '/app/reports', label: t('nav.reports'), icon: FileText },
        { path: '/app/settings', label: t('nav.settings'), icon: Settings },
    ];

    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-[#fcfcfd] dark:bg-slate-50 font-sans text-slate-900 overflow-hidden">
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 220 : 0 }}
                className="bg-white border-r border-slate-100 flex flex-col z-40 overflow-hidden relative shadow-[1px_0_0_0_rgba(0,0,0,0.02)]"
            >
                <div className="h-16 px-5 flex items-center shrink-0 border-b border-slate-50 dark:border-slate-900/50">
                    <Link to="/app/dashboard" className="flex items-center gap-2 group">
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm transition-transform group-hover:scale-105 group-hover:rotate-2">
                            <Logo className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-black tracking-widest uppercase text-indigo-600">KEZDES</span>
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-200 group relative ${isActive(item.path)
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <item.icon size={14} className={isActive(item.path) ? '' : 'opacity-70 group-hover:opacity-100'} />
                            <span className="truncate">{item.label}</span>
                            {isActive(item.path) && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute right-2 w-1 h-3 bg-white/40 rounded-full"
                                />
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="p-3 border-t border-slate-50 space-y-1">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-rose-500/80 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-80 hover:opacity-100"
                    >
                        <LogOut size={14} />
                        <span>Sign out</span>
                    </button>
                </div>
            </motion.aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 flex items-center justify-between z-30 transition-colors">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all"
                        >
                            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
                        </button>

                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-3 h-3 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Universal search... (⌘K)"
                                className="pl-9 pr-4 py-1.5 bg-slate-50/50 border border-slate-100 focus:border-indigo-600 focus:bg-white rounded-lg text-[10px] font-bold uppercase tracking-wider w-72 transition-all outline-none text-slate-900 placeholder:text-slate-400/80"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-slate-400 hover:text-indigo-600 group">
                            <Bell size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-600 rounded-full ring-2 ring-white animate-pulse"></span>
                        </button>

                        <div className="h-4 w-px bg-slate-100"></div>

                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                            >
                                <div className="w-7 h-7 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 text-[10px] font-black uppercase shadow-sm">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left hidden lg:block pr-1">
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">{user?.username}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1 opacity-60 italic">PRO MERCHANT</p>
                                </div>
                                <ChevronDown size={10} className={`text-slate-300 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isUserMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                        className="absolute right-0 mt-3 w-56 bg-white border border-slate-100 rounded-xl shadow-2xl shadow-indigo-600/5 p-1.5 z-50 ring-1 ring-slate-100"
                                    >
                                        <div className="px-3 py-2.5 bg-slate-50 rounded-lg mb-1.5 border border-slate-100/50">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-50">{t('restaurant.myRestaurant')}</p>
                                            <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{(user as OwnedRestaurantUser | null)?.owned_restaurant?.name || 'Grand Bistro'}</p>
                                        </div>
                                        <Link to="/app/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all uppercase tracking-widest">
                                            <Settings size={14} />
                                            <span>{t('nav.settings')}</span>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black text-rose-500/80 hover:text-rose-600 hover:bg-rose-50 transition-all mt-0.5 uppercase tracking-widest"
                                        >
                                            <LogOut size={14} />
                                            <span>Sign Out</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth no-scrollbar relative z-10">
                    <div className="max-w-6xl mx-auto">
                        <Outlet />
                    </div>
                </main>

                {/* Background Decoration */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.015] -z-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #6366f1 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            </div>
        </div>
    );
}
