import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { Logo } from '@/components/ui/Logo';
import {
    LayoutDashboard,
    CalendarDays,
    Grid3X3,
    Users,
    MessageSquare,
    Settings,
    LogOut,
} from 'lucide-react';

type OwnedRestaurantUser = {
    owned_restaurant?: { name?: string | null } | null;
};

const NAV = [
    { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/app/bookings', label: 'Reservations', icon: CalendarDays },
    { path: '/app/tables', label: 'Tables', icon: Grid3X3 },
    { path: '/app/customers', label: 'Guests', icon: Users },
    { path: '/app/messages', label: 'Messages', icon: MessageSquare },
    { path: '/app/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const restaurantName = (user as OwnedRestaurantUser | null)?.owned_restaurant?.name || 'Мой Ресторан';

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className="flex xl:h-screen h-[100dvh] bg-white font-sans text-slate-900 overflow-hidden">

            {/* ── Fixed Left Sidebar ── */}
            <aside className="w-[240px] shrink-0 bg-[#F4F7F9] border-r border-[#E2E8F0] flex flex-col h-full z-20">

                {/* 1. Header & Logo */}
                <div className="h-[72px] px-6 flex items-center shrink-0">
                    <Link to="/app/dashboard" className="transition-opacity hover:opacity-80 active:opacity-60">
                        <Logo variant="admin" className="h-[22px]" />
                    </Link>
                </div>



                {/* 3. Main Navigation */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {NAV.map(item => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] 
                                    transition-all duration-150 active:scale-[0.98] group
                                    ${active
                                        ? 'bg-[#F1F5F9] font-bold text-[#0F172A]'
                                        : 'text-[#64748B] font-medium hover:bg-[#F8FAFC] hover:text-[#334155]'
                                    }
                                `}
                            >
                                <item.icon
                                    size={18}
                                    strokeWidth={active ? 2.5 : 2}
                                    className={`
                                        transition-colors duration-150
                                        ${active ? 'text-[#0F172A]' : 'text-[#94A3B8] group-hover:text-[#64748B]'}
                                    `}
                                />
                                <span className="flex-1 truncate">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* 4. User Profile & Settings/Logout */}
                <div className="p-5 border-t border-[#F1F5F9] shrink-0">
                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-[#E2E8F0] shadow-sm mb-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0F172A] text-xs font-bold uppercase shadow-sm shrink-0">
                                {getInitials(user?.username)}
                            </div>
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-[13px] font-bold text-[#0F172A] truncate leading-tight">
                                    {restaurantName}
                                </span>
                                <span className="text-[11px] font-medium text-[#64748B] truncate mt-0.5">
                                    {user?.username}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 text-[14px] font-semibold text-[#64748B] hover:text-[#0F172A] transition-all duration-150 active:scale-[0.98] group"
                    >
                        <LogOut size={16} strokeWidth={2.5} className="text-[#94A3B8] group-hover:text-[#64748B] transition-colors duration-150" />
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>

            {/* ── Main Content Area ── */}
            <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-white lg:rounded-tl-2xl border-l border-t border-[#E2E8F0] shadow-[inset_0_4px_24px_rgba(0,0,0,0.02)] relative z-10 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
                    <div className="max-w-[1200px] w-full mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>

        </div>
    );
}
