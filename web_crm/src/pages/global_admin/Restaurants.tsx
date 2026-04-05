import { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';

type FeatureFlags = Record<string, boolean>;

type RestaurantRecord = {
    id: number | string;
    name: string;
    address?: string;
    phone?: string;
    image?: string;
    owner?: string;
    status?: string;
    plan?: string;
    billing_status?: string;
    payment_status?: string;
    payment_status_label?: string;
    current_period_end?: string;
    current_period_ends_at?: string;
    is_verified?: boolean;
    feature_flags?: FeatureFlags | string[] | null;
};

type ManagedFeature = {
    key: string;
    enabled: boolean;
};

type FeatureFlagsDetail = {
    id: number | string;
    name: string;
    plan?: string;
    plan_label?: string;
    payment_status?: string;
    payment_status_label?: string;
    feature_flags?: FeatureFlags | string[] | null;
    managed_features?: ManagedFeature[];
    effective_features?: string[];
    updated_at?: string;
};

type FeatureFlagDefinition = {
    key: string;
    label: string;
    description: string;
    badge: string;
};

const FEATURE_FLAG_LIBRARY: FeatureFlagDefinition[] = [
    {
        key: 'table_map',
        label: 'Схема зала',
        description: 'Редактирование плана зала, координат и конфигурации столов.',
        badge: 'Зал',
    },
    {
        key: 'zones',
        label: 'Зоны',
        description: 'Разделение ресторана на залы и зоны посадки.',
        badge: 'Посадка',
    },
    {
        key: 'shifts',
        label: 'Смены',
        description: 'Сменный срез, расписание и контроль операций.',
        badge: 'Операции',
    },
    {
        key: 'staff_basic',
        label: 'Команда',
        description: 'Сотрудники, роли и доступ к операционным экранам.',
        badge: 'Команда',
    },
    {
        key: 'orders_basic',
        label: 'Предзаказы и заказы',
        description: 'Связка бронирований, предзаказов и заказов зала.',
        badge: 'Заказы',
    },
    {
        key: 'analytics_basic',
        label: 'Базовая аналитика',
        description: 'Основные KPI и отчёты по броням и операциям.',
        badge: 'Аналитика',
    },
    {
        key: 'analytics_advanced',
        label: 'Продвинутая аналитика',
        description: 'Глубокая аналитика, конверсии и performance-срезы.',
        badge: 'Pro',
    },
    {
        key: 'waitlist',
        label: 'Лист ожидания',
        description: 'Операционный waitlist и авто-предложение освобождённых слотов.',
        badge: 'Flow',
    },
    {
        key: 'vip_customers',
        label: 'VIP / Blacklist',
        description: 'VIP-гости, blacklist и контроль no-show внутри CRM.',
        badge: 'CRM',
    },
    {
        key: 'events',
        label: 'События',
        description: 'Спецвечера, депозитные правила и брони под события.',
        badge: 'Events',
    },
];

function normalizeFeatureFlags(value: RestaurantRecord['feature_flags']): FeatureFlags {
    if (!value) return {};
    if (Array.isArray(value)) {
        return value.reduce<FeatureFlags>((acc, key) => {
            acc[String(key)] = true;
            return acc;
        }, {});
    }
    if (typeof value === 'object') return { ...value };
    return {};
}

function formatStatusLabel(value?: string) {
    if (!value) return 'Неизвестно';
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .replace('Verified', 'Верифицирован')
        .replace('Pending', 'На проверке')
        .replace('Active', 'Активен')
        .replace('Past Due', 'Просрочен')
        .replace('Grace', 'Grace');
}

function formatDate(value?: string) {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('ru-RU', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(parsed);
}

export default function Restaurants() {
    const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<RestaurantRecord['id'] | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<FeatureFlagsDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [flagsDraft, setFlagsDraft] = useState<FeatureFlags>({});
    const [flagsBaseline, setFlagsBaseline] = useState<FeatureFlags>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void loadRestaurants();
    }, []);

    const loadRestaurants = async () => {
        try {
            const res = await api.get('/restaurants/');
            const payload = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
            const normalized = payload as RestaurantRecord[];
            setRestaurants(normalized);

            if (!selectedRestaurantId && normalized.length > 0) {
                setSelectedRestaurantId(normalized[0].id);
            }
        } catch (error) {
            toast.error('Не удалось загрузить список ресторанов.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedRestaurantId) {
            setSelectedDetail(null);
            setFlagsDraft({});
            setFlagsBaseline({});
            return;
        }

        let ignore = false;

        const loadFeatureFlagsDetail = async () => {
            setDetailLoading(true);
            try {
                const { data } = await api.get<FeatureFlagsDetail>(`/restaurants/${selectedRestaurantId}/feature-flags/`);
                if (ignore) return;

                const nextFlags = normalizeFeatureFlags(data.feature_flags);
                setSelectedDetail(data);
                setFlagsDraft(nextFlags);
                setFlagsBaseline(nextFlags);
            } catch (error) {
                if (ignore) return;
                setSelectedDetail(null);
                setFlagsDraft({});
                setFlagsBaseline({});
                toast.error('Не удалось загрузить feature flags ресторана.');
            } finally {
                if (!ignore) {
                    setDetailLoading(false);
                }
            }
        };

        void loadFeatureFlagsDetail();

        return () => {
            ignore = true;
        };
    }, [selectedRestaurantId]);

    const filteredRestaurants = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return restaurants;

        return restaurants.filter((restaurant) => {
            const searchableValues = [
                restaurant.name,
                restaurant.address,
                restaurant.phone,
                restaurant.owner,
                restaurant.status,
                restaurant.plan,
                restaurant.billing_status,
            ]
                .filter(Boolean)
                .map((value) => String(value).toLowerCase());

            return searchableValues.some((value) => value.includes(needle));
        });
    }, [restaurants, search]);

    const selectedRestaurant = useMemo(
        () => restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null,
        [restaurants, selectedRestaurantId],
    );

    useEffect(() => {
        if (!selectedRestaurant && filteredRestaurants.length > 0) {
            setSelectedRestaurantId(filteredRestaurants[0].id);
        }
    }, [filteredRestaurants, selectedRestaurant]);

    const activeFlagCount = Object.values(flagsDraft).filter(Boolean).length;
    const totalFlagCount = FEATURE_FLAG_LIBRARY.length;

    const hasChanges = useMemo(() => {
        const baselineKeys = Object.keys(flagsBaseline);
        const draftKeys = Object.keys(flagsDraft);
        if (baselineKeys.length !== draftKeys.length) return true;

        return baselineKeys.some((key) => Boolean(flagsBaseline[key]) !== Boolean(flagsDraft[key]));
    }, [flagsBaseline, flagsDraft]);

    const updateFlag = (key: string, enabled: boolean) => {
        setFlagsDraft((current) => ({
            ...current,
            [key]: enabled,
        }));
    };

    const saveFeatureFlags = async () => {
        if (!selectedRestaurant) return;

        setSaving(true);
        try {
            const { data } = await api.patch<FeatureFlagsDetail>(
                `/restaurants/${selectedRestaurant.id}/feature-flags/`,
                {
                    feature_flags: flagsDraft,
                },
            );

            const nextFlags = normalizeFeatureFlags(data.feature_flags);
            setSelectedDetail(data);
            setFlagsDraft(nextFlags);
            setFlagsBaseline(nextFlags);
            setRestaurants((current) =>
                current.map((restaurant) =>
                    restaurant.id === selectedRestaurant.id
                        ? {
                              ...restaurant,
                              plan: data.plan ?? restaurant.plan,
                              payment_status: data.payment_status ?? restaurant.payment_status,
                              billing_status: data.payment_status ?? restaurant.billing_status,
                              feature_flags: nextFlags,
                          }
                        : restaurant,
                ),
            );
            toast.success('Feature flags сохранены.');
        } catch (error) {
            toast.error('Не удалось сохранить feature flags.');
        } finally {
            setSaving(false);
        }
    };

    const resetDraft = () => {
        const nextFlags = normalizeFeatureFlags(selectedDetail?.feature_flags);
        setFlagsDraft(nextFlags);
        setFlagsBaseline(nextFlags);
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-[0.4em] leading-none">Global Admin</p>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-[0.92]">
                        Рестораны и <span className="text-[#0047FF]">feature flags</span>.
                    </h1>
                    <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Выбери ресторан, проверь его тарифный контекст и включи нужные возможности без перехода в другие экраны.
                    </p>
                </div>

                <div className="w-full xl:w-[28rem]">
                    <label className="relative block group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0047FF] transition-colors text-[22px]">
                            search
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск по названию, статусу или тарифу"
                            className="w-full h-14 pl-14 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none transition-all text-[11px] font-black uppercase tracking-[0.18em] placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-[#0047FF]"
                        />
                    </label>
                </div>
            </header>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl shadow-black/5">
                    <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">Инвентарь</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {filteredRestaurants.length} ресторанов в выборке
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                Live data
                            </span>
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[#0047FF]">
                                <span className="material-symbols-outlined text-[16px]">tune</span>
                                Feature flags
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/50">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        Ресторан
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        Тариф
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        Статус
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        Флаги
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        Оплата
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, index) => (
                                        <tr key={index} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-7 bg-slate-50/50 dark:bg-slate-800/30">
                                                <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredRestaurants.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                                    <span className="material-symbols-outlined text-[56px]">restaurant</span>
                                                    <p className="text-xs font-black uppercase tracking-[0.28em]">
                                                    Ничего не найдено
                                                    </p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    Измени запрос или обнови список.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                ) : (
                                    filteredRestaurants.map((restaurant) => {
                                        const isSelected = restaurant.id === selectedRestaurantId;
                                        const restaurantFlags = normalizeFeatureFlags(restaurant.feature_flags);
                                        const enabledFlags = Object.values(restaurantFlags).filter(Boolean).length;

                                        return (
                                            <tr
                                                key={restaurant.id}
                                                onClick={() => setSelectedRestaurantId(restaurant.id)}
                                                className={[
                                                    'cursor-pointer transition-colors',
                                                    isSelected
                                                        ? 'bg-blue-50/70 dark:bg-blue-500/10'
                                                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40',
                                                ].join(' ')}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                                                            {restaurant.image ? (
                                                                <img
                                                                    src={restaurant.image}
                                                                    alt={restaurant.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="material-symbols-outlined text-[#0047FF] text-[22px]">
                                                                    storefront
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                                                {restaurant.name}
                                                            </p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.16em] truncate">
                                                                {restaurant.owner || 'Владелец не указан'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-[0.18em]">
                                                        {formatStatusLabel(restaurant.plan || 'none')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="space-y-1">
                                                        <span
                                                            className={[
                                                                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.18em] border',
                                                                restaurant.is_verified
                                                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700',
                                                            ].join(' ')}
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">
                                                            {restaurant.is_verified ? 'verified' : 'hourglass_top'}
                                                            </span>
                                                            {formatStatusLabel(restaurant.status || (restaurant.is_verified ? 'verified' : 'pending'))}
                                                        </span>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.16em]">
                                                            {restaurant.address || 'Адрес не указан'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                                                            {restaurant.feature_flags ? `${enabledFlags}/${totalFlagCount}` : '—'}
                                                        </p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.16em]">
                                                            {restaurant.feature_flags ? 'Включено' : 'Открой справа'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                            {formatStatusLabel(restaurant.billing_status || restaurant.payment_status)}
                                                        </p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.16em]">
                                                            {formatDate(restaurant.current_period_end || restaurant.current_period_ends_at)}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl shadow-black/5">
                    {selectedRestaurant ? (
                        <div className="h-full flex flex-col">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Выбранный ресторан</p>
                                        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            {selectedDetail?.name || selectedRestaurant.name}
                                        </h2>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                                            ID {selectedRestaurant.id}
                                        </span>
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[#0047FF] text-[10px] font-black uppercase tracking-[0.18em]">
                                            {selectedDetail?.plan_label || formatStatusLabel(selectedRestaurant.plan || 'none')}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Владелец</p>
                                        <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{selectedRestaurant.owner || '—'}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Оплата</p>
                                        <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                                            {selectedDetail?.payment_status_label || formatStatusLabel(selectedRestaurant.billing_status || selectedRestaurant.payment_status)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-[0.18em]">
                                        <span className="material-symbols-outlined text-[14px]">
                                            {selectedRestaurant.is_verified ? 'verified' : 'schedule'}
                                        </span>
                                        {selectedRestaurant.is_verified ? 'Верифицирован' : 'На проверке'}
                                    </span>
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-[0.18em]">
                                        {formatStatusLabel(selectedRestaurant.status)}
                                    </span>
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-[0.18em]">
                                        {selectedRestaurant.current_period_end || selectedRestaurant.current_period_ends_at
                                            ? `До ${formatDate(selectedRestaurant.current_period_end || selectedRestaurant.current_period_ends_at)}`
                                            : 'Нет данных по периоду'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 p-6 space-y-6">
                                {detailLoading ? (
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-5">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">Загружаю feature flags...</p>
                                    </div>
                                ) : null}

                                <div>
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Feature flags</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Включай только те возможности, которые реально должны быть доступны ресторану.
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white">
                                                {activeFlagCount} включено
                                            </p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">
                                                из {totalFlagCount}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {FEATURE_FLAG_LIBRARY.map((flag) => {
                                            const enabled = Boolean(flagsDraft[flag.key]);
                                            return (
                                                <button
                                                    key={flag.key}
                                                    type="button"
                                                    onClick={() => updateFlag(flag.key, !enabled)}
                                                    disabled={detailLoading || saving}
                                                    className={[
                                                        'w-full text-left rounded-2xl border px-4 py-4 transition-all disabled:cursor-not-allowed disabled:opacity-60',
                                                        enabled
                                                            ? 'border-[#0047FF]/30 bg-blue-50/80 dark:bg-blue-500/10'
                                                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700',
                                                    ].join(' ')}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                                    {flag.label}
                                                                </p>
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                                                                    {flag.badge}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                                                {flag.description}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={[
                                                                'mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.18em] border',
                                                                enabled
                                                                    ? 'bg-[#0047FF] text-white border-[#0047FF]'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700',
                                                            ].join(' ')}
                                                        >
                                                            {enabled ? 'Включено' : 'Выключено'}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                                            Payload preview
                                        </p>
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            {hasChanges ? 'Есть изменения' : 'Синхронизировано'}
                                        </span>
                                    </div>
                                    <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap">
{JSON.stringify(flagsDraft, null, 2)}
                                    </pre>
                                </div>

                                {selectedDetail?.effective_features?.length ? (
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Итоговые возможности</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {selectedDetail.effective_features.map((feature) => (
                                                <span
                                                    key={feature}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-[10px] font-black uppercase tracking-[0.18em]"
                                                >
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={resetDraft}
                                    disabled={detailLoading || saving}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black uppercase tracking-[0.18em] text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Сбросить
                                </button>
                                <button
                                    type="button"
                                    onClick={saveFeatureFlags}
                                    disabled={detailLoading || saving || !hasChanges}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#0047FF] text-white font-black uppercase tracking-[0.18em] text-[10px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0037d6] transition-colors"
                                >
                                    {saving ? 'Сохраняю...' : 'Сохранить feature flags'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[520px] flex items-center justify-center p-8 text-center">
                            <div className="max-w-sm space-y-4 text-slate-400">
                                <span className="material-symbols-outlined text-[64px]">toggle_on</span>
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-[0.28em]">
                                        Выбери ресторан
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Открой ресторан из списка, чтобы посмотреть подписку и управлять feature flags.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
