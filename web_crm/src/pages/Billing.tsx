import { useMemo, type ReactNode } from 'react';
import { ArrowRight, CreditCard, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useRestaurantSubscriptionSummary } from '@/features/subscription/useRestaurantSubscriptionSummary';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatAmount(amount: string, currency: string) {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return `${amount} ${currency}`;
  return new Intl.NumberFormat('ru-RU').format(numeric) + ` ${currency}`;
}

function getInvoiceStatusLabel(status: string) {
  switch (status) {
    case 'paid':
      return 'Оплачен';
    case 'pending':
      return 'Ожидает оплаты';
    case 'failed':
      return 'Не оплачен';
    case 'void':
      return 'Аннулирован';
    default:
      return status;
  }
}

function getPlanLabel(plan: string) {
  switch (plan) {
    case 'none':
      return 'Без подписки';
    case 'plus':
      return 'Plus';
    case 'pro':
      return 'Pro';
    default:
      return plan;
  }
}

const FEATURE_FLAG_LABELS: Record<string, { label: string; description: string }> = {
  table_map: {
    label: 'Схема зала',
    description: 'Редактирование плана зала, координат и конфигурации столов.',
  },
  zones: {
    label: 'Зоны',
    description: 'Разделение ресторана на залы и зоны посадки.',
  },
  shifts: {
    label: 'Смены',
    description: 'Сменный срез, расписание и контроль операций.',
  },
  staff_basic: {
    label: 'Команда',
    description: 'Сотрудники, роли и доступ к операционным экранам.',
  },
  orders_basic: {
    label: 'Предзаказы и заказы',
    description: 'Связка бронирований, предзаказов и заказов зала.',
  },
  analytics_basic: {
    label: 'Базовая аналитика',
    description: 'Основные KPI и отчёты по броням и операциям.',
  },
  analytics_advanced: {
    label: 'Продвинутая аналитика',
    description: 'Глубокая аналитика, конверсии и performance-срезы.',
  },
  waitlist: {
    label: 'Лист ожидания',
    description: 'Операционный waitlist и авто-предложение освободившихся слотов.',
  },
  vip_customers: {
    label: 'VIP / чёрный список',
    description: 'VIP-гости, blacklist и контроль no-show внутри CRM.',
  },
  events: {
    label: 'События',
    description: 'Спецвечера, депозитные правила и брони под события.',
  },
};

function getFeatureFlagMeta(key: string) {
  return FEATURE_FLAG_LABELS[key] ?? {
    label: key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: 'Точечная настройка, доступная для этого ресторана.',
  };
}

