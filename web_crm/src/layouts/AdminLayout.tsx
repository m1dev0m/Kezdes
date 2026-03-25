import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { Logo } from '@/components/ui/Logo';
import {
    LayoutDashboard,
    CalendarDays,
    Grid3X3,
    Users,
    Settings,
    LogOut,
    Search,
    ChevronDown,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

type OwnedRestaurantUser = {
    owned_restaurant?: { name?: string | null } | null;
};

const NAV = [
    { path: '/app/dashboard',  label: 'Dashboard',     icon: LayoutDashboard, key: null },
    { path: '/app/bookings',   label: 'Reservations',  icon: CalendarDays,    key: 'r' },
    { path: '/app/tables',     label: 'Tables',        icon: Grid3X3,         key: 't' },
    { path: '/app/customers',  label: 'Guests',        icon: Users,           key: null },
    { path: '/app/settings',   label: 'Settings',      icon: Settings,        key: null },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close user menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.key === '/') {
                e.preventDefault();
                searchRef.current?.focus();
                return;
            }
            if (e.key === 'r') { navigate('/app/bookings'); return; }
            if (e.key === 't') { navigate('/app/tables'); return; }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [navigate]);

    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const restaurantName = (user as OwnedRestaurantUser | null)?.owned_restaurant?.name || 'My Restaurant';

    return (
        <div className="flex h-screen bg-[#F8F9FA] font-display text-slate-900 overflow-hidden">

            {/* ── Sidebar ── */}
            <aside className="w-[200px] shrink-0 bg-white border-r border-slate-200 flex flex-col">

                {/* Logo */}
                <div className="h-14 px-5 flex items-center border-b border-slate-200">
                    <Link to="/app/dashboard">
                        <Logo variant="admin" className="h-7" />
                    </Link>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    {NAV.map(item => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={item.key ? `Shortcut: ${item.key}` : undefined}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-semibold
                                    transition-colors duration-150 group
                                    ${active
                                        ? 'bg-[#1A3C34]/8 text-[#1A3C34]'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }
                                `}
                            >
                                <item.icon
                                    size={16}
                                    strokeWidth={active ? 2.2 : 1.8}
                                    className={active ? 'text-[#1A3C34]' : 'text-slate-400 group-hover:text-slate-600'}
                                />
                                <span className="flex-1 truncate">{item.label}</span>
                                {item.key && (
                                    <kbd className="hidden group-hover:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-400 border border-slate-200 leading-none">
                                        {item.key}
                                    </kbd>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sign out */}
                <div className="px-3 pb-4 border-t border-slate-100 pt-3">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-150"
                    >
                        <LogOut size={16} strokeWidth={1.8} />
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>

            {/* ── Main area ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Top bar */}
                <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">

                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-[#1A3C34] transition-colors" />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder='Search... ("/" to focus)'
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#1A3C34]/40 focus:bg-white rounded-md text-sm w-72 transition-colors outline-none placeholder:text-slate-400"
                        />
                    </div>

                    {/* User menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setUserMenuOpen(v => !v)}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors duration-150 border border-transparent"
                        >
                            <div className="w-7 h-7 rounded-md bg-[#1A3C34]/10 flex items-center justify-center text-[#1A3C34] text-[11px] font-bold uppercase">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left">
                                <p className="text-[12px] font-bold text-slate-900 leading-none">{user?.username}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">{restaurantName}</p>
                            </div>
                            <ChevronDown size={12} className={`text-slate-400 transition-transform duration-150 ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {userMenuOpen && (
                            <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-md shadow-md p-1 z-50">
                                <Link
                                    to="/app/settings"
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex items-center gap-2 px-3 py-2 rounded text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                    <Settings size={14} />
                                    Settings
                                </Link>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                    <LogOut size={14} />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
