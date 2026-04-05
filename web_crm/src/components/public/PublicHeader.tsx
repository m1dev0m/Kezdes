import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { isRestaurantRole, normalizeUserRole } from '@/modules/auth/logic/roles';

export function PublicHeader({ active }: { active?: string }) {
  const { user } = useAuth();
  const normalizedRole = normalizeUserRole(user?.role);
  const isAdmin = isRestaurantRole(normalizedRole);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isRestaurantRoute =
    location.pathname.startsWith('/restaurants') ||
    location.pathname.startsWith('/restaurant/');
  const isPricingRoute = location.pathname.startsWith('/pricing');
  const isContactRoute = location.pathname.startsWith('/contact');
  const currentActive =
    active ??
    (location.pathname === '/' ? 'home' : isRestaurantRoute ? 'restaurants' : isPricingRoute ? 'pricing' : isContactRoute ? 'contact' : undefined);
  const bookingDate = searchParams.get('date');
  const bookingTime = searchParams.get('time');
  const bookingGuests = searchParams.get('guests');
  const hasBookingContext = Boolean(bookingDate || bookingTime || bookingGuests);
  const showBookingContext = hasBookingContext && isRestaurantRoute;
  const bookingContextHref = hasBookingContext
    ? `/restaurants?${new URLSearchParams({
        ...(bookingDate ? { date: bookingDate } : {}),
        ...(bookingTime ? { time: bookingTime } : {}),
        ...(bookingGuests ? { guests: bookingGuests } : {}),
      }).toString()}`
    : '/restaurants';
  const bookingContextSummary = [bookingDate || 'Сегодня', bookingTime || 'Время', bookingGuests ? `${bookingGuests} гостей` : 'Гости'].join(' · ');

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 sm:px-8">
        <Link to="/" aria-label="public-home" className="flex items-center gap-4 group transition-transform active:scale-95">
          <Logo className="h-8 sm:h-9" />
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          <Link
            to="/"
            className={`text-xs font-semibold uppercase tracking-widest transition-colors ${currentActive === 'home' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Главная
          </Link>
          <Link
            to="/restaurants"
            aria-label="public-restaurants"
            className={`text-xs font-semibold uppercase tracking-widest transition-colors ${currentActive === 'restaurants' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Рестораны
          </Link>
          <Link
            to="/pricing"
            aria-label="public-pricing"
            className={`text-xs font-semibold uppercase tracking-widest transition-colors ${currentActive === 'pricing' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Цены
          </Link>
          <Link
            to="/contact"
            aria-label="public-contact"
            className={`text-xs font-semibold uppercase tracking-widest transition-colors ${currentActive === 'contact' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Контакты
          </Link>
          {user && (
            <>
              {isAdmin ? (
                <Link
                  to="/app/bookings"
                  className="text-xs font-semibold uppercase tracking-widest text-[#1d4ed8] hover:text-blue-800 transition-colors"
                >
                  Бронирования
                </Link>
              ) : (
                <Link
                  to="/guest/dashboard"
                  className="text-xs font-semibold uppercase tracking-widest text-[#1d4ed8] hover:text-blue-800 transition-colors"
                >
                  Мои брони
                </Link>
              )}
              <Link
                to={isAdmin ? "/app/dashboard" : "/guest/profile"}
                className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
              >
                {isAdmin ? "Дашборд" : "Профиль"}
              </Link>
            </>
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
                <div className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-tight">{normalizedRole || user.role}</div>
              </div>
              <div className="size-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow-sm">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>
            </Link>
          )}
        </div>
      </div>

      {showBookingContext ? (
        <div className="border-t border-slate-200/80 bg-white/90">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-3 text-sm sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">Контекст поиска</span>
              <span className="hidden sm:inline text-slate-400">Сохраняется при переходах</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              <span>{bookingContextSummary}</span>
            </div>
            <Link
              to={bookingContextHref}
              aria-label="public-booking-context"
              className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
            >
              Изменить поиск
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
