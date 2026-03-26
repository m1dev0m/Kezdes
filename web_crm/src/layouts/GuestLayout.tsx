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
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50 font-sans text-slate-900 transition-colors duration-200">
            {/* GLOBAL GUEST HEADER - MATCHING SNAPSHOT */}
            <header className="flex items-center justify-between whitespace-nowrap bg-white px-4 md:px-8 py-4 shadow-sm sticky top-0 z-50">
                <Link to="/" className="flex items-center">
                    <Logo className="h-6" />
                </Link>
                <div className="flex items-center gap-8">
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/search" className="text-[#334155] text-[15px] font-bold hover:text-primary transition-colors">Explore</Link>
                        <Link to="/guest/dashboard" className="text-[#334155] text-[15px] font-bold hover:text-primary transition-colors">My Bookings</Link>
                        <Link to="/guest/profile" className="text-[#334155] text-[15px] font-bold hover:text-primary transition-colors">Profile</Link>
                    </nav>
                    <div
                        className="size-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-[#0f172a] font-bold text-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => navigate('/guest/profile')}
                    >
                        {user?.username?.charAt(0).toUpperCase() || 'M'}
                    </div>

                    <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-slate-700">
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

            <main className="flex-1 w-full flex justify-center py-10">
                <div className="flex flex-col w-full max-w-[1024px] px-4 md:px-8">
                    <Outlet />
                </div>
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
