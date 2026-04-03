import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PRICING_PLANS } from './pricing/pricingPlans';
import { PricingCard } from './pricing/PricingCard';
import { PublicHeader } from '@/components/public/PublicHeader';
import { Zap, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Pricing() {
    const plans = PRICING_PLANS.filter((plan) => plan.id === 'pro' || plan.id === 'business');

    if (plans.length !== 2) {
        return null;
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-[#1d4ed8]/10 overflow-x-hidden">
            <PublicHeader active="pricing" />

            <section className="pt-44 pb-18 px-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#1d4ed8]/5 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="max-w-4xl mx-auto relative z-10 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[#1d4ed8]/5 text-[#1d4ed8] text-[11px] font-bold uppercase tracking-widest mb-4 shadow-sm border border-[#1d4ed8]/10"
                    >
                        <Zap size={14} fill="currentColor" /> Доступен 14-дневный тестовый период
                    </motion.div>

                    <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.08]">
                        Два тарифа:
                        <span className="block text-[#1d4ed8]">Plus и Kezdes Pro</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                        Базовый тариф Plus подходит для ежедневной работы ресторана.
                        Kezdes Pro — следующий уровень для роста, команды и нескольких локаций.
                    </p>

                    <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                        <Badge label="2 тарифа" accent icon={Shield} />
                        <Badge label="Plus — 17 000 ₸" icon={CheckCircle2} />
                        <Badge label="14 дней бесплатно" icon={Zap} />
                    </div>
                </div>
            </section>

            <section className="px-6 pb-24 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center space-y-4">
                        <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                            Тарифы Kezdes
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Выберите формат работы</h2>
                        <p className="mx-auto max-w-2xl text-base leading-7 text-slate-600">
                            Plus — для быстрого старта. Kezdes Pro — для расширенной операционной модели.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-8 lg:grid-cols-2 items-stretch">
                        {plans.map((plan, index) => (
                            <PricingCard key={plan.id} plan={plan} index={index} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-6 py-20">
                <div className="mx-auto flex max-w-4xl flex-col items-center rounded-[2rem] border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">Нужен запуск для сети или нескольких локаций?</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                        Начните с Plus, а когда потребуется расширенный контур, переходите на Kezdes Pro.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <Link to="/register?mode=restaurant">
                            <Button size="lg">Подключить ресторан</Button>
                        </Link>
                        <Link to="/restaurants">
                            <Button variant="outline" size="lg">Посмотреть заведения</Button>
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="bg-white dark:bg-slate-950 py-20 px-6 border-t border-slate-100 dark:border-slate-900">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
                    <div className="md:col-span-5 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="size-11 rounded-xl bg-[#1d4ed8] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-[#1d4ed8]/20">K</div>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">Kezdes</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-base font-medium leading-relaxed max-w-md">
                            На странице оставлены только 2 тарифа: Plus и Kezdes Pro.
                        </p>
                    </div>

                    <div className="md:col-span-3 space-y-6">
                        <h4 className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Разделы</h4>
                        <ul className="space-y-4 text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                            <li><Link to="/" className="hover:text-[#1d4ed8] transition-all">Главная</Link></li>
                            <li><Link to="/restaurants" className="hover:text-[#1d4ed8] transition-all">Рестораны</Link></li>
                            <li><Link to="/pricing" className="hover:text-[#1d4ed8] transition-all">Цены</Link></li>
                        </ul>
                    </div>

                    <div className="md:col-span-4 space-y-6">
                        <h4 className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Старт</h4>
                        <ul className="space-y-4 text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                            <li><Link to="/register?mode=restaurant" className="hover:text-[#1d4ed8] transition-all">Подключить ресторан</Link></li>
                            <li><Link to="/register" className="hover:text-[#1d4ed8] transition-all">Регистрация пользователя</Link></li>
                            <li><Link to="/login" className="hover:text-[#1d4ed8] transition-all">Войти</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto border-t border-slate-100 dark:border-slate-900 pt-10 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-60">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        © 2026 KEZDES OPERATIONAL SYSTEMS. ВСЕ ПРАВА ЗАЩИЩЕНЫ.
                    </p>
                    <div className="flex gap-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Link to="/pricing" className="hover:text-[#1d4ed8] transition-all">Тарифы</Link>
                        <Link to="/restaurants" className="hover:text-[#1d4ed8] transition-all">Рестораны</Link>
                        <Link to="/login" className="hover:text-[#1d4ed8] transition-all">Вход</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function Badge({ label, accent, icon: Icon }: { label: string; accent?: boolean; icon: any }) {
    return (
        <span className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm ${accent
            ? 'border border-[#1d4ed8]/20 bg-[#1d4ed8]/5 text-[#1d4ed8]'
            : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400'
            }`}>
            <Icon size={14} className={accent ? 'text-[#1d4ed8]' : 'text-slate-400'} />
            {label}
        </span>
    );
}
