import { CreditCard, Zap, Check, ShieldCheck, ArrowRight, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';

export default function Billing() {
    const { t } = useI18n();

    const plans = [
        {
            name: 'Basic',
            price: 'Free',
            desc: 'Essential for small coffee shops',
            features: ['Up to 10 tables', '50 bookings/mo', 'Basic analytics', 'SMS notifications'],
            current: true,
            color: 'bg-slate-50 border-slate-200'
        },
        {
            name: 'Pro',
            price: '₸15,000',
            period: '/mo',
            desc: 'Perfect for growing restaurants',
            features: ['Unlimited tables', 'Unlimited bookings', 'Advanced analytics', 'Visual map editor', 'Staff management', 'Multi-device support'],
            current: false,
            recommended: true,
            color: 'bg-primary/5 border-indigo-100 ring-2 ring-primary ring-offset-2'
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            desc: 'For restaurant chains & hotels',
            features: ['Multi-restaurant control', 'Custom integration', 'Priority support', 'White-labeling', 'API Access', 'On-premise option'],
            current: false,
            color: 'bg-slate-900 border-slate-900 text-white'
        }
    ];

    return (
        <div className="space-y-12 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t('billing.title', { defaultValue: 'Billing & Plans' })}</h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px]">{t('billing.subtitle', { defaultValue: 'Manage your subscription and usage' })}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 -z-10"></div>
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                    <ShieldCheck size={20} />
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Subscription</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Basic Starter Plan</h2>
                            <p className="text-slate-500 text-sm mb-6">Your current plan includes all core features to get started.</p>
                            <div className="flex items-center gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usage</p>
                                    <p className="text-lg font-black text-slate-900">12 / 50 Bookings</p>
                                </div>
                                <div className="w-px h-8 bg-slate-100"></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Renewal</p>
                                    <p className="text-lg font-black text-slate-900">Apr 12, 2026</p>
                                </div>
                            </div>
                        </div>
                        <Button variant="primary" className="shadow-lg shadow-primary/20">Upgrade Now <ArrowRight size={16} className="ml-2" /></Button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <CreditCard className="text-slate-400" />
                        <h3 className="text-lg font-black text-slate-900">Payment Method</h3>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-8 bg-white border border-slate-100 rounded flex items-center justify-center font-bold text-[8px] text-slate-400">VISA</div>
                            <span className="text-slate-400 text-xs font-bold">**** 4422</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expires 12/28</p>
                    </div>
                    <Button variant="secondary" className="w-full mt-6">Edit Method</Button>
                </div>
            </div>

            <div className="space-y-8">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Select a Plan</h2>
                    <p className="text-slate-500 text-sm">Choose the best plan for your venue size and business goals.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, i) => (
                        <div key={i} className={`${plan.color} border rounded-[2.5rem] p-10 flex flex-col relative`}>
                            {plan.recommended && (
                                <div className="absolute top-0 right-10 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-primary/20">Recommended</div>
                            )}
                            <div className="mb-8">
                                <h3 className="text-xl font-black tracking-tight mb-1">{plan.name}</h3>
                                <p className={`text-xs font-medium ${plan.name === 'Enterprise' ? 'text-white/60' : 'text-slate-500'}`}>{plan.desc}</p>
                            </div>
                            <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black tracking-tighter">{plan.price}</span>
                                    {plan.period && <span className={`text-sm font-bold ${plan.name === 'Enterprise' ? 'text-white/60' : 'text-slate-400'}`}>{plan.period}</span>}
                                </div>
                            </div>
                            <div className="space-y-4 flex-1 mb-10">
                                {plan.features.map((f, j) => (
                                    <div key={j} className="flex items-start gap-3">
                                        <div className={`mt-0.5 ${plan.name === 'Enterprise' ? 'text-primary' : 'text-emerald-500'}`}><Check size={14} /></div>
                                        <span className={`text-sm font-bold ${plan.name === 'Enterprise' ? 'text-white/80' : 'text-slate-600'}`}>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <Button variant={plan.current ? 'secondary' : plan.name === 'Enterprise' ? 'secondary' : 'primary'} className="w-full" disabled={plan.current}>
                                {plan.current ? 'Current Plan' : plan.name === 'Enterprise' ? 'Contact Sales' : 'Switch Plan'}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <History className="text-slate-400" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Invoices</h3>
                    </div>
                </div>
                <div className="space-y-2">
                    {[
                        { id: '#INV-2024-001', date: 'Mar 12, 2026', amount: '₸15,000', status: 'Paid' },
                        { id: '#INV-2024-002', date: 'Feb 12, 2026', amount: '₸15,000', status: 'Paid' },
                    ].map((inv, i) => (
                        <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500"><Zap size={16} /></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{inv.id}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{inv.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className="text-sm font-black text-slate-900 dark:text-white">{inv.amount}</span>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">{inv.status}</span>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">Download</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
