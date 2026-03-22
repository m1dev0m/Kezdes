import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { PRICING_PLANS } from './pricing/pricingPlans';
import { PricingCard } from './pricing/PricingCard';
import { PublicHeader } from '@/components/public/PublicHeader';

export default function Pricing() {

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-primary/20 overflow-x-hidden">
            <PublicHeader active="pricing" />

             <section className="pt-48 pb-16 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-30"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-sm border border-primary/5"
                    >
                        <Zap size={14} className="fill-primary" /> 14 ДНЕЙ БЕСПЛАТНО
                    </motion.div>

                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-8">
                        Простые и честные цены для ресторанов
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-3xl mx-auto">
                        Управляйте бронированием, гостями и загрузкой ресторана в одной системе
                    </p>
 
                     <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                         <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 shadow-sm">
                             14 дней бесплатно
                         </span>
                         <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary shadow-sm">
                             Экономия до 35%
                         </span>
                         <span className="inline-flex items-center rounded-full border border-emerald-500/15 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 shadow-sm">
                             Выгодная цена
                         </span>
                     </div>
                </div>
            </section>

            <section className="pb-40 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="grid gap-6 lg:grid-cols-3 lg:gap-8 items-stretch max-w-4xl mx-auto">
                        {PRICING_PLANS.map((plan, i) => (
                            <div key={plan.id} className={plan.highlight ? 'lg:-mt-3' : ''}>
                                <PricingCard plan={plan} index={i} />
                            </div>
                        ))}
                    </div>

                    <div className="mt-24 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">ДОВЕРЯЮТ ЛИДЕРЫ ИНДУСТРИИ</p>
                        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-20 grayscale opacity-40">
                            <span className="text-xl font-black text-slate-900 tracking-tighter">HILTON</span>
                            <span className="text-xl font-black text-slate-900 tracking-tighter">MARRIOTT</span>
                            <span className="text-xl font-black text-slate-900 tracking-tighter">HYATT</span>
                            <span className="text-xl font-black text-slate-900 tracking-tighter">ACCOR</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-brand-dark py-32 px-6 relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                    <div className="text-left">
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-6 leading-none">Нужно кастомное<br />решение?</h2>
                        <p className="text-white/50 text-lg font-medium max-w-lg">Мы предлагаем индивидуальные развертывания для глобальных гостиничных групп, включая white-label приложения и кастомные ERP-интеграции.</p>
                    </div>
                    <Link to="/contact" className="bg-white text-brand-dark font-black px-12 py-6 rounded-2xl shadow-2xl hover:scale-105 transition-all text-xs uppercase tracking-widest shrink-0">
                        Связаться с Enterprise
                    </Link>
                </div>
            </section>

            <footer className="bg-white py-24 px-6 border-t border-slate-100 overflow-hidden relative">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 mb-24 relative z-10">
                    <div className="md:col-span-4">
                        <div className="flex items-center gap-3 mb-10">
                            <span className="text-2xl font-black tracking-tighter"><Logo /></span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm">
                            Премиальная CRM-архитектура для выдающихся ресторанов и мировых гостиничных групп. Создано для совершенства.
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <h4 className="text-[10px] font-black tracking-[0.3em] text-slate-900 mb-8 uppercase">Продукт</h4>
                        <ul className="space-y-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <li><Link to="/#features" className="hover:text-primary transition-all">Возможности</Link></li>
                            <li><Link to="/pricing" className="hover:text-primary transition-all">Цены</Link></li>
                            <li><Link to="/discover" className="hover:text-primary transition-all">Направления</Link></li>
                            <li><a href="#" className="hover:text-primary transition-all">Планы</a></li>
                        </ul>
                    </div>

                    <div className="md:col-span-2">
                        <h4 className="text-[10px] font-black tracking-[0.3em] text-slate-900 mb-8 uppercase">Компания</h4>
                        <ul className="space-y-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <li><a href="#" className="hover:text-primary transition-all">О нас</a></li>
                            <li><a href="#" className="hover:text-primary transition-all">Пресса</a></li>
                            <li><a href="#" className="hover:text-primary transition-all">Карьера</a></li>
                            <li><a href="#" className="hover:text-primary transition-all">Контакты</a></li>
                        </ul>
                    </div>

                    <div className="md:col-span-4">
                        <h4 className="text-[10px] font-black tracking-[0.3em] text-slate-900 mb-8 uppercase">Рассылка</h4>
                        <p className="text-slate-500 text-xs font-medium mb-6">Получайте кураторские идеи о современном гостеприимстве.</p>
                        <div className="flex gap-2">
                            <input type="email" placeholder="Email адрес" className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-medium w-full outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300" />
                            <button className="bg-brand-dark text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-dark/10">Подписаться</button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto border-t border-slate-100 pt-10 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-60">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span>© 2026</span>
                        <span className="inline-flex items-center"><Logo className="h-4" /></span>
                        <span>SAAS. ВСЕ ПРАВА ЗАЩИЩЕНЫ.</span>
                    </p>
                    <div className="flex gap-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <a href="#" className="hover:text-primary transition-all">Приватность</a>
                        <a href="#" className="hover:text-primary transition-all">Условия</a>
                        <a href="#" className="hover:text-primary transition-all">Куки</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
