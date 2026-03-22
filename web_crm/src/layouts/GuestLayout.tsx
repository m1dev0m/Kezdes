import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useState } from 'react';
import { Logo } from '@/components/ui/Logo';

export default function GuestLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const navItems = [
        { path: '/discover', label: 'Discover' },
        { path: '/guest/dashboard', label: 'My Bookings' },
        { path: '/guest/messages', label: 'Messages' },
        { path: '/guest/favorites', label: 'Favorites' },
        { path: '/guest/profile', label: 'Profile' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-brand-cream font-display">
            <header className="flex items-center justify-between border-b border-brand-accent bg-brand-cream/90 backdrop-blur-md px-6 md:px-20 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-10">
                    <Link to="/" className="flex items-center gap-3">
                        <h2 className="text-xl font-bold tracking-tight"><Logo /></h2>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map(item => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`text-sm font-semibold transition-colors ${isActive(item.path)
                                    ? 'text-brand-green border-b-2 border-brand-green pb-1'
                                    : 'text-slate-600 hover:text-brand-green'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden sm:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            onClick={() => navigate('/discover')}
                            readOnly
                            className="w-56 pl-10 pr-4 py-2 bg-white border border-brand-accent rounded-xl text-sm focus:ring-2 focus:ring-gold/30 placeholder:text-slate-400 cursor-pointer"
                            placeholder="Find a restaurant..."
                            type="text"
                        />
                    </div>

                    <button className="flex items-center justify-center size-10 rounded-full bg-white border border-brand-accent text-slate-600 hover:bg-brand-accent/30 hover:text-brand-green transition-all">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>

                    <div
                        className="h-10 w-10 rounded-full bg-brand-accent/30 border-2 border-gold/30 flex items-center justify-center text-brand-green font-bold text-sm cursor-pointer hover:bg-brand-accent/60 transition-all"
                        onClick={() => navigate('/guest/profile')}
                    >
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>

                    <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-slate-700 dark:text-white">
                        <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>
            </header>

            {menuOpen && (
                <div className="fixed inset-0 z-[90] bg-brand-cream pt-20 px-6 md:hidden">
                    <nav className="flex flex-col gap-8 mt-8">
                        {navItems.map(item => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMenuOpen(false)}
                                className={`text-2xl font-bold tracking-tight ${isActive(item.path) ? 'text-brand-green' : 'text-slate-900'}`}
                            >
                                {item.label}
                            </Link>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="text-2xl font-bold text-rose-600 tracking-tight pt-8 border-t border-brand-accent text-left"
                        >
                            Sign Out
                        </button>
                    </nav>
                </div>
            )}

            <main className="flex-1 px-6 md:px-20 py-10 max-w-7xl mx-auto w-full">
                <Outlet />
            </main>

            <footer className="border-t border-brand-accent py-8 px-6 md:px-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                        <span>© 2026</span>
                        <span className="inline-flex items-center"><Logo className="h-4" /></span>
                        <span>Restaurant Management. All rights reserved.</span>
                    </p>
                    <div className="flex gap-6">
                        <button className="text-slate-400 hover:text-brand-green text-sm transition-colors">Privacy Policy</button>
                        <button className="text-slate-400 hover:text-brand-green text-sm transition-colors">Terms of Service</button>
                        <button className="text-slate-400 hover:text-brand-green text-sm transition-colors">Help Center</button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
