import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, CalendarRange, RefreshCw, Repeat, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import {
  useRestaurantSubscriptionSummary,
  type RestaurantSubscriptionSummary,
} from '@/features/subscription/useRestaurantSubscriptionSummary';
import { getApiErrorMessage } from '@/features/reservations/shared';

type AnalyticsData = {
  bookings_today: number;
  bookings_month: number;
  occupancy_percent: number;
  revenue: number;
  confirmation_rate: number;
  repeat_customer_rate: number;
  avg_guests: number;
  weekly_chart: { name: string; total: number }[];
  daily_load: { name: string; bookings: number }[];
  no_show_month?: number;
  no_show_rate?: number;
  channels?: { id: string; name: string; count: number }[];
  retention_30_days?: number;
};

function hasFeature(summary: RestaurantSubscriptionSummary | null, key: string): boolean {
  if (!summary) return false;
  const flag = summary.feature_flags?.[key];
  if (typeof flag === 'boolean') return flag;
  return summary.features?.some((feature) => feature.key === key && feature.enabled) ?? false;
}

export default function Analytics() {
  const { summary, loading: subscriptionLoading, error: subscriptionError, reload: reloadSubscription } = useRestaurantSubscriptionSummary();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canViewAnalytics = useMemo(() => hasFeature(summary, 'analytics_basic'), [summary]);
  const kpis = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Bookings today', value: data.bookings_today, hint: 'Все заявки за текущий день', icon: <CalendarRange size={18} /> },
      { label: 'Monthly bookings', value: data.bookings_month, hint: 'Накопительный объём за месяц', icon: <BarChart3 size={18} /> },
      { label: 'Confirmation rate', value: `${data.confirmation_rate}%`, hint: 'Доля подтверждённых броней', icon: <Users size={18} /> },
      { label: 'Repeat guests', value: `${data.repeat_customer_rate}%`, hint: 'Повторные визиты и retention', icon: <Repeat size={18} /> },
    ];
  }, [data]);

  const loadAnalytics = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const response = await api.get('/analytics/dashboard/');
      setData(response.data as AnalyticsData);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не удалось загрузить аналитику ресторана.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (subscriptionLoading || !summary) return;
    if (!canViewAnalytics) return;
    void loadAnalytics();
  }, [canViewAnalytics, loadAnalytics, subscriptionLoading, summary]);

  if (subscriptionLoading && !summary) {
    return (
      <div className="space-y-8 pb-10">
        <div className="h-24 animate-pulse rounded-3xl bg-slate-50" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-50" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-50" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-50" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-50" />
        </div>
      </div>
    );
  }

  if (subscriptionError && !summary) {
    return (
      <div className="space-y-8 pb-10">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>{subscriptionError}</div>
            <button
              type="button"
              onClick={() => void reloadSubscription()}
              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (summary && !canViewAnalytics) {
    return (
      <div className="space-y-8 pb-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Analytics</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Аналитика недоступна на текущем тарифе</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Для операционной аналитики нужен тариф Plus или ручное включение флага `analytics_basic`.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <RefreshCw size={18} className="animate-spin text-[#1d4ed8]" />
            Загрузка аналитики...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Analytics</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Operational performance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Ежедневные брони, загрузка смены, каналы привлечения и возврат гостей. Это read-only слой для контроля
            производительности, а не отдельная операционная очередь.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Обновление...' : 'Обновить'}
        </button>
      </header>

      {error ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
          >
            Повторить
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((item) => (
              <KpiCard key={item.label} icon={item.icon} label={item.label} value={item.value} hint={item.hint} />
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Weekly bookings trend</h2>
                <p className="mt-1 text-sm text-slate-500">Сколько бронирований прошло по дням за последнюю неделю.</p>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.weekly_chart}>
                    <defs>
                      <linearGradient id="analyticsTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={2.5} fill="url(#analyticsTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Daily load</h2>
                <p className="mt-1 text-sm text-slate-500">Распределение бронирований по часам текущей операционной сетки.</p>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily_load}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#0f766e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Acquisition channels</h2>
                <p className="mt-1 text-sm text-slate-500">Какие каналы сейчас приводят гостей в ресторан.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {(data.channels || []).length > 0 ? (
                  (data.channels || []).map((channel) => (
                    <div key={channel.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{channel.name}</div>
                      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{channel.count}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500 md:col-span-3">
                    Каналы привлечения пока не отдают отдельную статистику.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Core metrics</h2>
              <div className="mt-5 space-y-4">
                <MetricRow label="Occupancy" value={`${data.occupancy_percent}%`} />
                <MetricRow label="Average party size" value={String(data.avg_guests)} />
                <MetricRow label="30-day retention" value={`${data.retention_30_days || 0}%`} />
                <MetricRow label="No-show rate" value={`${data.no_show_rate || 0}%`} />
                <MetricRow label="No-shows this month" value={String(data.no_show_month || 0)} />
                <MetricRow label="Revenue" value={String(data.revenue)} />
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{hint}</div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-lg font-semibold text-slate-900">{value}</span>
    </div>
  );
}
