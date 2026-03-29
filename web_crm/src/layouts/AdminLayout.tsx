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
  { path: '/app/dashboard', label: 'Панель', icon: LayoutDashboard },
  { path: '/app/bookings', label: 'Бронирования', icon: CalendarDays },
  { path: '/app/tables', label: 'Столы', icon: Grid3X3 },
  { path: '/app/customers', label: 'Гости', icon: Users },
  { path: '/app/messages', label: 'Сообщения', icon: MessageSquare },
  { path: '/app/settings', label: 'Настройки', icon: Settings },
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

  const restaurantName = (user as OwnedRestaurantUser | null)?.owned_restaurant?.name || 'Мой ресторан';

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex h-[100dvh] bg-[#f3f6fa] font-inter text-slate-900 overflow-hidden">
      <aside className="w-[244px] shrink-0 border-r border-slate-200 bg-[#f8fafc] flex flex-col h-full">
        <div className="h-[72px] px-8 flex items-center border-b border-slate-200">
          <Link to="/app/dashboard" className="transition-transform active:scale-95">
            <Logo variant="admin" className="h-7" />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 font-medium hover:bg-white hover:text-slate-900'
                  }`}
              >
                <item.icon
                  size={18}
                  strokeWidth={active ? 2.4 : 2}
                  className={active ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-600'}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 uppercase">
                {getInitials(user?.username)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{restaurantName}</div>
                <div className="truncate text-xs text-slate-500">{user?.username || 'manager'}</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 inline-flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={16} className="text-slate-400" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <header className="h-[72px] shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 lg:px-10 flex items-center justify-between z-40">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <LayoutDashboard size={18} />
            </div>
            <span className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Панель управления</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <CalendarDays size={20} />
            </button>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-none">{user?.username}</div>
                <div className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-tight">Администратор</div>
              </div>
              <div className="size-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow-sm">
                {getInitials(user?.username)}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar lg:px-10">
          <div className="mx-auto w-full max-w-[1240px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
