import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/modules/auth/logic/AuthContext';

export function PublicHeader({ active }: { active?: string }) {
  const { user } = useAuth();
  const isAdmin = user && ['owner', 'restaurant_admin', 'restaurant_owner'].includes(user.role);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 sm:px-8">
        <Link to="/" aria-label="public-home" className="flex items-center gap-4 group transition-transform active:scale-95">
          <Logo className="h-8 sm:h-9" />
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          <Link
            to="/"
            className={`text-xs font-semibold uppercase tracking-widest transition-colors ${active === 'home' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Главная
          </Link>
          <Link
            to="/restaurants"
            aria-label="public-restaurants"
            className={`text-xs font-semibold uppercase tracking-widest transition-colors ${active === 'restaurants' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Рестораны
          </Link>
          {user && (
            <Link
              to={isAdmin ? "/app/dashboard" : "/guest/dashboard"}
              className="text-xs font-semibold uppercase tracking-widest text-[#1d4ed8] hover:text-blue-800 transition-colors"
            >
              Личный кабинет
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link
                to="/login"
                aria-label="public-login"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
              >
                Войти
              </Link>
              <Link
                to="/register"
                aria-label="public-register"
                className="hidden sm:inline-flex rounded-2xl bg-[#1d4ed8] px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
              >
                Регистрация
              </Link>
            </>
          ) : (
            <Link
              to={isAdmin ? "/app/dashboard" : "/guest/profile"}
              className="flex items-center gap-3 pl-2 transition hover:opacity-80"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-none">{user.username}</div>
                <div className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-tight">{user.role}</div>
              </div>
              <div className="size-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow-sm">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
