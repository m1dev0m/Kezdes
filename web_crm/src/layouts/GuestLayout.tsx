import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { Logo } from '@/components/ui/Logo';

const NAV_ITEMS = [
  { path: '/restaurants', label: 'Поиск', icon: 'explore' },
  { path: '/guest/dashboard', label: 'Мои брони', icon: 'calendar_month' },
  { path: '/guest/messages', label: 'Сообщения', icon: 'chat_bubble' },
  { path: '/guest/favorites', label: 'Избранное', icon: 'favorite' },
  { path: '/guest/profile', label: 'Профиль', icon: 'person' },
];

export default function GuestLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0F0F23] font-inter text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-100/50">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0F0F23]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 sm:px-8">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2 group transition-transform active:scale-95">
              <Logo className="h-8 sm:h-9" />
            </Link>

            <nav className="hidden lg:flex items-center gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${isActive(item.path)
                    ? 'bg-blue-50 text-[#1d4ed8]'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive(item.path) ? 'fill-1' : ''}`}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <button
                type="button"
                onClick={() => navigate('/guest/messages')}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/restaurants')}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">search</span>
              </button>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="flex flex-col text-right hidden md:block">
                <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user?.username || 'Guest'}</span>
                <button onClick={handleLogout} className="text-[10px] font-semibold text-[#1d4ed8] hover:underline mt-0.5">Выйти</button>
              </div>
              <div className="size-10 rounded-xl overflow-hidden border-2 border-blue-100 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                {(user as any)?.avatar ? (
                  <img src={(user as any).avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-[#1d4ed8]">{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full transition-all duration-300">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F0F23] py-12 px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Logo className="h-7" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">© 2026 Almaty, Kazakhstan • Premium Dining Ecosystem</p>
          <div className="flex items-center gap-6">
            <Link to="/pricing" className="text-xs font-semibold text-slate-400 hover:text-[#1d4ed8] transition-colors">Тарифы</Link>
            <Link to="/contact" className="text-xs font-semibold text-slate-400 hover:text-[#1d4ed8] transition-colors">Контакты</Link>
            <Link to="/restaurants" className="text-xs font-semibold text-slate-400 hover:text-[#1d4ed8] transition-colors">Рестораны</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
