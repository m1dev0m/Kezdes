import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useRestaurantSubscriptionSummary } from '@/features/subscription/useRestaurantSubscriptionSummary';
import { Logo } from '@/components/ui/Logo';
import {
  LayoutDashboard,
  CalendarDays,
  LayoutGrid,
  Table2,
  Users,
  UserCog,
  BarChart3,
  MessageSquare,
  ShoppingBag,
  Mail,
  Settings,
  LogOut,
  Plus,
  ListOrdered,
  CreditCard,
} from 'lucide-react';

type OwnedRestaurantUser = {
  owned_restaurant?: { name?: string | null } | null;
};

type NavIcon = typeof LayoutDashboard;

type NavItem = {
  path: string;
  label: string;
  icon: NavIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type HeaderMeta = {
  match: string;
  title: string;
  description: string;
  icon: NavIcon;
};

const NAV: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { path: '/app/dashboard', label: 'Панель', icon: LayoutDashboard },
      { path: '/app/bookings', label: 'Бронирования', icon: CalendarDays },
      { path: '/app/floor', label: 'Схема зала', icon: LayoutGrid },
      { path: '/app/tables', label: 'Столы', icon: Table2 },
      { path: '/app/waitlist', label: 'Лист ожидания', icon: ListOrdered },
      { path: '/app/calendar', label: 'Календарь', icon: CalendarDays },
      { path: '/app/messages', label: 'Сообщения', icon: MessageSquare },
      { path: '/app/orders', label: 'Заказы', icon: ShoppingBag },
      { path: '/app/customers', label: 'Гости', icon: Users },
    ],
  },
  {
    title: 'Management',
    items: [
      { path: '/app/staff', label: 'Команда', icon: UserCog },
      { path: '/app/analytics', label: 'Аналитика', icon: BarChart3 },
      { path: '/app/billing', label: 'Подписка', icon: CreditCard },
      { path: '/app/notifications', label: 'Шаблоны', icon: Mail },
      { path: '/app/settings', label: 'Настройки', icon: Settings },
    ],
  },
] as const;

