import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Monitor, FileText, Store, Activity, LogOut } from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: Monitor },
    { name: 'Requests', href: '/admin/requests', icon: FileText },
    { name: 'Restaurants', href: '/admin/restaurants', icon: Store },
    { name: 'System Logs', href: '/admin/logs', icon: Activity },
];

export default function GlobalAdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user || user.profile?.role !== 'global_admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
                    <p className="mt-2 text-slate-500">You must be a Global Admin to view this page.</p>
                    <button onClick={() => navigate('/login')} className="mt-4 text-indigo-600 hover:text-indigo-700 font-bold uppercase tracking-widest text-[10px]">Return to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <div className="w-64 bg-white flex flex-col border-r border-slate-100 shadow-sm relative z-10">
                <div className="h-16 flex items-center px-6 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight italic"><Logo /> HQ</span>
                    </div>
                </div>

                <div className="flex-1 py-6 px-3 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                                    }`}
                            >
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-50">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-rose-50 hover:text-rose-600 w-full transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Log out
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-50 h-16 flex items-center px-8 justify-between shrink-0">
                    <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 italic">Global Administration</h1>
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-900 border border-slate-100 shadow-sm italic">
                            {user.username?.[0]?.toUpperCase() || 'A'}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    <div className="max-w-6xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
