import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { PricingPlan, PricingBadgeVariant } from './pricingPlans';

function formatNumber(value: number) {
    return new Intl.NumberFormat('ru-RU').format(value);
}

function getSavingsPercent(price: number, oldPrice?: number) {
    if (!oldPrice) return null;
    if (oldPrice <= 0) return null;
    const diff = oldPrice - price;
    if (diff <= 0) return null;
    return Math.round((diff / oldPrice) * 100);
}

function badgeClass(variant: PricingBadgeVariant = 'neutral') {
    if (variant === 'primary') {
        return 'bg-primary text-white shadow-sm shadow-primary/20';
    }

    if (variant === 'success') {
        return 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20';
    }

    return 'bg-slate-900 text-white shadow-sm shadow-slate-900/10';
}

export function PricingCard({
    plan,
    index,
}: {
    plan: PricingPlan;
    index: number;
}) {
    const savingsPercent = getSavingsPercent(plan.price, plan.oldPrice);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.5 }}
            className={
                `relative flex h-full flex-col rounded-[2rem] border bg-white p-8 sm:p-10 transition-all duration-300 ` +
                (plan.highlight
                    ? 'border-primary/20 shadow-2xl shadow-primary/10 ring-1 ring-primary/10'
                    : 'border-slate-100 shadow-lg shadow-slate-900/5 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 hover:border-slate-200')
            }
        >
            <div className="absolute inset-x-0 top-0 h-24 rounded-t-[2rem] bg-gradient-to-b from-slate-50 to-transparent pointer-events-none" />

            <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                    {plan.badges?.map((badge) => (
                        <span
                            key={`${plan.id}-${badge.label}`}
                            className={
                                'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ' +
                                badgeClass(badge.variant)
                            }
                        >
                            {badge.label}
                        </span>
                    ))}

                    {savingsPercent !== null && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                            Экономия {savingsPercent}%
                        </span>
                    )}
                </div>

                <div className="mt-6">
                    <h3 className="text-sm font-black tracking-[0.25em] text-slate-900">{plan.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{plan.tagline}</p>

                    <div className="mt-6 flex items-end gap-3">
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900">
                                {formatNumber(plan.price)}
                            </span>
                            <span className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900">{plan.currencySymbol}</span>
                        </div>

                        <span className="pb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{plan.periodLabel}</span>
                    </div>

                    {plan.oldPrice ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-400 line-through">
                                {formatNumber(plan.oldPrice)}{plan.currencySymbol}
                            </span>
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-600">
                                СКИДКА
                            </span>
                        </div>
                    ) : null}

                    {plan.marketingLine ? (
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                            {plan.marketingLine}
                        </p>
                    ) : null}
                </div>

                <div className="mt-8 space-y-4">
                    {plan.features.map((feature) => (
                        <div key={`${plan.id}-${feature}`} className="flex items-start gap-3">
                            <span
                                className={
                                    'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ' +
                                    (plan.highlight ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-500')
                                }
                            >
                                <Check size={14} strokeWidth={3} />
                            </span>
                            <span className="text-sm font-semibold text-slate-700">{feature}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-10">
                    <Link
                        to={plan.cta.to}
                        className={
                            'group inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.99] ' +
                            (plan.highlight
                                ? 'bg-brand-dark text-white shadow-xl shadow-brand-dark/20 hover:shadow-2xl hover:shadow-brand-dark/25'
                                : 'bg-slate-50 text-slate-900 shadow-lg shadow-slate-900/5 hover:bg-slate-100')
                        }
                    >
                        {plan.cta.label}
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
