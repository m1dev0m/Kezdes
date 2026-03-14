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
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">You must be a Global Admin to view this page.</p>
                    <button onClick={() => navigate('/login')} className="mt-4 text-primary hover:text-primary-dark">Return to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
            <div className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight"><Logo /> HQ</span>
                    </div>
                </div>

                <div className="flex-1 py-6 px-3 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors"
                    >
                        <LogOut className="w-5 h-5 text-slate-400" />
                        Log out
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center px-8 justify-between shrink-0">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Global Administration</h1>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {user.username?.[0]?.toUpperCase() || 'A'}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
