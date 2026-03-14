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
    'управление бронями',
    'базовая CRM гостей',
    'управление столами',
    'уведомления о брони',
    'история гостей',
];

const proAdditionalFeatures = [
    'визуальная карта столов (Table Map)',
    'управление рассадкой гостей',
    'аналитика бронирований',
    'управление no-show',
    'статистика загрузки ресторана',
];

const businessAdditionalFeatures = [
    'несколько ресторанов',
    'расширенная аналитика',
    'API доступ',
    'приоритетная поддержка',
    'маркетинг и CRM инструменты',
];

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'starter',
        name: 'STARTER',
        price: 13990,
        oldPrice: 16990,
        currencySymbol: '₸',
        periodLabel: '/ месяц',
        tagline: 'Выгодная цена для запуска ресторана',
        marketingLine: '14 дней бесплатно',
        badges: [
            { label: 'Выгодная цена', variant: 'success' },
            { label: 'СКИДКА', variant: 'neutral' },
        ],
        cta: { label: 'Начать бесплатно', to: '/register' },
        features: starterFeatures,
    },
    {
        id: 'pro',
        name: 'PRO',
        price: 16990,
        oldPrice: 25990,
        currencySymbol: '₸',
        periodLabel: '/ месяц',
        tagline: 'Лучшая цена для большинства ресторанов',
        marketingLine: '14 дней бесплатно',
        badges: [{ label: 'САМЫЙ ПОПУЛЯРНЫЙ', variant: 'primary' }],
        highlight: true,
        cta: { label: 'Попробовать', to: '/register' },
        features: [...starterFeatures, ...proAdditionalFeatures],
    },
    {
        id: 'business',
        name: 'BUSINESS',
        price: 39990,
        currencySymbol: '₸',
        periodLabel: '/ месяц',
        tagline: 'Для сетей ресторанов',
        badges: [{ label: '14 дней бесплатно', variant: 'neutral' }],
        cta: { label: 'Связаться с нами', to: '/register?mode=business' },
        features: [...starterFeatures, ...proAdditionalFeatures, ...businessAdditionalFeatures],
    },
];
