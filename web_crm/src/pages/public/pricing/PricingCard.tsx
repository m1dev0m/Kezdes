import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
        return 'bg-[#0047FF] text-white shadow-2xl shadow-[#0047FF]/25';
    }

    if (variant === 'success') {
        return 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/25';
    }

    return 'bg-slate-950 text-white shadow-2xl shadow-black/10';
}

export function PricingCard({
    plan,
    index,
}: {
    plan: PricingPlan;
    index: number;
}) {
    const savingsPercent = getSavingsPercent(plan.price, plan.oldPrice);
    const isFree = plan.price === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.6 }}
            className={
                `relative flex h-full flex-col rounded-[3rem] border bg-white dark:bg-slate-900 p-10 sm:p-12 transition-all duration-500 group ` +
                (plan.highlight
                    ? 'border-[#0047FF]/20 shadow-2xl shadow-[#0047FF]/10 ring-4 ring-[#0047FF]/5'
                    : 'border-slate-50 dark:border-slate-800 shadow-xl shadow-black/5 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/10 hover:border-[#0047FF]/20')
            }
        >
            <div className="absolute inset-x-0 top-0 h-32 rounded-t-[3rem] bg-gradient-to-b from-slate-50 dark:from-slate-800 to-transparent pointer-events-none opacity-50" />

            <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                    {plan.badges?.map((badge) => (
                        <span
                            key={`${plan.id}-${badge.label}`}
                            className={
                                'inline-flex items-center rounded-xl px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] italic ' +
                                badgeClass(badge.variant)
                            }
                        >
                            {badge.label}
                        </span>
                    ))}

                    {savingsPercent !== null && (
                        <span className="inline-flex items-center rounded-xl bg-[#0047FF]/5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/10 italic">
                            SAVE {savingsPercent}%
                        </span>
                    )}
                </div>

                <div className="mt-10">
                    <h3 className="text-[11px] font-black tracking-[0.3em] text-[#0047FF] uppercase italic">{plan.name}</h3>
                    <p className="mt-2 text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{plan.tagline}</p>
                    {plan.marketingLine ? (
                        <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            {plan.marketingLine}
                        </p>
                    ) : null}

                    <div className="mt-10 flex items-end gap-3">
                        {isFree ? (
                            <span className="text-5xl font-black tracking-tighter text-slate-950 dark:text-white leading-none">
                                Бесплатно
                            </span>
                        ) : (
                            <>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-6xl font-black tracking-tighter text-slate-950 dark:text-white italic tabular-nums leading-none">
                                        {formatNumber(plan.price)}
                                    </span>
                                    <span className="text-2xl font-black tracking-tighter text-[#0047FF] uppercase italic">{plan.currencySymbol}</span>
                                </div>

                                <span className="pb-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">{plan.periodLabel}</span>
                            </>
                        )}
                    </div>

                    {plan.oldPrice ? (
                        <div className="mt-4 flex items-center gap-3">
                            <span className="text-lg font-black text-slate-300 dark:text-slate-600 line-through italic tabular-nums">
                                {formatNumber(plan.oldPrice)}{plan.currencySymbol}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20 italic">
                                LIMITED OFFER
                            </span>
                        </div>
                    ) : null}
                </div>

                <div className="mt-12 space-y-6">
                    {plan.features.map((feature) => (
                        <div key={`${plan.id}-${feature}`} className="flex items-start gap-5 group/feature">
                            <span
                                className={
                                    'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-xl transition-colors ' +
                                    (plan.highlight ? 'bg-[#0047FF]/10 text-[#0047FF]' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover/feature:bg-[#0047FF]/10 group-hover/feature:text-[#0047FF]')
                                }
                            >
                                <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                            </span>
                            <span className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest group-hover/feature:text-slate-900 dark:group-hover/feature:text-white transition-colors">{feature}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-12">
                    <Link
                        to={plan.cta.to}
                        className={
                            'group inline-flex w-full h-16 items-center justify-center rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all active:scale-[0.98] italic ' +
                            (plan.highlight
                                ? 'bg-[#0047FF] text-white shadow-2xl shadow-[#0047FF]/20 hover:bg-[#0039cc] hover:shadow-[#0047FF]/30'
                                : 'bg-slate-950 dark:bg-slate-800 text-white shadow-xl shadow-black/10 hover:bg-black dark:hover:bg-slate-700')
                        }
                    >
                        {plan.cta.label}
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
