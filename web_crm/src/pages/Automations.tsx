import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BellRing, Clock3, Mail, MessageSquare, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { extractResults, getApiErrorMessage } from '@/features/reservations/shared';

type AutomationLogRecord = {
  id: number;
  type: string;
  status: string;
  sent_at?: string | null;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
};

const TEMPLATE_CATALOG = [
  {
    id: 'booking_confirmation',
    channel: 'email',
    trigger: 'On new booking',
    title: 'Booking confirmation',
    description: 'Отправляется сразу после создания брони и подтверждает дату, время и состав гостей.',
  },
  {
    id: 'reservation_reminder',
    channel: 'sms',
    trigger: '24 hours before',
    title: 'Reservation reminder',
    description: 'Короткое напоминание перед визитом, чтобы снизить no-show и держать контакт с гостем.',
  },
  {
    id: 'waitlist_slot',
    channel: 'sms',
    trigger: 'When slot opens',
    title: 'Waitlist slot available',
    description: 'Уведомление для листа ожидания, когда освобождается стол на нужное время.',
  },
  {
    id: 'review_request',
    channel: 'email',
    trigger: 'After completed visit',
    title: 'Review request',
    description: 'Сообщение после завершённого визита, чтобы собрать отзыв от реального гостя.',
  },
] as const;

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStatusTone(status: string): string {
  if (status === 'sent') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'failed') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export default function Automations() {
  const [logs, setLogs] = useState<AutomationLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const response = await api.get('/automations/logs/');
      setLogs(extractResults<AutomationLogRecord>(response.data));
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не удалось загрузить историю уведомлений.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const stats = useMemo(
    () => ({
      templates: TEMPLATE_CATALOG.length,
      sent: logs.filter((log) => log.status === 'sent').length,
      failed: logs.filter((log) => log.status === 'failed').length,
      latest: logs[0]?.sent_at || logs[0]?.created_at || null,
    }),
    [logs],
  );

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Templates</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Notification templates</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            В этой версии продукт использует встроенные системные шаблоны. Ниже видны активные типы сообщений и
            фактическая история отправок по ресторану.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadLogs()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Обновление...' : 'Refresh'}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={<BellRing size={18} />} label="Templates" value={stats.templates} />
        <SummaryCard icon={<Mail size={18} />} label="Sent" value={stats.sent} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
        <SummaryCard icon={<MessageSquare size={18} />} label="Failed" value={stats.failed} tone="border-rose-200 bg-rose-50 text-rose-700" />
        <SummaryCard icon={<Clock3 size={18} />} label="Latest activity" value={stats.latest ? formatDateTime(stats.latest) : '—'} />
      </section>

      {error ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">Built-in template catalog</h2>
            <p className="mt-1 text-sm text-slate-500">Набор системных уведомлений, которые уже участвуют в booking flow.</p>
          </div>
          <div className="divide-y divide-slate-200">
            {TEMPLATE_CATALOG.map((template) => (
              <div key={template.id} className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${template.channel === 'email' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                      {template.channel}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{template.trigger}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{template.title}</h3>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">{template.description}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Active
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">Recent delivery log</h2>
            <p className="mt-1 text-sm text-slate-500">Последние реальные отправки по CRM и системным событиям.</p>
          </div>

          <div className="divide-y divide-slate-200">
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">Загрузка истории уведомлений...</div>
            ) : logs.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                История уведомлений пока пуста. Логи появятся после первых подтверждений, напоминаний и review-запросов.
              </div>
            ) : (
              logs.slice(0, 10).map((log) => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{log.customer_name || 'Guest'}</div>
                      <div className="mt-1 text-xs text-slate-500">{log.customer_phone || '—'}</div>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${getStatusTone(log.status)}`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{log.type}</span>
                    <span>{formatDateTime(log.sent_at || log.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone = 'border-slate-200 bg-white text-slate-700',
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className={`rounded-3xl border px-5 py-4 shadow-sm ${tone}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
