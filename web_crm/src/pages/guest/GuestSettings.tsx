import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/auth/logic/AuthContext';

export default function GuestSettings() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState({
        email: true,
        sms: true,
        bookingReminders: true,
        promotions: false
    });
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        bio: '',
        language: 'ru',
        cuisine: ['Европейская', 'Азиатская']
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            toast.success('Настройки успешно обновлены');
        } catch (err) {
            toast.error('Не удалось обновить настройки');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-[1280px] px-6 py-8 space-y-12 pb-24">
            {/* Header */}
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl">
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">Управление аккаунтом</div>
                    <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 leading-none">Настройки профиля</h1>
                    <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                        Персонализируйте свой опыт посещения ресторанов, управляйте уведомлениями и безопасностью вашего аккаунта.
                    </p>
                </div>
            </header>

            <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
                <div className="space-y-12">
                    {/* Personal Info */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">Личные данные</h2>
                        </div>

                        <div className="grid gap-6 rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Имя</label>
                                    <input
                                        type="text"
                                        value={profile.firstName}
                                        onChange={(e) => setProfile(p => ({ ...p, firstName: e.target.value }))}
                                        placeholder="Александр"
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:border-[#1d4ed8] focus:bg-white focus:outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Фамилия</label>
                                    <input
                                        type="text"
                                        value={profile.lastName}
                                        onChange={(e) => setProfile(p => ({ ...p, lastName: e.target.value }))}
                                        placeholder="Казахстан"
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:border-[#1d4ed8] focus:bg-white focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">О себе</label>
                                <textarea
                                    rows={3}
                                    value={profile.bio}
                                    onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                                    placeholder="Расскажите о своих гастрономических предпочтениях..."
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold focus:border-[#1d4ed8] focus:bg-white focus:outline-none transition-all resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Verification */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
                                <span className="material-symbols-outlined text-[20px]">verified_user</span>
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">Безопасность и связь</h2>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="p-6 flex items-center justify-between border-b border-slate-100">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                                    <p className="text-sm font-bold text-slate-900 mt-1">{user?.email}</p>
                                </div>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest">Подтверждено</span>
                            </div>
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Телефон</p>
                                    <p className="text-sm font-bold text-slate-900 mt-1">{(user as any)?.phone || 'Не привязан'}</p>
                                </div>
                                <button className="text-xs font-bold text-[#1d4ed8] uppercase tracking-widest hover:underline">Добавить</button>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-10">
                    <section className="space-y-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Уведомления</h3>
                        <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            {[
                                { key: 'bookingReminders', label: 'Бронирования', desc: 'Напоминания о визитах' },
                                { key: 'promotions', label: 'Акции', desc: 'Скидки и спецпредложения' },
                                { key: 'email', label: 'Сообщения', desc: 'Прямая связь с заведением' },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 leading-none">{item.label}</div>
                                        <div className="text-[10px] text-slate-500 mt-1.5 font-medium">{item.desc}</div>
                                    </div>
                                    <Switch
                                        checked={notifications[item.key as keyof typeof notifications]}
                                        onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Язык интерфейса</h3>
                        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <select
                                value={profile.language}
                                onChange={(e) => setProfile(p => ({ ...p, language: e.target.value }))}
                                className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:border-[#1d4ed8] focus:bg-white outline-none"
                            >
                                <option value="ru">Русский (RU)</option>
                                <option value="kz">Қазақша (KZ)</option>
                                <option value="en">English (US)</option>
                            </select>
                        </div>
                    </section>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full h-14 bg-[#1d4ed8] text-white rounded-2xl font-bold transition-all hover:bg-[#1e40af] shadow-2xl shadow-blue-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                    >
                        {loading ? <span className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[20px]">save</span>}
                        {loading ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>

                    <div className="pt-4 text-center">
                        <button className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] hover:text-rose-700 transition-colors">Удалить аккаунт</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`w-12 h-6 rounded-full transition-all relative inline-block ${checked ? 'bg-[#1d4ed8] shadow-[0_0_8px_rgba(29,78,216,0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`}
        >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[26px]' : 'translate-x-[2px]'}`} />
        </button>
    );
}