function getSubscriptionStateCopy(summary: {
  subscription_state: string;
  is_subscription_live: boolean;
  plan_label: string;
  plan: string;
  grace_until?: string | null;
}) {
  if (summary.subscription_state === 'none' || summary.plan === 'none') {
    return {
      title: 'Подписка не подключена',
      description:
        'Сейчас доступен только базовый контур. Чтобы открыть платные сценарии и снять ограничения по функциям, выберите тариф и активируйте подписку.',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
    };
  }

  if (summary.subscription_state === 'grace') {
    return {
      title: 'Идёт льготный период',
      description: summary.grace_until
        ? `Оплата уже требует внимания, но доступ сохранён до ${formatDate(summary.grace_until)}. Проверьте способ оплаты, чтобы не потерять доступ к сервису.`
        : 'Оплата уже требует внимания, но доступ пока сохранён. Проверьте способ оплаты, чтобы не потерять доступ к сервису.',
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (!summary.is_subscription_live) {
    return {
      title: 'Подписка ограничена',
      description:
        'Тариф выбран, но доступ к части функций сейчас ограничен. Проверьте статус оплаты и подключённые опции — после восстановления всё вернётся автоматически.',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  }

  return {
    title: `${summary.plan_label} активен`,
    description:
      'Подписка работает штатно. Ниже можно быстро проверить лимиты, ручные флаги, счета и последние изменения без лишних переходов.',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
}

function getSubscriptionPillLabel(summary: {
  subscription_state: string;
  payment_status_label: string;
  is_subscription_live: boolean;
}) {
  if (summary.subscription_state === 'none') return 'Без подписки';
  if (summary.subscription_state === 'grace') return 'Льготный период';
  if (!summary.is_subscription_live) return 'Ограничено';
  return summary.payment_status_label;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatAuditEventType(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace('Api', 'API');
}

function formatAuditActor(value?: string | null) {
  if (!value) return 'Система';
  return value === 'System' ? 'Система' : value;
}

export default function Billing() {
  const navigate = useNavigate();
  const { summary, audit, loading, refreshing, error, reload } = useRestaurantSubscriptionSummary();

  const invoiceStats = useMemo(() => {
    if (!summary) return { paid: 0, pending: 0 };
    return {
      paid: summary.invoices.filter((invoice) => invoice.status === 'paid').length,
      pending: summary.invoices.filter((invoice) => invoice.status === 'pending').length,
    };
  }, [summary]);

  const featureFlags = useMemo(() => {
    if (!summary) return [];

    return Object.entries(summary.feature_flags ?? {})
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey, 'ru'))
      .map(([key, enabled]) => ({
        key,
        enabled,
        ...getFeatureFlagMeta(key),
      }));
  }, [summary]);

  const auditEntries = useMemo(() => audit.slice(0, 8), [audit]);

  if (loading && !summary) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[#1d4ed8]" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <div className="text-lg font-semibold">Подписка недоступна</div>
        <div className="text-sm">{error || 'Не удалось определить ресторан и тариф.'}</div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700"
        >
          <RefreshCw size={16} />
          Повторить
        </button>
      </div>
    );
  }

  const subscriptionStateCopy = getSubscriptionStateCopy(summary);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Подписка</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Подписка и биллинг</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            Текущий тариф ресторана, лимиты, состояние оплаты, последние счета и быстрый переход к сравнению Plus / Pro.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Обновить
          </button>
          <button
            type="button"
            onClick={() => navigate(summary.upgrade_cta?.path || '/pricing')}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
          >
            {summary.upgrade_cta?.label || 'Сравнить тарифы'}
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <ShieldCheck size={14} />
                Текущий тариф
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{summary.plan_label}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{subscriptionStateCopy.description}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${subscriptionStateCopy.tone}`}>
              {getSubscriptionPillLabel(summary)}
            </span>
          </div>

          <div className={`mt-5 rounded-2xl border px-4 py-4 ${subscriptionStateCopy.tone}`}>
            <div className="text-sm font-semibold">{subscriptionStateCopy.title}</div>
            <div className="mt-1 text-sm leading-6 opacity-90">{subscriptionStateCopy.description}</div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <InfoCard label="Период с" value={formatDate(summary.current_period_starts_at)} />
            <InfoCard label="Следующее списание" value={formatDate(summary.current_period_ends_at)} />
            <InfoCard label="Льготный период до" value={formatDate(summary.grace_until)} />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles size={16} className="text-[#1d4ed8]" />
              Что открывает ваш тариф
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {summary.features.map((feature) => (
                <div
                  key={feature.key}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    feature.enabled ? 'border-emerald-200 bg-white text-slate-700' : 'border-slate-200 bg-slate-100 text-slate-500'
                  }`}
                >
                  <div className="font-semibold">{feature.label}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em]">
                    {feature.enabled ? 'Доступно' : 'Недоступно'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <SummaryCard
            icon={<CreditCard size={18} />}
            label="Оплаченных счетов"
            value={invoiceStats.paid}
            tone="bg-emerald-50 text-emerald-700"
          />
          <SummaryCard
            icon={<CreditCard size={18} />}
            label="Ожидают оплаты"
            value={invoiceStats.pending}
            tone="bg-amber-50 text-amber-700"
          />
          <SummaryCard
            icon={<ShieldCheck size={18} />}
            label="Ручные флаги"
            value={Object.keys(summary.feature_flags || {}).length}
            tone="bg-slate-100 text-slate-700"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-900">Ручные флаги</div>
              <div className="mt-1 text-sm text-slate-500">
                Точечные включения и исключения для этого ресторана. Это только для просмотра: здесь видно, что уже активировано.
              </div>
            </div>
            {refreshing ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <RefreshCw size={14} className="animate-spin" />
                Обновляем
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            {featureFlags.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-500">
                Ручных флагов пока нет. Если команда включит временные исключения или точечные доступы, они появятся здесь.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {featureFlags.map((feature) => (
                  <div
                    key={feature.key}
                    className={`rounded-2xl border px-4 py-4 ${
                      feature.enabled ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{feature.label}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">{feature.description}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                          feature.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {feature.enabled ? 'Включён' : 'Выключен'}
                      </span>
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                      Ключ: <span className="font-semibold text-slate-500">{feature.key}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-900">Аудит изменений</div>
              <div className="mt-1 text-sm text-slate-500">
                Последние действия по подписке, оплате и операционным изменениям ресторана.
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <ShieldCheck size={14} />
              {auditEntries.length}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {auditEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-500">
                Пока нет событий для аудита. Когда появятся изменения в подписке или оплате, они будут показаны здесь.
              </div>
            ) : (
              auditEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{entry.summary}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {formatAuditActor(entry.actor_username)} · {formatAuditEventType(entry.event_type)}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {formatDateTime(entry.created_at)}
                    </div>
                  </div>
                  {entry.payload && Object.keys(entry.payload).length > 0 ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                      {Object.entries(entry.payload)
                        .slice(0, 3)
                        .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
                        .join(' · ')}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold tracking-tight text-slate-900">Лимиты и использование</div>
          <div className="mt-1 text-sm text-slate-500">Количественные ограничения активного тарифа.</div>
          <div className="mt-5 space-y-4">
            {(['tables', 'zones', 'staff'] as const).map((key) => (
              <UsageRow
                key={key}
                label={key === 'tables' ? 'Столы' : key === 'zones' ? 'Залы / зоны' : 'Сотрудники'}
                used={summary.usage[key] ?? 0}
                limit={summary.limits[key] ?? null}
                percentage={summary.usage_percent[key] ?? null}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold tracking-tight text-slate-900">Чеклист первого запуска</div>
          <div className="mt-1 text-sm text-slate-500">Чтобы ресторан был реально готов к первому использованию.</div>
          <div className="mt-5 space-y-3">
            {summary.checklist.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.path)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  item.done
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.description}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                    item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {item.done ? 'Готово' : 'Открыть'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-900">История счетов</div>
            <div className="mt-1 text-sm text-slate-500">Последние инвойсы по ресторану.</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Счёт</th>
                <th className="px-6 py-4">Тариф</th>
                <th className="px-6 py-4">Период</th>
                <th className="px-6 py-4">Сумма</th>
                <th className="px-6 py-4">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summary.invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    Счета появятся здесь после первой активации или продления.
                  </td>
                </tr>
              ) : (
                summary.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{invoice.number}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{getPlanLabel(invoice.plan)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(invoice.period_start)} — {formatDate(invoice.period_end)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{formatAmount(invoice.amount, invoice.currency)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        invoice.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : invoice.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                      }`}>
                        {getInvoiceStatusLabel(invoice.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-2xl p-3 ${tone}`}>{icon}</div>
      <div className="mt-4 text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function UsageRow({
  label,
  used,
  limit,
  percentage,
}: {
  label: string;
  used: number;
  limit: number | null;
  percentage: number | null;
}) {
  const width = percentage === null ? 100 : Math.min(Math.max(percentage, 0), 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-900">{label}</span>
        <span className="text-slate-500">
          {used} / {limit === null ? '∞' : limit}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${percentage !== null && percentage >= 90 ? 'bg-amber-500' : 'bg-[#1d4ed8]'}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
