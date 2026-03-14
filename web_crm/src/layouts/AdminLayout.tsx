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
    Moon,
    Sun,
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
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

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
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 260 : 0 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col z-40 overflow-hidden relative shadow-[4px_0_24px_-10px_rgba(0,0,0,0.05)] dark:shadow-none"
            >
                <div className="h-16 px-6 flex items-center gap-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-lg font-bold tracking-tight whitespace-nowrap"><Logo /></span>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group ${isActive(item.path)
                                ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white hover:scale-[1.02]'
                                }`}
                        >
                            <item.icon size={18} className={isActive(item.path) ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        <span>{isDarkMode ? t('common.lightMode') : t('common.darkMode')}</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    >
                        <LogOut size={18} />
                        <span>{t('auth.logout')}</span>
                    </button>
                </div>
            </motion.aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border-b border-slate-200/50 dark:border-slate-800/50 px-6 flex items-center justify-between z-30 transition-colors shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder={t('common.search')}
                                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 focus:border-primary/20 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/5 rounded-lg text-sm w-64 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                        </button>

                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left hidden sm:block">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">{user?.username}</p>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">{user?.role?.replace('_', ' ')}</p>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isUserMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg shadow-slate-900/5 dark:shadow-none p-1.5 z-50 overflow-hidden"
                                    >
                                        <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800 mb-1">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{t('restaurant.myRestaurant')}</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{(user as OwnedRestaurantUser | null)?.owned_restaurant?.name || t('restaurant.myRestaurant')}</p>
                                        </div>
                                        <Link to="/app/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                                            <Settings size={16} />
                                            <span>{t('nav.settings')}</span>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all mt-0.5"
                                        >
                                            <LogOut size={16} />
                                            <span>{t('auth.logout')}</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth no-scrollbar relative z-10 bg-slate-50 dark:bg-slate-950 transition-colors">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
