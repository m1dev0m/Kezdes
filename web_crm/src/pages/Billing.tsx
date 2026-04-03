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

  const statusTone =
    summary.subscription_state === 'none'
      ? 'border-slate-200 bg-slate-100 text-slate-700'
      : summary.subscription_state === 'grace'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : summary.is_subscription_live
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-rose-200 bg-rose-50 text-rose-700';

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
              <p className="mt-2 text-sm text-slate-600">
                Статус ресторана: {summary.status} · Оплата: {summary.payment_status_label}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone}`}>
              {summary.subscription_state === 'grace' ? 'Льготный период' : summary.payment_status_label}
            </span>
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
            label="Точечные фичи"
            value={Object.keys(summary.feature_flags || {}).length}
            tone="bg-slate-100 text-slate-700"
          />
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

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold tracking-tight text-slate-900">Последние изменения</div>
        <div className="mt-1 text-sm text-slate-500">Аудит по подписке, статусу ресторана и операционным событиям.</div>
        <div className="mt-5 space-y-3">
          {audit.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Пока нет записей аудита.
            </div>
          ) : (
            audit.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{entry.summary}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{formatDate(entry.created_at)}</div>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {entry.actor_username || 'System'} · {entry.event_type.replaceAll('_', ' ')}
                </div>
              </div>
            ))
          )}
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
