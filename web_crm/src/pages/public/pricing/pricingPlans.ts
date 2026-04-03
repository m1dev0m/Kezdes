export type PricingPlanId = 'starter' | 'pro' | 'business';

export type PricingBadgeVariant = 'neutral' | 'primary' | 'success';

export interface PricingBadge {
    label: string;
    variant?: PricingBadgeVariant;
}

export interface PricingPlanCta {
    label: string;
    to: string;
}

export interface PricingPlan {
    id: PricingPlanId;
    name: string;
    price: number;
    oldPrice?: number;
    currencySymbol: string;
    periodLabel: string;
    tagline: string;
    marketingLine?: string;
    badges?: PricingBadge[];
    highlight?: boolean;
    cta: PricingPlanCta;
    features: string[];
}

const starterFeatures = [
    'поиск ресторанов',
    'онлайн-бронирование без комиссии',
    'личный кабинет гостя',
    'история бронирований',
    'избранные заведения',
];

const proAdditionalFeatures = [
    'схема зала и рабочие столы',
    'управление рассадкой гостей',
    'статусы бронирований и смены',
    'аналитика бронирований',
    'гостевой контекст по визитам',
];

const businessAdditionalFeatures = [
    'несколько локаций под одной учётной записью',
    'гибкая настройка ролей команды',
    'приоритетный запуск и онбординг',
    'расширенный рабочий контур для сети',
    'индивидуальная конфигурация под операционную модель',
];

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'starter',
        name: 'GUEST',
        price: 0,
        currencySymbol: '₸',
        periodLabel: '',
        tagline: 'Для обычных пользователей',
        marketingLine: 'Всегда бесплатно',
        badges: [
            { label: 'FREE', variant: 'success' },
        ],
        cta: { label: 'Найти ресторан', to: '/restaurants' },
        features: starterFeatures,
    },
    {
        id: 'pro',
        name: 'PLUS',
        price: 17000,
        currencySymbol: '₸',
        periodLabel: '/ месяц',
        tagline: 'Базовый тариф для ресторана',
        marketingLine: '14 дней бесплатно, затем 17 000 ₸ / месяц',
        badges: [{ label: 'БАЗОВЫЙ ТАРИФ', variant: 'neutral' }],
        cta: { label: 'Подключить ресторан', to: '/register?mode=restaurant' },
        features: [...starterFeatures, ...proAdditionalFeatures],
    },
    {
        id: 'business',
        name: 'KEZDES PRO',
        price: 39990,
        currencySymbol: '₸',
        periodLabel: '/ месяц',
        tagline: 'Расширенный тариф для команды и сети',
        marketingLine: 'Для масштабирования и нескольких локаций',
        badges: [{ label: 'ДЛЯ РОСТА', variant: 'primary' }],
        highlight: true,
        cta: { label: 'Связаться с нами', to: '/register?mode=business' },
        features: [...starterFeatures, ...proAdditionalFeatures, ...businessAdditionalFeatures],
    },
];
