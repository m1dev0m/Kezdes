import { motion } from 'framer-motion';
import { PRICING_PLANS } from './pricing/pricingPlans';
import { PricingCard } from './pricing/PricingCard';
import { PublicHeader } from '@/components/public/PublicHeader';
import { Zap, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Pricing() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-[#1d4ed8]/10 overflow-x-hidden">
            <PublicHeader active="pricing" />

            {/* Hero Section */}
            <section className="pt-48 pb-24 px-10 text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#1d4ed8]/5 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="max-w-4xl mx-auto relative z-10 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[#1d4ed8]/5 text-[#1d4ed8] text-[11px] font-bold uppercase tracking-widest mb-4 shadow-sm border border-[#1d4ed8]/10"
                    >
                        <Zap size={14} fill="currentColor" /> Доступен 14-дневный тестовый период
                    </motion.div>

                    <h1 className="text-6xl md:text-7xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                        Решения для <span className="text-[#1d4ed8]">лидеров</span> индустрии.
                    </h1>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                        Универсальная платформа для управления резервами и гостевым сервисом. Создана для ресторанов, которые ценят эффективность и премиальный сервис.
                    </p>

                    <div className="pt-8 flex flex-wrap items-center justify-center gap-4">
                        <Badge label="14 дней бесплатно" icon={CheckCircle2} />
                        <Badge label="Экономия до 35%" accent icon={Zap} />
                        <Badge label="Enterprise поддержка" icon={Shield} />
                    </div>
                </div>
            </section>

            {/* Plans Grid */}
            <section className="pb-40 px-10 relative z-10">
                <div className="max-w-[1440px] mx-auto">
                    <div className="grid gap-8 lg:grid-cols-3 items-stretch max-w-7xl mx-auto">
                        {PRICING_PLANS.map((plan, i) => (
                            <div key={plan.id} className={plan.highlight ? 'lg:-mt-4' : ''}>
                                <PricingCard plan={plan} index={i} />
                            </div>
                        ))}
                    </div>

                    {/* Trust Banner */}
                    <div className="mt-40 text-center space-y-16">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Нам доверяют лучшие в индустрии</p>
                        <div className="flex flex-wrap items-center justify-center gap-16 md:gap-32 grayscale opacity-30 transition-all hover:grayscale-0 hover:opacity-100">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">HILTON</span>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">MARRIOTT</span>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">HYATT</span>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">ACCOR</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Enterprise CTA */}
            <section className="bg-slate-900 py-32 px-10 relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-[#1d4ed8]/10 blur-[150px] rounded-full pointer-events-none"></div>

                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-16 relative z-10 text-center md:text-left">
                    <div className="space-y-6">
                        <h2 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight">Индивидуальные решения <br />для крупных сетей.</h2>
                        <p className="text-slate-400 text-xl font-medium max-w-2xl leading-relaxed">
                            Специальные условия для гостиничных групп, White-label интерфейсы и глубокая интеграция с ERP-системами.
                        </p>
                    </div>
                    <Button variant="white" size="xl" rightIcon={<ArrowRight size={20} />}>
                        Связаться с Enterprise
                    </Button>
                </div>
            </section>

            <footer className="bg-white dark:bg-slate-950 py-24 px-10 border-t border-slate-100 dark:border-slate-900">
                <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-20 mb-24">
                    <div className="md:col-span-4 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="size-11 rounded-xl bg-[#1d4ed8] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-[#1d4ed8]/20">K</div>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">Kezdes</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed max-w-sm">
                            Премиальная CRM-архитектура для современных ресторанов и гостиничных групп. Разработано для совершенства.
                        </p>
                    </div>

                    <div className="md:col-span-2 space-y-10">
                        <h4 className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Продукт</h4>
                        <ul className="space-y-5 text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                            <li><a href="#" className="hover:text-[#1d4ed8] transition-all">Возможности</a></li>
                            <li><a href="#" className="hover:text-[#1d4ed8] transition-all">Тарифы</a></li>
                            <li><a href="#" className="hover:text-[#1d4ed8] transition-all">Демо</a></li>
                            <li><a href="#" className="hover:text-[#1d4ed8] transition-all">Интеграции</a></li>
                        </ul>
                    </div>

                    <div className="md:col-span-2 space-y-10">
                        <h4 className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Компания</h4>
                        <ul className="space-y-5 text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                            <li><a href="#" className="hover:text-[#1d4ed8] transition-all">О нас</a></li>
                            <li><a href="#" className="hover:text-[#1d4ed8] transition-all">Новости</a></li>
                            <li><a href="#" className="hover:text-[#1d4ed8] transition-all">Карьера</a></li>
                            <li><a href="#" className="hover:text-[#1d4ed8] transition-all">Контакты</a></li>
                        </ul>
                    </div>

                    <div className="md:col-span-4 space-y-8">
                        <h4 className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">Рассылка</h4>
                        <p className="text-slate-500 text-sm font-medium">Получайте актуальные инсайты индустрии гостеприимства.</p>
                        <div className="flex gap-2">
                            <input type="email" placeholder="Email адрес" className="h-14 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 text-[13px] font-medium w-full outline-none focus:ring-4 focus:ring-[#1d4ed8]/5 focus:border-[#1d4ed8] transition-all placeholder:text-slate-400" />
                            <Button size="lg">Ок</Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1440px] mx-auto border-t border-slate-100 dark:border-slate-900 pt-12 flex flex-col sm:flex-row items-center justify-between gap-8 opacity-60">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        © 2026 KEZDES OPERATIONAL SYSTEMS. ВСЕ ПРАВА ЗАЩИЩЕНЫ.
                    </p>
                    <div className="flex gap-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <a href="#" className="hover:text-[#1d4ed8] transition-all">Приватность</a>
                        <a href="#" className="hover:text-[#1d4ed8] transition-all">Условия</a>
                        <a href="#" className="hover:text-[#1d4ed8] transition-all">Поддержка</a>
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

