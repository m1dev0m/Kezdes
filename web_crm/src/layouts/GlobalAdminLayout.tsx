import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { motion } from 'framer-motion';
import {
    Terminal,
    FileSearch,
    Server,
    ShieldCheck,
    Power,
    Lock,
    Cpu
} from 'lucide-react';

const navigation = [
    { name: 'Терминал', href: '/admin/dashboard', icon: Terminal },
    { name: 'Запросы', href: '/admin/requests', icon: FileSearch },
    { name: 'Узлы', href: '/admin/restaurants', icon: Server },
    { name: 'Протоколы', href: '/admin/logs', icon: ShieldCheck },
];

export default function GlobalAdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user || user.profile?.role !== 'global_admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white font-inter">
                <div className="text-center space-y-6">
                    <div className="size-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <Lock size={40} className="text-rose-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Доступ ограничен</h1>
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Требуется глобальный уровень доступа.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="h-14 px-10 bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-black/10 active:scale-95 transition-all hover:bg-slate-950"
                    >
                        Авторизация
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafaf9] flex font-inter selection:bg-[#1d4ed8]/10 text-slate-900">
            {/* Enterprise Sidebar */}
            <aside className="w-80 bg-white flex flex-col border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative z-[50]">
                <div className="h-24 flex items-center px-10 border-b border-slate-100">
                    <Link to="/admin/dashboard" className="flex items-center gap-4 group">
                        <div className="size-11 rounded-xl bg-[#1d4ed8] text-white flex items-center justify-center shadow-lg shadow-[#1d4ed8]/20 group-hover:scale-110 transition-transform">
                            <Cpu size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <Logo variant="admin" className="h-7" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">Global Admin</p>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 py-10 px-6 space-y-2 overflow-y-auto custom-scrollbar">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-6 px-4">Иерархия команд</p>
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`group flex items-center gap-4 px-5 h-16 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative overflow-hidden ${isActive
                                    ? 'bg-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/10'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
                                {item.name}
                                {isActive && (
                                    <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-8 border-t border-slate-100 space-y-4 bg-slate-50/50">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
                        <div className="size-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-[11px] font-bold text-slate-900">
                            {user.username?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight truncate">{user.username}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Session</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-4 px-5 h-14 rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 hover:bg-rose-50 hover:text-rose-600 w-full transition-all"
                    >
                        <Power size={18} />
                        Завершить сеанс
                    </button>
                </div>
            </aside>

            {/* Main Command Terminal */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-20 flex items-center px-12 justify-between shrink-0 relative z-40">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-[#1d4ed8]/5 flex items-center justify-center text-[#1d4ed8]">
                            <Terminal size={20} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-sm font-bold uppercase tracking-widest text-slate-900">Панель администратора</h1>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-12 py-12 relative z-10 custom-scrollbar">
                    <div className="max-w-[1440px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
