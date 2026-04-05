import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock3, Filter, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import api from '@/services/api';
import { extractResults, getApiErrorMessage } from '@/features/reservations/shared';

type OTPAttemptRecord = {
    id: number;
    email: string;
    channel: string;
    status: string;
    provider: string;
    error_message?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
};

type SystemMetrics = {
    total_restaurants: number;
    active_restaurants: number;
    total_users: number;
    total_bookings: number;
    bookings_today: number;
    pending_requests: number;
};

export default function SystemLogs() {
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [attempts, setAttempts] = useState<OTPAttemptRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
    const [emailFilter, setEmailFilter] = useState('');

    const loadData = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const [metricsResponse, attemptsResponse] = await Promise.all([
                api.get('/analytics/system/'),
                api.get('/auth/otp-delivery-attempts/', {
                    params: {
                        status: statusFilter === 'all' ? undefined : statusFilter,
                        email: emailFilter.trim() || undefined,
                    },
                }),
            ]);

            setMetrics(metricsResponse.data);
            setAttempts(extractResults<OTPAttemptRecord>(attemptsResponse.data));
        } catch (loadError) {
            const message = getApiErrorMessage(loadError, 'Не удалось загрузить мониторинг системы.');
            setError(message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [emailFilter, statusFilter]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const stats = useMemo(() => {
        const sent = attempts.filter((attempt) => attempt.status === 'sent').length;
        const failed = attempts.filter((attempt) => attempt.status === 'failed').length;
        const latest = attempts[0] || null;
        return {
            sent,
            failed,
            total: attempts.length,
            latest,
        };
    }, [attempts]);

    return (
        <div className="space-y-10">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-[0.4em] leading-none">Monitoring</p>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                        OTP / <span className="text-[#0047FF]">Notification</span> Monitor
                    </h1>
                    <p className="max-w-3xl text-sm leading-7 text-slate-600">
                        Здесь видны реальные попытки отправки OTP и общие системные метрики платформы. Это рабочий мониторинг, а не декоративный экран.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => void loadData()}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Обновить
                    </button>
                    <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        <Filter size={16} />
                        Scope
                    </button>
                </div>
            </header>

            {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            ) : null}

            <section className="grid gap-4 md:grid-cols-4">
                <MetricCard icon={<ShieldAlert size={18} />} label="Всего попыток" value={stats.total} />
                <MetricCard icon={<CheckCircle2 size={18} />} label="Отправлено" value={stats.sent} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
                <MetricCard icon={<AlertTriangle size={18} />} label="Ошибки" value={stats.failed} tone="border-rose-200 bg-rose-50 text-rose-700" />
                <MetricCard icon={<Clock3 size={18} />} label="Последняя" value={stats.latest ? formatDateTime(stats.latest.created_at) : '—'} />
            </section>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"
            >
                <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">OTP delivery attempts</h2>
                            <p className="mt-1 text-sm text-slate-500">Последние реальные отправки кода подтверждения.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {(['all', 'sent', 'failed'] as const).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setStatusFilter(value)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                                        statusFilter === value
                                            ? 'bg-[#1d4ed8] text-white'
                                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {value === 'all' ? 'Все' : value}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="px-6 py-4">
                        <label className="relative block">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={emailFilter}
                                onChange={(event) => setEmailFilter(event.target.value)}
                                placeholder="Фильтр по email"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:bg-white"
                            />
                        </label>
                    </div>

                    <div className="divide-y divide-slate-200">
                        {loading ? (
                            <div className="px-6 py-12 text-center text-sm text-slate-500">Загрузка попыток OTP...</div>
                        ) : attempts.length === 0 ? (
                            <div className="px-6 py-12 text-center text-sm text-slate-500">
                                Попыток отправки пока нет. Данные появятся после первого запроса кода.
                            </div>
                        ) : (
                            attempts.slice(0, 10).map((attempt) => (
                                <div key={attempt.id} className="px-6 py-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">{attempt.email}</div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {attempt.channel} · {attempt.provider}
                                            </div>
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                                                attempt.status === 'sent'
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                                            }`}
                                        >
                                            {attempt.status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                                        <span>{formatDateTime(attempt.created_at)}</span>
                                        {attempt.error_message ? <span className="text-rose-600">{attempt.error_message}</span> : <span>Без ошибки</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
                    >
                        <div className="text-lg font-semibold text-slate-900">System metrics</div>
                        <div className="mt-1 text-sm text-slate-500">Глобальная картина по платформе.</div>
                        <div className="mt-5 grid gap-3">
                            <MetricRow label="Рестораны" value={metrics?.total_restaurants ?? '—'} />
                            <MetricRow label="Активные рестораны" value={metrics?.active_restaurants ?? '—'} />
                            <MetricRow label="Всего пользователей" value={metrics?.total_users ?? '—'} />
                            <MetricRow label="Всего бронирований" value={metrics?.total_bookings ?? '—'} />
                            <MetricRow label="Бронирований сегодня" value={metrics?.bookings_today ?? '—'} />
                            <MetricRow label="Pending requests" value={metrics?.pending_requests ?? '—'} />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm"
                    >
                        <div className="text-lg font-semibold">Alert stance</div>
                        <div className="mt-1 text-sm text-white/70">
                            OTP pipeline is observable. Failed attempts become visible immediately in the list on the left.
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <MiniBadge label="Sent" value={stats.sent} tone="bg-emerald-500/15 text-emerald-300" />
                            <MiniBadge label="Failed" value={stats.failed} tone="bg-rose-500/15 text-rose-300" />
                            <MiniBadge label="Latest" value={stats.latest ? 'Fresh' : '—'} tone="bg-slate-700 text-slate-100" />
                        </div>
                    </motion.div>
                </section>
            </motion.div>
        </div>
    );
}

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

function MetricCard({ icon, label, value, tone = 'border-slate-200 bg-white text-slate-700' }: { icon: ReactNode; label: string; value: string | number; tone?: string }) {
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

function MetricRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
            <div className="text-sm font-semibold text-slate-900">{value}</div>
        </div>
    );
}

function MiniBadge({ label, value, tone }: { label: string; value: string | number; tone: string }) {
    return (
        <div className={`rounded-2xl px-4 py-3 ${tone}`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">{label}</div>
            <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
        </div>
    );
}
