import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/modules/auth/logic/AuthContext';

type PublicHeaderActive = 'pricing' | 'contact' | null;

export function PublicHeader({ active = null }: { active?: PublicHeaderActive }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const isGuest = user && ['organizer', 'customer'].includes(user.role);
    const isStaff = user && ['owner', 'restaurant_admin', 'restaurant_owner', 'restaurant_staff', 'manager', 'host', 'hostess', 'worker'].includes(user.role);

    const linkCls = (isActive: boolean) =>
        `text-xs font-black uppercase tracking-widest transition-all ${isActive ? 'text-brand-green' : 'text-slate-500 hover:text-brand-green'
        }`;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-cream/90 backdrop-blur-xl border-b border-brand-accent transition-all duration-300">
            <div className="w-full px-4 md:px-8 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-9 h-9 bg-brand-green rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-green/20 group-hover:scale-105 transition-transform">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path clipRule="evenodd" d="M24 8L40 24L24 40L8 24L24 8ZM21 32V16L13 24L21 32Z" fill="currentColor" fillRule="evenodd"></path>
                        </svg>
                    </div>
                    <span className="text-xl font-black tracking-tight"><Logo /></span>
                </Link>

                {user ? (
                    <div className="flex items-center gap-8">
                        <nav className="hidden md:flex items-center gap-8">
                            <Link to="/discover" className="text-[#334155] text-[15px] font-bold hover:text-brand-green transition-colors">Explore</Link>
                            {isGuest && (
                                <>
                                    <Link to="/guest/dashboard" className="text-[#334155] text-[15px] font-bold hover:text-brand-green transition-colors">My Bookings</Link>
                                    <Link to="/guest/favorites" className="text-[#334155] text-[15px] font-bold hover:text-brand-green transition-colors">Favorites</Link>
                                    <Link to="/guest/profile" className="text-[#334155] text-[15px] font-bold hover:text-brand-green transition-colors">Profile</Link>
                                </>
                            )}
                            {isStaff && (
                                <Link to="/app/dashboard" className="text-[#334155] text-[15px] font-bold hover:text-brand-green transition-colors">Dashboard</Link>
                            )}
                        </nav>

                        <div className="flex items-center gap-4">
                            <div
                                className="size-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-[#0f172a] font-bold text-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => navigate(isGuest ? '/guest/profile' : '/app/dashboard')}
                            >
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="hidden sm:block text-sm font-bold text-slate-500 hover:text-red-500 transition-all px-4 py-2 border border-brand-accent rounded-lg hover:bg-red-50"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-10">
                        <div className="hidden md:flex items-center gap-10">
                            <Link to="/#features" className={linkCls(false)}>Features</Link>
                            <Link to="/pricing" className={linkCls(active === 'pricing')}>Pricing</Link>
                            <Link to={active === 'contact' ? '/contact' : '/#crm'} className={linkCls(active === 'contact')}>Enterprise</Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link to="/login" className="hidden sm:block text-sm font-bold text-slate-700 hover:text-brand-green transition-all px-5 py-2.5 border border-brand-accent rounded-lg hover:bg-brand-accent/30">Login</Link>
                            <Link to="/register" className="bg-gold text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-gold/20 hover:bg-gold/90 active:scale-[0.98] transition-all">Sign Up</Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
