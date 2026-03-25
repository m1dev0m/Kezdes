import { useState, useEffect, useCallback } from 'react';
import {
    User,
    Store,
    Bell,
    Shield,
    CreditCard,
    Save,
    Camera,
    Mail,
    MapPin,
    Clock,
    Lock,
    Phone,
    Users,
    FileText,
    Hash,
    Timer,
    Banknote,
    Bot,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n';

export default function Settings() {
    const { t } = useI18n();
    const { user } = useAuth();
    const [tab, setTab] = useState('restaurant');
    const [loading, setLoading] = useState(false);
    interface RestaurantSettings {
        id: number;
        name?: string;
        description?: string;
        address?: string;
        phone?: string;
        email?: string;
        photo_url?: string;
        opening_time?: string;
        closing_time?: string;
        total_tables?: number;
        total_capacity?: number;
        slot_duration_minutes?: number;
        deposit_min_guests?: number | null;
        deposit_amount_per_guest?: number | null;
        bot_token?: string | null;
        bot_configured?: boolean;
    }
    const [restaurant, setRestaurant] = useState<RestaurantSettings | null>(null);
    const [loadingData, setLoadingData] = useState(false);

    const loadRestaurant = useCallback(async () => {
        setLoadingData(true);
        try {
            const res = await api.get('/restaurants/me/');
            setRestaurant(res.data);
        } catch {
            toast.error(t('settings.failedToLoad'));
        } finally {
            setLoadingData(false);
        }
    }, [t]);

    useEffect(() => {
        if (tab === 'restaurant') {
            loadRestaurant();
        }
    }, [tab, loadRestaurant]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (tab === 'restaurant' && restaurant) {
                await api.patch('/restaurants/me/', {
                    name: restaurant.name,
                    description: restaurant.description,
                    address: restaurant.address,
                    phone: restaurant.phone,
                    email: restaurant.email,
                    opening_time: restaurant.opening_time,
                    closing_time: restaurant.closing_time,
                    total_tables: restaurant.total_tables,
                    total_capacity: restaurant.total_capacity,
                    slot_duration_minutes: restaurant.slot_duration_minutes,
                    deposit_min_guests: restaurant.deposit_min_guests,
                    deposit_amount_per_guest: restaurant.deposit_amount_per_guest,
                });                toast.success(t('settings.restaurantSaved'));
            } else if (tab === 'profile') {
                toast.success(t('settings.profileSaved'));
            }
        } catch {
            toast.error(t('settings.failedToSave'));
        } finally {
            setLoading(false);
        }
    };

    const update = <K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) => {
        setRestaurant((r) => (r ? { ...r, [key]: value } : r));
    };

    const tabs = [
        { id: 'restaurant', label: t('settings.restaurantTitle'), icon: Store },
        { id: 'telegram',   label: 'Telegram Bot',               icon: Bot },
        { id: 'profile',    label: t('settings.myProfile'),       icon: User },
        { id: 'notifications', label: t('settings.notifications'), icon: Bell },
        { id: 'security',   label: t('settings.security'),        icon: Shield },
        { id: 'billing',    label: t('settings.billing'),         icon: CreditCard },
    ];

    const inputCls = "w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm transition-all focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-sm text-slate-900";
    const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('settings.title')}</h1>
                <p className="text-sm text-slate-500 mt-1">{t('settings.description')}</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-64 shrink-0 space-y-1">
                    {tabs.map((tItem) => (
                        <button
                            key={tItem.id}
                            onClick={() => setTab(tItem.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-150 active:scale-[0.98] group ${tab === tItem.id
                                    ? 'bg-slate-100 text-slate-900 font-semibold'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                }`}
                        >
                            <tItem.icon size={18} className={tab === tItem.id ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
                            {tItem.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-10">
                    <form onSubmit={handleSave} className="space-y-12">
                        {tab === 'restaurant' && (
                            loadingData ? (
                                <Skeleton className="h-64 w-full rounded-xl" />
                            ) : restaurant ? (
                                <>
                                    <div className="flex flex-col md:flex-row items-center gap-8 border-b border-slate-100 pb-10">
                                        <div className="relative group shrink-0">
                                            <div className="w-24 h-24 rounded-full bg-slate-50 overflow-hidden border border-slate-200 shadow-sm group-hover:border-slate-300 transition-all flex items-center justify-center">
                                                {restaurant.photo_url ? (
                                                    <img src={restaurant.photo_url} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <Store size={32} className="text-slate-300" />
                                                )}
                                            </div>
                                            <button type="button" className="absolute bottom-0 right-0 bg-white border border-slate-200 shadow-sm text-slate-600 p-2 rounded-full hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95">
                                                <Camera size={16} />
                                            </button>
                                        </div>
                                        <div className="text-center md:text-left">
                                            <h3 className="text-xl font-bold text-slate-900">{restaurant.name}</h3>
                                            <p className="text-sm font-medium text-slate-500 mt-1">ID: {restaurant.id}</p>
                                        </div>
                                    </div>

                                    {/* Section 1 */}
                                    <div className="space-y-6">
                                        <h4 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">
                                            {t('settings.basicInfo')}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelCls}>{t('settings.restaurantName')}</label>
                                                <div className="relative">
                                                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="text" value={restaurant.name || ''} onChange={e => update('name', e.target.value)} className={inputCls} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelCls}>{t('settings.phoneNumber')}</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="tel" value={restaurant.phone || ''} onChange={e => update('phone', e.target.value)} className={inputCls} placeholder="+7 (777) 123-4567" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelCls}>{t('settings.email')}</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="email" value={restaurant.email || ''} onChange={e => update('email', e.target.value)} className={inputCls} />
                                                </div>
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <label className={labelCls}>{t('settings.address')}</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="text" value={restaurant.address || ''} onChange={e => update('address', e.target.value)} className={inputCls} />
                                                </div>
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <label className={labelCls}>{t('settings.desc')}</label>
                                                <div className="relative">
                                                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                    <textarea
                                                        value={restaurant.description || ''}
                                                        onChange={e => update('description', e.target.value)}
                                                        rows={4}
                                                        className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm transition-all focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-sm text-slate-900 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2 */}
                                    <div className="space-y-6">
                                        <h4 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">
                                            {t('settings.workingHours')}
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div>
                                                <label className={labelCls}>{t('settings.openingTime')}</label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="time" value={restaurant.opening_time || ''} onChange={e => update('opening_time', e.target.value)} className={inputCls} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelCls}>{t('settings.closingTime')}</label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="time" value={restaurant.closing_time || ''} onChange={e => update('closing_time', e.target.value)} className={inputCls} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelCls}>{t('settings.slotDuration')}</label>
                                                <div className="relative">
                                                    <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="number" min={15} max={180} step={15} value={restaurant.slot_duration_minutes || 60} onChange={e => update('slot_duration_minutes', Number(e.target.value))} className={inputCls} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3 */}
                                    <div className="space-y-6">
                                        <h4 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">
                                            {t('settings.capacity')}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelCls}>{t('settings.totalTables')}</label>
                                                <div className="relative">
                                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="number" min={1} value={restaurant.total_tables || ''} onChange={e => update('total_tables', Number(e.target.value))} className={inputCls} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelCls}>{t('settings.totalCapacity')}</label>
                                                <div className="relative">
                                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="number" min={1} value={restaurant.total_capacity || ''} onChange={e => update('total_capacity', Number(e.target.value))} className={inputCls} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 4 */}
                                    <div className="space-y-6">
                                        <h4 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">
                                            Pre-Payments & Deposits
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelCls}>Min Guests for Deposit (0 = Off)</label>
                                                <div className="relative">
                                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="number" min={0} value={restaurant.deposit_min_guests || ''} onChange={e => update('deposit_min_guests', Number(e.target.value) || null)} className={inputCls} placeholder="e.g. 6" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Deposit per Guest (KZT)</label>
                                                <div className="relative">
                                                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input type="number" min={0} step={100} value={restaurant.deposit_amount_per_guest || ''} onChange={e => update('deposit_amount_per_guest', Number(e.target.value) || null)} className={inputCls} placeholder="e.g. 5000" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-20 text-center">
                                    <p className="text-slate-500 font-medium">{t('settings.noData')}</p>
                                </div>
                            )
                        )}

                        {tab === 'telegram' && (
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">
                                        Telegram Bot
                                    </h4>
                                    <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                                        Подключите своего Telegram-бота, чтобы гости могли бронировать столы прямо в Telegram.
                                        Каждый ресторан имеет своего бота.
                                    </p>
                                </div>

                                {/* Status */}
                                <div className={`flex items-center gap-3 p-4 rounded-lg border ${restaurant?.bot_configured ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                                    {restaurant?.bot_configured
                                        ? <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                                        : <XCircle size={20} className="text-slate-400 shrink-0" />
                                    }
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {restaurant?.bot_configured ? 'Бот подключён' : 'Бот не настроен'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {restaurant?.bot_configured
                                                ? 'Гости могут бронировать через вашего Telegram-бота'
                                                : 'Добавьте токен бота чтобы активировать интеграцию'}
                                        </p>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 space-y-3">
                                    <p className="text-sm font-semibold text-slate-700">Как подключить:</p>
                                    <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                                        <li>Откройте <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">@BotFather</span> в Telegram</li>
                                        <li>Отправьте <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">/newbot</span> и следуйте инструкциям</li>
                                        <li>Скопируйте токен вида <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">123456:ABC-DEF...</span></li>
                                        <li>Вставьте токен ниже и нажмите «Сохранить»</li>
                                    </ol>
                                </div>

                                {/* Token input */}
                                <div>
                                    <label className={labelCls}>Bot Token</label>
                                    <div className="relative">
                                        <Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={restaurant?.bot_token || ''}
                                            onChange={e => update('bot_token', e.target.value)}
                                            className={inputCls}
                                            placeholder="123456789:AAHgyChjBAtI_l3zw1HKLuip39o5Zwl-tGI"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5">
                                        Токен хранится в зашифрованном виде и не передаётся третьим лицам.
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!restaurant?.bot_token) return;
                                            setLoading(true);
                                            try {
                                                await api.patch('/restaurants/me/', { bot_token: restaurant.bot_token });
                                                toast.success('Токен сохранён');
                                                loadRestaurant();
                                            } catch {
                                                toast.error('Не удалось сохранить токен');
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading}
                                        className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Save size={16} /> Сохранить токен
                                    </button>
                                </div>
                            </div>
                        )}

                        {tab === 'profile' && (                            <div className="space-y-6">
                                <h4 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">
                                    {t('settings.accountDetails')}
                                </h4>
                                <div className="grid grid-cols-1 gap-6 max-w-xl">
                                    <div>
                                        <label className={labelCls}>{t('settings.username')}</label>
                                        <input type="text" value={user?.username || ''} disabled className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-500 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>{t('settings.email')}</label>
                                        <input type="email" value={user?.email || ''} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>{t('settings.role')}</label>
                                        <input type="text" value={user?.profile?.role || ''} disabled className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-500 cursor-not-allowed" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {['notifications', 'security', 'billing'].includes(tab) && (
                            <div className="py-24 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                                    <Lock size={20} />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900 mb-1">{t('settings.comingSoon')}</h3>
                                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                    {tab === 'notifications' && t('settings.comingSoonNotif')}
                                    {tab === 'security' && t('settings.comingSoonSec')}
                                    {tab === 'billing' && t('settings.comingSoonBill')}
                                </p>
                            </div>
                        )}

                        {(tab === 'restaurant' || tab === 'profile') && (
                            <div className="pt-8 border-t border-slate-100 flex items-center justify-end gap-3 mt-12">
                                <Button type="button" variant="secondary" className="px-5 py-2.5 rounded-lg text-sm font-medium border-slate-200" onClick={() => { if (tab === 'restaurant') loadRestaurant(); }}>
                                    {t('settings.discard')}
                                </Button>
                                <Button type="submit" isLoading={loading} className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-2">
                                    <Save size={16} /> {t('settings.saveChanges')}
                                </Button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