const HEADER_META: HeaderMeta[] = [
  { match: '/app/bookings', title: 'Бронирования', description: 'Живая очередь подтверждений, посадки и завершения визита', icon: CalendarDays },
  { match: '/app/floor', title: 'Схема зала', description: 'Операционный центр для столов, посадки и статусов в реальном времени', icon: LayoutGrid },
  { match: '/app/tables', title: 'Столы', description: 'Создание, редактирование и управление столами ресторана', icon: Table2 },
  { match: '/app/waitlist', title: 'Лист ожидания', description: 'Лист ожидания, обратные звонки и перевод в бронь', icon: ListOrdered },
  { match: '/app/calendar', title: 'Календарь', description: 'Тот же инвентарь броней, но в формате таймлайна по дням', icon: CalendarDays },
  { match: '/app/messages', title: 'Сообщения', description: 'Диалоги с гостями, связанные с бронями и сервисом', icon: MessageSquare },
  { match: '/app/orders', title: 'Заказы', description: 'Предзаказы и подтверждённые чеки, привязанные к сервису ресторана', icon: ShoppingBag },
  { match: '/app/customers', title: 'Гости', description: 'CRM-контекст, история визитов и повторные гости', icon: Users },
  { match: '/app/staff', title: 'Команда', description: 'Роли, доступы и операционная укомплектованность', icon: UserCog },
  { match: '/app/analytics', title: 'Аналитика', description: 'Ключевые метрики для ежедневной работы ресторана', icon: BarChart3 },
  { match: '/app/billing', title: 'Подписка', description: 'Тариф, лимиты, счета и состояние оплаты ресторана', icon: CreditCard },
  { match: '/app/notifications', title: 'Шаблоны', description: 'Системные шаблоны и последние уведомления', icon: Mail },
  { match: '/app/settings', title: 'Настройки', description: 'Профиль ресторана, часы работы и правила бронирований', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { summary } = useRestaurantSubscriptionSummary();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const restaurantName = (user as OwnedRestaurantUser | null)?.owned_restaurant?.name || 'Мой ресторан';
  const activeNavLabel = NAV.flatMap((section) => section.items).find((item) => isActive(item.path))?.label || 'Панель';
  const headerMeta = HEADER_META.find((item) => isActive(item.match)) ?? {
    title: 'Панель',
    description: 'Брони, зал и работа с гостями в одном рабочем месте',
    icon: LayoutDashboard,
  };
  const HeaderIcon = headerMeta.icon;
  const subscriptionTone =
    summary?.subscription_state === 'none'
      ? 'border-slate-200 bg-slate-100 text-slate-700'
      : summary?.subscription_state === 'grace'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : summary?.is_subscription_live
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-rose-200 bg-rose-50 text-rose-700';

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };
  const mobileNavItems = [
    { path: '/app/dashboard', label: 'Панель', icon: LayoutDashboard },
    { path: '/app/bookings', label: 'Брони', icon: CalendarDays },
    { path: '/app/floor', label: 'Зал', icon: LayoutGrid },
    { path: '/app/waitlist', label: 'Очередь', icon: ListOrdered },
    { path: '/app/messages', label: 'Чат', icon: MessageSquare },
  ];

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f3f6fa] font-inter text-slate-900 overflow-hidden lg:flex-row">
      <aside className="hidden h-full w-[244px] shrink-0 flex-col border-r border-slate-200 bg-[#f8fafc] lg:flex">
        <div className="h-[72px] px-8 flex items-center border-b border-slate-200">
          <Link to="/app/dashboard" className="transition-transform active:scale-95">
            <Logo variant="admin" className="h-7" />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto custom-scrollbar">
          {NAV.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
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
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 uppercase">
                {getInitials(user?.username)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{restaurantName}</div>
                <div className="truncate text-xs text-slate-500">{user?.username || 'manager'}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${subscriptionTone}`}>
                {summary?.plan_label || 'Без подписки'}
              </span>
            </div>
            {summary ? (
              <button
                type="button"
                onClick={() => navigate('/app/billing')}
                className="mt-3 inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-white"
              >
                <span className="font-semibold uppercase tracking-[0.16em]">{summary.payment_status_label}</span>
                <span className="text-slate-400">
                  {summary.subscription_state === 'grace' ? 'Требует внимания' : 'Открыть'}
                </span>
              </button>
            ) : null}
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
        <header className="shrink-0 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:h-[72px] lg:px-10 lg:py-0 flex flex-col gap-3 justify-center z-40">
          <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <HeaderIcon size={18} />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold uppercase tracking-widest text-slate-900">{headerMeta.title}</span>
              <p className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 sm:block">
                {headerMeta.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {summary ? (
              <button
                type="button"
                onClick={() => navigate('/app/billing')}
                className={`hidden rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] lg:inline-flex ${subscriptionTone}`}
              >
                {summary.plan_label} · {summary.payment_status_label}
              </button>
            ) : null}
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Current view</span>
              <span className="text-sm font-semibold text-slate-900">{activeNavLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/bookings/new')}
              aria-label="admin-header-new-booking"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1d4ed8] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#1e40af] sm:px-4 sm:text-xs"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Новая бронь</span>
              <span className="sm:hidden">Новая</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/calendar')}
              aria-label="admin-header-open-calendar"
              className="p-2 text-slate-400 transition-colors hover:text-slate-900"
            >
              <CalendarDays size={20} />
            </button>
            <div className="mx-1 hidden h-4 w-[1px] bg-slate-200 sm:block" />
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
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar lg:hidden">
            {mobileNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    active ? 'bg-blue-50 text-blue-700' : 'border border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar sm:px-6 lg:px-10 lg:py-8 pb-24 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px]">
            <Outlet />
          </div>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-500'
                }`}
              >
                <item.icon size={18} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
