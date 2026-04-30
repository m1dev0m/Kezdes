import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, CreditCard, DoorClosed, RefreshCw, Users } from 'lucide-react';
import api from '@/services/api';
import { useRestaurantSubscriptionSummary } from '@/features/subscription/useRestaurantSubscriptionSummary';
import { extractResults, getApiErrorMessage, getLocalDateString, getReservationStatusMeta } from '@/features/reservations/shared';

type DashboardBooking = {
  id: number;
  date: string;
  time?: string;
  user_name?: string | null;
  guests: number;
  table_number?: string | null;
  status: string;
};

type DashboardTable = {
  id: number;
  status?: string;
  is_active?: boolean;
};

type DashboardShift = {
  id: number;
  name: string;
  starts_at?: string | null;
  ends_at?: string | null;
  days_of_week?: number[] | null;
};

function formatShiftClock(value?: string | null) {
  if (!value || typeof value !== 'string') return '—';
  const trimmed = value.trim();
  if (!trimmed) return '—';
  return trimmed.slice(0, 5);
}

function isPageVisible() {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { summary } = useRestaurantSubscriptionSummary();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DashboardBooking[]>([]);
  const [tables, setTables] = useState<DashboardTable[]>([]);
  const [activeShift, setActiveShift] = useState<DashboardShift | null>(null);
  const [shiftBookings, setShiftBookings] = useState<DashboardBooking[]>([]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const today = getLocalDateString();
      const [shiftsResponse, bookingsResponse, tablesResponse, pendingResponse] = await Promise.all([
        api.get('/restaurants/shifts/').catch(() => ({ data: [] })),
        api.get(`/bookings/my_restaurant/?date=${today}&ordering=time`),
        api.get('/tables/status/').catch(() => api.get('/tables/')),
        api.get('/bookings/my_restaurant/?status=pending,payment_pending&ordering=date,time&page_size=6').catch(() => ({ data: [] })),
      ]);

      const shiftsData = extractResults<DashboardShift>(shiftsResponse.data);
      const currentShift = getCurrentShift(shiftsData);
      setActiveShift(currentShift);
      setBookings(extractResults<DashboardBooking>(bookingsResponse.data));
      setTables(extractResults<DashboardTable>(tablesResponse.data));
      setPendingRequests(extractResults<DashboardBooking>(pendingResponse.data));
      if (currentShift) {
        try {
          const shiftBookingsResponse = await api.get(
            `/bookings/my_restaurant/?date=${today}&ordering=time&shift=${currentShift.id}`,
          );
          setShiftBookings(extractResults<DashboardBooking>(shiftBookingsResponse.data));
        } catch {
          setShiftBookings([]);
        }
      } else {
        setShiftBookings([]);
      }
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить данные дашборда.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const handleVisibilityChange = () => {
      if (isPageVisible()) {
        void fetchData();
      }
    };
    const interval = window.setInterval(() => {
      if (isPageVisible()) {
        void fetchData();
      }
    }, 15000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  const stats = useMemo(() => {
    const today = getLocalDateString();
    const now = new Date();

    const activeToday = bookings.filter(
      (booking) => booking.date === today && !['cancelled', 'rejected', 'completed', 'no_show'].includes(booking.status),
    );

    const upcoming = activeToday.filter((booking) => {
      if (!booking.time) return false;
      const [hours, minutes] = booking.time.split(':').map(Number);
      const slot = new Date();
      slot.setHours(hours, minutes, 0, 0);
      const diffMinutes = (slot.getTime() - now.getTime()) / 60000;
      return diffMinutes > 0 && diffMinutes <= 120;
    });

    const freeTables = tables.filter((table) => table.status === 'free' && table.is_active !== false).length;

    return {
      todayReservations: activeToday.length,
      upcoming,
      freeTables,
      activeToday,
    };
  }, [bookings, tables]);

  const shiftStats = useMemo(() => {
    const bookingsInShift = activeShift ? shiftBookings : bookings;
    const activeBookings = bookingsInShift.filter(
      (booking) => !['cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'rejected', 'completed', 'no_show'].includes(booking.status),
    );
    const upcomingBookings = bookingsInShift.filter((booking) => {
      if (!booking.time) return false;
      const [hours, minutes] = booking.time.split(':').map(Number);
      const slot = new Date();
      slot.setHours(hours, minutes, 0, 0);
      const diffMinutes = (slot.getTime() - Date.now()) / 60000;
      return diffMinutes >= 0 && diffMinutes <= 120;
    });

    return {
      bookingsInShift,
      activeBookings,
      upcomingBookings,
    };
  }, [activeShift, bookings, shiftBookings]);

  const pendingStats = useMemo(() => {
    const sorted = [...pendingRequests].sort((a, b) => {
      const left = `${a.date || ''} ${a.time || ''}`;
      const right = `${b.date || ''} ${b.time || ''}`;
      return left.localeCompare(right);
    });

    return {
      total: sorted.length,
      urgent: sorted.filter((booking) => booking.status === 'payment_pending').length,
      items: sorted,
    };
  }, [pendingRequests]);

  if (loading && bookings.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[#1d4ed8]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Панель</div>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Операционная картина на сегодня</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Быстрый обзор текущих бронирований, ближайших гостей и доступных столов без перехода между разделами.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchData()}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Обновить
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          title="Схема зала"
          description="Открыть схему зала для посадки, назначения стола и контроля статусов в зале."
          actionLabel="Открыть схему"
          onAction={() => navigate('/app/floor')}
        />
        <QuickAction
          title="Календарь смены"
          description="Перейти к дате, расписанию дня и ближайшим подтверждённым броням."
          actionLabel="Открыть календарь"
          onAction={() => navigate('/app/calendar')}
        />
        <QuickAction
          title="Новая бронь"
          description="Создать бронирование вручную без лишних переходов между разделами."
          actionLabel="Создать бронь"
          onAction={() => navigate('/app/bookings?new=1')}
        />
        <QuickAction
          title="Заказы"
          description="Проверить новые заказы и быстро открыть связанную бронь или пустой orders flow."
          actionLabel="Открыть заказы"
          onAction={() => navigate('/app/orders')}
        />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <CalendarClock size={14} />
              Запросы на бронь
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              {pendingStats.total > 0 ? `${pendingStats.total} ожидают ответа` : 'Нет новых запросов'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Клиентские брони и запросы на оплату показываются здесь первыми, чтобы менеджер видел их сразу после входа.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/bookings')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Все заявки
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Последние заявки</div>
            <div className="mt-4 space-y-3">
              {pendingStats.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
                  Новые клиентские запросы появятся здесь после публикации брони.
                </div>
              ) : (
                pendingStats.items.slice(0, 5).map((booking) => {
                  const statusMeta = getReservationStatusMeta(booking.status as any);
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => navigate(`/app/bookings?id=${booking.id}`)}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {booking.time?.slice(0, 5) || '—'} · {booking.user_name || 'Гость'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {booking.date} · {booking.guests} гостей · {booking.table_number ? `Стол ${booking.table_number}` : 'без стола'}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Что важно сейчас</div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>Запросы с оплатой требуют первоочередной реакции, чтобы не потерять бронь.</p>
              <p>Новые заявки лучше открывать прямо отсюда — без лишнего перехода в длинный список.</p>
              <p>Если запросов нет, блок остаётся пустым и не перегружает главную страницу.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Clock3 size={14} />
              Сменный срез
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              {activeShift ? activeShift.name : 'Смены не настроены'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              {activeShift
                ? `${isShiftActiveNow(activeShift) ? 'Сейчас активна' : 'Ближайшая'} смена ${formatShiftClock(activeShift.starts_at)} — ${formatShiftClock(activeShift.ends_at)}. ` +
                  `В этом окне ${shiftStats.activeBookings.length} активных броней и ${shiftStats.upcomingBookings.length} гостей в ближайшие 2 часа.`
                : 'Добавьте смены в разделе зала, чтобы быстро видеть текущую нагрузку и ближайшие брони по времени.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/floor')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Открыть схему зала
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard
            icon={<Clock3 size={18} />}
            label="Брони в смене"
            value={String(shiftStats.bookingsInShift.length)}
            description="Все записи в текущем оконном срезе"
            tone="bg-slate-100 text-slate-700"
          />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            label="Активные сейчас"
            value={String(shiftStats.activeBookings.length)}
            description="Брони, которые ещё не завершены"
            tone="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={<Users size={18} />}
            label="Скоро придут"
            value={String(shiftStats.upcomingBookings.length)}
            description="Гости в горизонте ближайших 2 часов"
            tone="bg-amber-50 text-amber-600"
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">Сводка смены</div>
            <div className="mt-4 space-y-3">
              <SnapshotRow label="Активная смена" value={activeShift?.name || '—'} />
              <SnapshotRow
                label="Время"
                value={activeShift ? `${formatShiftClock(activeShift.starts_at)} — ${formatShiftClock(activeShift.ends_at)}` : '—'}
              />
              <SnapshotRow
                label="Дни недели"
                value={activeShift?.days_of_week?.length ? activeShift.days_of_week.join(', ') : 'все дни'}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Ближайшие брони смены</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">Первые записи текущего окна</div>
              </div>
              <button type="button" onClick={() => navigate('/app/bookings')} className="text-sm font-semibold text-[#1d4ed8]">
                Все брони
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {shiftStats.bookingsInShift.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  В этой смене пока нет бронирований.
                </div>
              ) : (
                shiftStats.bookingsInShift.slice(0, 4).map((booking) => {
                  const statusMeta = getReservationStatusMeta(booking.status as any);
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => navigate(`/app/bookings?id=${booking.id}`)}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-white"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {booking.time?.slice(0, 5) || '—'} · {booking.user_name || 'Гость'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {booking.guests} гостей · {booking.table_number ? `Стол ${booking.table_number}` : 'без стола'}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {summary ? (
        <section className={`rounded-3xl border px-5 py-4 shadow-sm ${
          summary.subscription_state === 'none'
            ? 'border-slate-200 bg-white'
            : summary.subscription_state === 'grace'
            ? 'border-amber-200 bg-amber-50'
            : summary.is_subscription_live
              ? 'border-slate-200 bg-white'
              : 'border-rose-200 bg-rose-50'
        }`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/80 p-3 text-[#1d4ed8]">
                <CreditCard size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Тариф {summary.plan_label} · {summary.payment_status_label}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {summary.subscription_state === 'none'
                    ? 'Базовый план активен. Если нужна команда, аналитика и расширенные операции — перейдите на Plus / Pro.'
                    : summary.subscription_state === 'grace'
                    ? 'Льготный период активен. Проверьте оплату, чтобы не потерять расширенные функции.'
                    : summary.is_subscription_live
                      ? 'Подписка в порядке. Лимиты и счета доступны в разделе подписки.'
                      : 'Часть CRM-функций ограничена. Проверьте подписку и оплату.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1d4ed8] shadow-sm"
            >
              Открыть подписку
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          icon={<CalendarClock size={18} />}
          label="Сегодня бронирований"
          value={String(stats.todayReservations)}
          description="Активные брони на текущий день"
          tone="bg-blue-50 text-[#1d4ed8]"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Ближайшие 2 часа"
          value={String(stats.upcoming.length)}
          description="Гости, которые скоро придут"
          tone="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<DoorClosed size={18} />}
          label="Свободные столы"
          value={String(stats.freeTables)}
          description="Активные столы со статусом free"
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900">Сегодняшние бронирования</div>
              <div className="mt-1 text-sm text-slate-500">Список заявок текущего дня</div>
            </div>
            <button
              onClick={() => navigate('/app/bookings')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d4ed8]"
            >
              Все бронирования
              <ArrowRight size={16} />
            </button>
          </div>

          {stats.activeToday.length === 0 ? (
            <EmptyState
              title="На сегодня пока нет бронирований"
              description="Создайте первую бронь вручную или дождитесь новых заявок с публичной страницы."
              actionLabel="Создать бронь"
              onAction={() => navigate('/app/bookings?new=1')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-[#fafaf9] text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Время</th>
                    <th className="px-6 py-4">Гость</th>
                    <th className="px-6 py-4">Гостей</th>
                    <th className="px-6 py-4">Стол</th>
                    <th className="px-6 py-4">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.activeToday.slice(0, 8).map((booking) => (
                    <tr
                      key={booking.id}
                    className="cursor-pointer transition hover:bg-[#fafaf9]"
                      onClick={() => navigate(`/app/bookings?id=${booking.id}`)}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{booking.time?.slice(0, 5) || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{booking.user_name || 'Гость'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{booking.guests}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{booking.table_number ? `Стол ${booking.table_number}` : '—'}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={booking.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="text-lg font-bold tracking-tight text-slate-900">Ближайшие гости</div>
            <div className="mt-1 text-sm text-slate-500">Заявки на ближайшие два часа</div>
            <div className="mt-5 space-y-3">
              {stats.upcoming.length === 0 ? (
                <div className="rounded-2xl bg-[#fafaf9] px-4 py-5 text-sm text-slate-500">В ближайшие два часа новых гостей нет.</div>
              ) : (
                stats.upcoming.map((booking) => (
                  <div key={booking.id} className="rounded-2xl bg-[#fafaf9] px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{booking.user_name || 'Гость'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {booking.time?.slice(0, 5) || '—'} · {booking.guests} гостей
                        </div>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="text-lg font-bold tracking-tight text-slate-900">Первый запуск</div>
            <div className="mt-1 text-sm text-slate-500">Быстрые шаги, если ресторан только запускается</div>
            <div className="mt-5 space-y-3">
              {summary?.checklist?.length ? (
                summary.checklist.map((item) => (
                  <QuickAction
                    key={item.key}
                    title={item.label}
                    description={item.description}
                    actionLabel={item.done ? 'Открыть' : 'Настроить'}
                    onAction={() => navigate(item.path)}
                  />
                ))
              ) : (
                <>
                  <QuickAction
                    title="Проверить схему зала"
                    description={stats.freeTables > 0 ? 'Столы уже созданы, можно продолжать работу через схему зала.' : 'Сначала создайте хотя бы один стол и расставьте его на схеме зала.'}
                    actionLabel={stats.freeTables > 0 ? 'Открыть схему' : 'Собрать схему'}
                    onAction={() => navigate('/app/floor')}
                  />
                  <QuickAction
                    title="Создать бронь"
                    description="Если тестируете продукт, создайте первую бронь вручную и проверьте flow."
                    actionLabel="Новая бронь"
                    onAction={() => navigate('/app/bookings?new=1')}
                  />
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  tone: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
      <div className={`inline-flex rounded-2xl p-3 ${tone}`}>{icon}</div>
      <div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{description}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = getReservationStatusMeta(status);

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto max-w-md">
        <div className="text-xl font-bold tracking-tight text-slate-900">{title}</div>
        <div className="mt-3 text-sm leading-7 text-slate-600">{description}</div>
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl bg-[#fafaf9] px-4 py-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-500">{description}</div>
      <button type="button" onClick={onAction} className="mt-3 text-sm font-semibold text-[#1d4ed8]">
        {actionLabel}
      </button>
    </div>
  );
}

function isShiftActiveNow(shift: DashboardShift) {
  if (!shift?.starts_at || !shift?.ends_at) return false;
  const now = new Date();
  const weekday = (now.getDay() + 6) % 7;
  const shiftDays = shift.days_of_week || [];
  const coversToday = shiftDays.length === 0 || shiftDays.includes(weekday);
  if (!coversToday) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startHours, startMinutes] = shift.starts_at.split(':').map(Number);
  const [endHours, endMinutes] = shift.ends_at.split(':').map(Number);
  const starts = (startHours || 0) * 60 + (startMinutes || 0);
  const ends = (endHours || 0) * 60 + (endMinutes || 0);
  if (ends >= starts) return currentMinutes >= starts && currentMinutes <= ends;
  return currentMinutes >= starts || currentMinutes <= ends;
}

function getCurrentShift(shifts: DashboardShift[]) {
  if (shifts.length === 0) return null;
  const safeShifts = shifts.filter((shift) => Boolean(shift?.starts_at) && Boolean(shift?.ends_at));
  if (safeShifts.length === 0) return null;
  const now = new Date();
  const weekday = (now.getDay() + 6) % 7;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (value: string | null | undefined) => {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const active = safeShifts.find((shift) => {
    const shiftDays = shift.days_of_week || [];
    const coversToday = shiftDays.length === 0 || shiftDays.includes(weekday);
    if (!coversToday) return false;

    const starts = toMinutes(shift.starts_at);
    const ends = toMinutes(shift.ends_at);
    if (starts === null || ends === null) return false;
    if (ends >= starts) return currentMinutes >= starts && currentMinutes <= ends;
    return currentMinutes >= starts || currentMinutes <= ends;
  });

  if (active) return active;

  return (
    safeShifts
      .filter((shift) => {
        const shiftDays = shift.days_of_week || [];
        return shiftDays.length === 0 || shiftDays.includes(weekday);
      })
      .sort((left, right) => String(left.starts_at).localeCompare(String(right.starts_at)))[0] || null
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
