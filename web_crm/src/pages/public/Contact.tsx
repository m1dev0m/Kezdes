import { useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { PublicHeader } from '@/components/public/PublicHeader';
import {
    User,
    Phone,
    MapPin,
    Building2,
    Send,
    Sparkles,
    Database
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
            toast.error('Имя и контактные данные обязательны');
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
                source: 'production_contact',
            });
            toast.success('Заявка принята. Наша команда свяжется с вами в ближайшее время.');
            setForm({ name: '', phone: '', city: '', restaurants_count: '1', comment: '' });
        } catch (err: any) {
            const detail = err?.response?.data?.detail || 'Ошибка отправки. Пожалуйста, попробуйте позже.';
            toast.error(detail);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafaf9] dark:bg-slate-950 font-sans selection:bg-[#1d4ed8]/10 overflow-x-hidden">
            <PublicHeader active="contact" />

            <main className="pt-48 pb-32 px-10">
                <div className="max-w-7xl mx-auto grid gap-20 lg:grid-cols-[1.2fr,0.8fr] items-start">
                    {}
                    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 p-12 md:p-20 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-12">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#1d4ed8]/5 text-[#1d4ed8] px-5 py-2 text-[11px] font-bold uppercase tracking-widest border border-[#1d4ed8]/10">
                                <Sparkles size={14} /> Активация системы
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                                Начните работу <br /><span className="text-[#1d4ed8]">с Kezdes</span> уже сегодня.
                            </h1>
                            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
                                Оставьте ваши контактные данные, чтобы получить доступ к демонстрации платформы и обсудить детали внедрения.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="grid gap-8 md:grid-cols-2">
                                <Input
                                    label="Ваше имя"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    leftIcon={<User size={18} />}
                                    placeholder="Иван Иванов"
                                    required
                                />
                                <Input
                                    label="Номер телефона"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    leftIcon={<Phone size={18} />}
                                    placeholder="+7 000 000-00-00"
                                    required
                                />
                            </div>

                            <div className="grid gap-8 md:grid-cols-2">
                                <Input
                                    label="Город"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    leftIcon={<MapPin size={18} />}
                                    placeholder="Алматы"
                                />
                                <Input
                                    label="Количество заведений"
                                    name="restaurants_count"
                                    value={form.restaurants_count}
                                    onChange={handleChange}
                                    leftIcon={<Building2 size={18} />}
                                    type="number"
                                    placeholder="1"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Комментарий к заявке</label>
                                <textarea
                                    name="comment"
                                    value={form.comment}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Расскажите немного о вашем проекте или задайте интересующие вопросы..."
                                    className="w-full bg-[#fafaf9] dark:bg-slate-800 border border-slate-200 dark:border-slate-800 focus:border-[#1d4ed8] focus:bg-white rounded-[1.5rem] p-6 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all resize-none placeholder:text-slate-400 leading-relaxed focus:ring-4 focus:ring-blue-50/50"
                                />
                            </div>

                            <Button
                                type="submit"
                                isLoading={submitting}
                                size="xl"
                                className="w-full"
                                rightIcon={<Send size={18} />}
                            >
                                Отправить заявку
                            </Button>

                            <p className="text-[10px] font-semibold text-slate-400 text-center uppercase tracking-widest leading-loose">
                                Нажимая на кнопку, вы соглашаетесь с условиями обработки персональных данных.
                            </p>
                        </form>
                    </section>

                    {}
                    <aside className="space-y-10 lg:sticky lg:top-48">
                        <section className="bg-slate-900 text-white rounded-[2.5rem] p-12 space-y-10 shadow-2xl shadow-black/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 size-64 bg-[#1d4ed8]/20 rounded-full blur-[80px] -mr-32 -mt-32" />
                            <div className="relative z-10 space-y-4">
                                <p className="text-[11px] font-bold tracking-[0.3em] text-[#1d4ed8] uppercase">Процесс внедрения</p>
                                <h3 className="text-3xl font-bold tracking-tight">Как мы работаем</h3>
                            </div>
                            <ol className="relative z-10 space-y-8">
                                <ProtocolStep index={1} text="Стратегическая сессия: Анализ вашего бизнеса и определение целей." />
                                <ProtocolStep index={2} text="Настройка архитектуры: Масштабирование зон, столов и логики под ключ." />
                                <ProtocolStep index={3} text="Запуск пилота: 14 дней активного тестирования с ежедневной поддержкой." />
                                <ProtocolStep index={4} text="Масштабирование: Анализ результатов и переход на постоянную основу." />
                            </ol>
                        </section>

                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 p-10 space-y-5 shadow-sm group hover:border-[#1d4ed8]/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-xl bg-[#1d4ed8]/5 flex items-center justify-center text-[#1d4ed8]">
                                    <Database size={24} />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white">Помощь с переездом</p>
                            </div>
                            <p className="text-[15px] font-medium text-slate-500 leading-relaxed">
                                Используете другую систему? Наши инженеры помогут перенести все данные о гостях, столах и истории бронирований без потерь.
                            </p>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}

function ProtocolStep({ index, text }: { index: number; text: string }) {
    return (
        <li className="flex items-start gap-6 group">
            <span className="size-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-[12px] font-bold group-hover:bg-[#1d4ed8] transition-all tabular-nums">{index}</span>
            <p className="text-[15px] font-medium text-white/70 group-hover:text-white transition-colors leading-relaxed pt-1.5">{text}</p>
        </li>
    );
}

