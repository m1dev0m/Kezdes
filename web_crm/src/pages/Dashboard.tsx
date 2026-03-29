import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, DoorClosed, RefreshCw } from 'lucide-react';
import api from '@/services/api';
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [tables, setTables] = useState<DashboardTable[]>([]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const today = getLocalDateString();
      const [bookingsResponse, tablesResponse] = await Promise.all([
        api.get(`/bookings/my_restaurant/?date=${today}&ordering=time`),
        api.get('/tables/status/').catch(() => api.get('/tables/')),
      ]);

      setBookings(extractResults<DashboardBooking>(bookingsResponse.data));
      setTables(extractResults<DashboardTable>(tablesResponse.data));
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
    const interval = window.setInterval(() => {
      void fetchData();
    }, 15000);
    return () => window.clearInterval(interval);
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
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Dashboard</div>
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
          Refresh
        </button>
      </div>

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
              All reservations
              <ArrowRight size={16} />
            </button>
          </div>

          {stats.activeToday.length === 0 ? (
            <EmptyState
              title="На сегодня пока нет бронирований"
              description="Создайте первую бронь вручную или дождитесь новых заявок с публичной страницы."
              actionLabel="Create reservation"
              onAction={() => navigate('/app/bookings/new')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-[#fafaf9] text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Guest</th>
                    <th className="px-6 py-4">Guests</th>
                    <th className="px-6 py-4">Table</th>
                    <th className="px-6 py-4">Status</th>
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
                      <td className="px-6 py-4 text-sm text-slate-700">{booking.user_name || 'Guest'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{booking.guests}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{booking.table_number ? `Table ${booking.table_number}` : '—'}</td>
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
                        <div className="text-sm font-semibold text-slate-900">{booking.user_name || 'Guest'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {booking.time?.slice(0, 5) || '—'} · {booking.guests} guests
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
              <QuickAction
                title="Проверить столы"
                description={stats.freeTables > 0 ? 'Столы уже созданы, можно продолжать работу.' : 'Сначала создайте хотя бы один стол.'}
                actionLabel={stats.freeTables > 0 ? 'Open tables' : 'Create tables'}
                onAction={() => navigate('/app/tables')}
              />
              <QuickAction
                title="Создать бронь"
                description="Если тестируете продукт, создайте первую бронь вручную и проверьте flow."
                actionLabel="New reservation"
                onAction={() => navigate('/app/bookings/new')}
              />
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
