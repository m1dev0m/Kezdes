export type PricingPlanId = 'plus';

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

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'plus',
        name: 'KEZDES PLUS',
        price: 27990,
        currencySymbol: '₸',
        periodLabel: '/ месяц',
        tagline: 'Простая система для бронирования, столов и работы хоста',
        marketingLine: 'Один понятный тариф без сложной автоматизации.',
        badges: [{ label: 'ЕДИНЫЙ ТАРИФ', variant: 'primary' }],
        highlight: true,
        cta: { label: 'Попробовать', to: '/register?mode=restaurant' },
        features: [
            'управление бронями',
            'управление столами',
            'схема столов',
            'очередь / walk-in',
            'быстрые действия для хоста',
            'базовая база гостей',
            'простая CRM только для бронирования',
        ],
    },
];
