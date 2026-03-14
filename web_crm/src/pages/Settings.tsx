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
    Banknote
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
                });
                toast.success(t('settings.restaurantSaved'));
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
        { id: 'profile', label: t('settings.myProfile'), icon: User },
        { id: 'notifications', label: t('settings.notifications'), icon: Bell },
        { id: 'security', label: t('settings.security'), icon: Shield },
        { id: 'billing', label: t('settings.billing'), icon: CreditCard },
    ];

    const inputClass = "w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-slate-900 dark:focus:border-slate-700 rounded-2xl text-sm font-bold transition-all outline-none";
    const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1";
    const iconClass = "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300";

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('settings.title')}</h1>
                <p className="text-slate-500 font-medium mt-1">{t('settings.description')}</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
                <div className="lg:w-1/4 space-y-2">
                    {tabs.map((tItem) => (
                        <button
                            key={tItem.id}
                            onClick={() => setTab(tItem.id)}
                            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${tab === tItem.id ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <tItem.icon size={18} className={tab === tItem.id ? 'text-white' : 'text-slate-400'} />
                            {tItem.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-10 shadow-sm">
                    <form onSubmit={handleSave} className="space-y-10">
                        {tab === 'restaurant' && (
                            loadingData ? (
                                <Skeleton className="h-64 w-full" />
                            ) : restaurant ? (
                                <>
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-8 border-b border-slate-50 dark:border-slate-800 pb-10">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-[2rem] bg-slate-100 dark:bg-slate-800 overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl">
                                                {restaurant.photo_url ? (
                                                    <img src={restaurant.photo_url} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Store size={32} /></div>
                                                )}
                                            </div>
                                            <button type="button" className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 p-2.5 rounded-xl shadow-lg text-slate-600 dark:text-white hover:scale-110 transition-all">
                                                <Camera size={16} />
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{restaurant.name}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg w-fit">ID: #{restaurant.id}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">{t('settings.basicInfo')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t('settings.restaurantName')}</label>
                                                <div className="relative">
                                                    <Store className={iconClass} />
                                                    <input type="text" value={restaurant.name || ''} onChange={e => update('name', e.target.value)} className={inputClass} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t('settings.phoneNumber')}</label>
                                                <div className="relative">
                                                    <Phone className={iconClass} />
                                                    <input type="tel" value={restaurant.phone || ''} onChange={e => update('phone', e.target.value)} className={inputClass} placeholder="+7 (777) 123-4567" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t('settings.email')}</label>
                                                <div className="relative">
                                                    <Mail className={iconClass} />
                                                    <input type="email" value={restaurant.email || ''} onChange={e => update('email', e.target.value)} className={inputClass} />
                                                </div>
                                            </div>
                                            <div className="col-span-full space-y-2">
                                                <label className={labelClass}>{t('settings.address')}</label>
                                                <div className="relative">
                                                    <MapPin className={iconClass} />
                                                    <input type="text" value={restaurant.address || ''} onChange={e => update('address', e.target.value)} className={inputClass} />
                                                </div>
                                            </div>
                                            <div className="col-span-full space-y-2">
                                                <label className={labelClass}>{t('settings.desc')}</label>
                                                <div className="relative">
                                                    <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                                                    <textarea
                                                        value={restaurant.description || ''}
                                                        onChange={e => update('description', e.target.value)}
                                                        rows={3}
                                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-slate-900 dark:focus:border-slate-700 rounded-2xl text-sm font-bold transition-all outline-none resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">{t('settings.workingHours')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t('settings.openingTime')}</label>
                                                <div className="relative">
                                                    <Clock className={iconClass} />
                                                    <input type="time" value={restaurant.opening_time || ''} onChange={e => update('opening_time', e.target.value)} className={inputClass} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t('settings.closingTime')}</label>
                                                <div className="relative">
                                                    <Clock className={iconClass} />
                                                    <input type="time" value={restaurant.closing_time || ''} onChange={e => update('closing_time', e.target.value)} className={inputClass} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t('settings.slotDuration')}</label>
                                                <div className="relative">
                                                    <Timer className={iconClass} />
                                                    <input type="number" min={15} max={180} step={15} value={restaurant.slot_duration_minutes || 60} onChange={e => update('slot_duration_minutes', Number(e.target.value))} className={inputClass} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">{t('settings.capacity')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t('settings.totalTables')}</label>
                                                <div className="relative">
                                                    <Hash className={iconClass} />
                                                    <input type="number" min={1} value={restaurant.total_tables || ''} onChange={e => update('total_tables', Number(e.target.value))} className={inputClass} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t('settings.totalCapacity')}</label>
                                                <div className="relative">
                                                    <Users className={iconClass} />
                                                    <input type="number" min={1} value={restaurant.total_capacity || ''} onChange={e => update('total_capacity', Number(e.target.value))} className={inputClass} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 border-t border-slate-50 dark:border-slate-800 pt-8">Предоплаты (Депозиты)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className={labelClass}>Мин. гостей для депозита (0 = откл.)</label>
                                                <div className="relative">
                                                    <Users className={iconClass} />
                                                    <input type="number" min={0} value={restaurant.deposit_min_guests || ''} onChange={e => update('deposit_min_guests', Number(e.target.value) || null)} className={inputClass} placeholder="Например, 6" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Сумма депозита за гостя (KZT)</label>
                                                <div className="relative">
                                                    <Banknote className={iconClass} />
                                                    <input type="number" min={0} step={100} value={restaurant.deposit_amount_per_guest || ''} onChange={e => update('deposit_amount_per_guest', Number(e.target.value) || null)} className={inputClass} placeholder="Например, 5000" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-20 text-center">
                                    <p className="text-slate-400 font-bold">{t('settings.noData')}</p>
                                </div>
                            )
                        )}

                        {tab === 'profile' && (
                            <div className="space-y-8">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('settings.accountDetails')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className={labelClass}>{t('settings.username')}</label>
                                        <input type="text" value={user?.username || ''} disabled className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>{t('settings.email')}</label>
                                        <input type="email" value={user?.email || ''} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-slate-900 dark:focus:border-slate-700 rounded-2xl text-sm font-bold transition-all outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>{t('settings.role')}</label>
                                        <input type="text" value={user?.profile?.role || ''} disabled className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed capitalize" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(tab === 'notifications' || tab === 'security' || tab === 'billing') && (
                            <div className="py-20 text-center space-y-6">
                                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-300">
                                    <Lock size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-slate-900 dark:text-white tracking-tight">{t('settings.comingSoon')}</p>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-xs mx-auto">
                                        {tab === 'notifications' && t('settings.comingSoonNotif')}
                                        {tab === 'security' && t('settings.comingSoonSec')}
                                        {tab === 'billing' && t('settings.comingSoonBill')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {(tab === 'restaurant' || tab === 'profile') && (
                            <div className="pt-10 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-4">
                                <Button type="button" variant="ghost" onClick={() => { if (tab === 'restaurant') loadRestaurant(); }}>{t('settings.discard')}</Button>
                                <Button type="submit" isLoading={loading} className="px-10">
                                    <Save size={16} className="mr-2" /> {t('settings.saveChanges')}
                                </Button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
