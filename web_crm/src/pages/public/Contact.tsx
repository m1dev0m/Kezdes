import { useState } from 'react';
import { Phone, Building2, MapPin, User, Loader2 } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { PublicHeader } from '@/components/public/PublicHeader';

export default function Contact() {
    const [form, setForm] = useState({
        name: '',
        phone: '',
        city: '',
        restaurants_count: '1',
        comment: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.phone.trim()) {
            toast.error('Укажите имя и телефон');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/crm/leads/', {
                name: form.name.trim(),
                phone: form.phone.trim(),
                city: form.city.trim(),
                restaurants_count: Number(form.restaurants_count || '1') || 1,
                comment: form.comment.trim(),
                source: 'pricing_contact',
            });
            toast.success('Заявка отправлена, мы свяжемся с вами в ближайшее время.');
            setForm({ name: '', phone: '', city: '', restaurants_count: '1', comment: '' });
        } catch (err: any) {
            const detail = err?.response?.data?.detail || 'Не удалось отправить заявку. Попробуйте ещё раз.';
            toast.error(detail);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-primary/20 overflow-x-hidden">
            <PublicHeader active="contact" />

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-5xl mx-auto grid gap-12 lg:grid-cols-[1.1fr,0.9fr] items-start">
                    <section className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 p-8 sm:p-10">
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
                            Давайте запустим пилот в вашем ресторане
                        </h1>
                        <p className="text-slate-500 text-sm sm:text-base font-medium mb-8">
                            Оставьте контакты, и мы свяжемся с вами, чтобы обсудить подключение Kezdes и условия пилота.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                                    Имя
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Как к вам обращаться"
                                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                                    Телефон
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="+7 ___ ___-__-__"
                                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                                        Город
                                    </label>
                                    <div className="relative">
                                        <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input
                                            name="city"
                                            value={form.city}
                                            onChange={handleChange}
                                            placeholder="Алматы"
                                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                                        Кол-во ресторанов
                                    </label>
                                    <div className="relative">
                                        <Building2 className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input
                                            name="restaurants_count"
                                            value={form.restaurants_count}
                                            onChange={handleChange}
                                            type="number"
                                            min={1}
                                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                                    Комментарий
                                </label>
                                <textarea
                                    name="comment"
                                    value={form.comment}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Коротко опишите формат вашего заведения и удобное время созвона."
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full mt-4 bg-brand-dark text-white text-xs font-black uppercase tracking-[0.25em] py-4 rounded-2xl shadow-xl shadow-brand-dark/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60"
                            >
                                {submitting ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Отправляем...
                                    </span>
                                ) : (
                                    'Отправить заявку'
                                )}
                            </button>

                            <p className="text-[10px] font-medium text-slate-400 mt-3">
                                Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.
                            </p>
                        </form>
                    </section>

                    <aside className="space-y-6">
                        <div className="bg-slate-900 text-white rounded-[2.5rem] p-8">
                            <p className="text-[10px] font-black tracking-[0.25em] text-slate-400 uppercase mb-4">
                                Как проходит пилот
                            </p>
                            <ul className="space-y-4 text-sm leading-relaxed">
                                <li>1. 20‑минутный созвон, чтобы понять формат заведения и задачи.</li>
                                <li>2. Настройка ресторана, столов и меню по чек‑листу.</li>
                                <li>3. 7‑дневный пилот с ежедневной сводкой по загрузке и no‑show.</li>
                                <li>4. Совместный разбор результатов и решение по масштабированию.</li>
                            </ul>
                        </div>
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 text-sm text-slate-600">
                            <p className="font-bold mb-2">Уже используете другую систему?</p>
                            <p className="mb-2">
                                Мы поможем аккуратно перенести ключевые настройки (слоты, зоны, базу гостей) и настроить мягкий переход для команды.
                            </p>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}

