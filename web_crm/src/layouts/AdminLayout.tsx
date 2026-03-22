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
        <div className="flex h-screen bg-slate-50 font-display text-slate-900 overflow-hidden">
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 264 : 0 }}
                className="bg-white border-r border-slate-200 flex flex-col z-40 overflow-hidden relative"
            >
                <div className="h-14 px-4 flex items-center shrink-0 border-b border-slate-200">
                    <Link to="/app/dashboard" className="flex items-center gap-2">
                        <Logo variant="admin" className="h-7" />
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-colors duration-150 group ${isActive(item.path)
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            <item.icon size={16} className={isActive(item.path) ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-3 border-t border-slate-200 space-y-1">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-semibold text-slate-700 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                        <LogOut size={16} className="text-slate-400" />
                        <span>Sign out</span>
                    </button>
                </div>
            </motion.aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent rounded-md transition-colors"
                        >
                            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
                        </button>

                        <Link to="/app/dashboard" className="flex items-center">
                            <Logo variant="admin" className="h-6" />
                        </Link>

                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Universal search... (⌘K)"
                                className="pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-lg text-sm w-80 transition-colors outline-none text-slate-900 placeholder:text-slate-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="relative p-2 text-slate-500 hover:text-indigo-700 group rounded-md hover:bg-slate-100 transition-colors">
                            <Bell size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full ring-2 ring-white animate-pulse"></span>
                        </button>

                        <div className="h-4 w-px bg-slate-100"></div>

                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent"
                            >
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 text-[11px] font-bold uppercase shadow-sm">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left hidden lg:block pr-1">
                                    <p className="text-[11px] font-bold text-slate-900 leading-none">{user?.username}</p>
                                    <p className="text-[10px] font-semibold text-slate-500 mt-1 opacity-80">PRO MERCHANT</p>
                                </div>
                                <ChevronDown size={10} className={`text-slate-300 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isUserMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                        className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-50"
                                    >
                                        <div className="px-3 py-2.5 bg-slate-50 rounded-md mb-1.5 border border-slate-200">
                                            <p className="text-[10px] font-semibold text-slate-500 mb-1">{t('restaurant.myRestaurant')}</p>
                                            <p className="text-sm font-semibold text-slate-900 truncate">{(user as OwnedRestaurantUser | null)?.owned_restaurant?.name || 'Grand Bistro'}</p>
                                        </div>
                                        <Link to="/app/settings" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                            <Settings size={14} />
                                            <span>{t('nav.settings')}</span>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors mt-0.5"
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

                <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth custom-scrollbar relative z-10">
                    <div className="max-w-6xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
