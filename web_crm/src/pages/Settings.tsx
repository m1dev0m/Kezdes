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



    return (
        <div className="space-y-4 pb-12">
            <div>
                <h1 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.2em] italic">{t('settings.title')}</h1>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5 opacity-60">{t('settings.description')}</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-[240px] shrink-0 space-y-1">
                    {tabs.map((tItem) => (
                        <button
                            key={tItem.id}
                            onClick={() => setTab(tItem.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all group ${tab === tItem.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <tItem.icon size={14} className={tab === tItem.id ? '' : 'opacity-40 group-hover:opacity-100 transition-opacity'} />
                            {tItem.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-8 sm:p-12 shadow-sm">
                    <form onSubmit={handleSave} className="space-y-12">
                        {tab === 'restaurant' && (
                            loadingData ? (
                                <Skeleton className="h-64 w-full rounded-2xl" />
                            ) : restaurant ? (
                                <>
                                    <div className="flex flex-col md:flex-row items-center gap-10 border-b border-slate-50 pb-12">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 shadow-inner group-hover:border-indigo-600 transition-all">
                                                {restaurant.photo_url ? (
                                                    <img src={restaurant.photo_url} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-200 dark:text-slate-800"><Store size={32} /></div>
                                                )}
                                            </div>
                                            <button type="button" className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-xl transition-transform hover:scale-110 active:scale-95">
                                                <Camera size={14} />
                                            </button>
                                        </div>
                                        <div className="space-y-1 text-center md:text-left">
                                            <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.1em] italic">{restaurant.name}</h3>
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">REF://{restaurant.id}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.25em] flex items-center gap-3">
                                            {t('settings.basicInfo')}
                                            <div className="h-[1px] flex-1 bg-slate-50"></div>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.restaurantName')}</label>
                                                <div className="relative group">
                                                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="text" value={restaurant.name || ''} onChange={e => update('name', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest text-slate-900" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.phoneNumber')}</label>
                                                <div className="relative group">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="tel" value={restaurant.phone || ''} onChange={e => update('phone', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest tabular-nums text-slate-900" placeholder="+7 (777) 123-4567" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.email')}</label>
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="email" value={restaurant.email || ''} onChange={e => update('email', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest text-slate-900" />
                                                </div>
                                            </div>
                                            <div className="col-span-full space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.address')}</label>
                                                <div className="relative group">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="text" value={restaurant.address || ''} onChange={e => update('address', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest text-slate-900" />
                                                </div>
                                            </div>
                                            <div className="col-span-full space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.desc')}</label>
                                                <div className="relative group">
                                                    <FileText className="absolute left-4 top-4 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <textarea
                                                        value={restaurant.description || ''}
                                                        onChange={e => update('description', e.target.value)}
                                                        rows={3}
                                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-bold text-slate-900 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.25em] flex items-center gap-3">
                                            {t('settings.workingHours')}
                                            <div className="h-[1px] flex-1 bg-slate-50"></div>
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.openingTime')}</label>
                                                <div className="relative group">
                                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="time" value={restaurant.opening_time || ''} onChange={e => update('opening_time', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest tabular-nums text-slate-900" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.closingTime')}</label>
                                                <div className="relative group">
                                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="time" value={restaurant.closing_time || ''} onChange={e => update('closing_time', e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest tabular-nums text-slate-900" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.slotDuration')}</label>
                                                <div className="relative group">
                                                    <Timer className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="number" min={15} max={180} step={15} value={restaurant.slot_duration_minutes || 60} onChange={e => update('slot_duration_minutes', Number(e.target.value))} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest tabular-nums text-slate-900" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.25em] flex items-center gap-3">
                                            {t('settings.capacity')}
                                            <div className="h-[1px] flex-1 bg-slate-50"></div>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.totalTables')}</label>
                                                <div className="relative group">
                                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="number" min={1} value={restaurant.total_tables || ''} onChange={e => update('total_tables', Number(e.target.value))} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest tabular-nums text-slate-900" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.totalCapacity')}</label>
                                                <div className="relative group">
                                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="number" min={1} value={restaurant.total_capacity || ''} onChange={e => update('total_capacity', Number(e.target.value))} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest tabular-nums text-slate-900" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.25em] flex items-center gap-3">
                                            PRE-PAYMENTS / DEPOSITS
                                            <div className="h-[1px] flex-1 bg-slate-50"></div>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">MIN GUESTS FOR DEPOSIT (0 = OFF)</label>
                                                <div className="relative group">
                                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="number" min={0} value={restaurant.deposit_min_guests || ''} onChange={e => update('deposit_min_guests', Number(e.target.value) || null)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest tabular-nums text-slate-900" placeholder="E.G. 6" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">DEPOSIT PER GUEST (KZT)</label>
                                                <div className="relative group">
                                                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input type="number" min={0} step={100} value={restaurant.deposit_amount_per_guest || ''} onChange={e => update('deposit_amount_per_guest', Number(e.target.value) || null)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 transition-all outline-none text-[11px] font-black uppercase tracking-widest tabular-nums text-slate-900" placeholder="E.G. 5000" />
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
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.25em] flex items-center gap-3">
                                    {t('settings.accountDetails')}
                                    <div className="h-[1px] flex-1 bg-slate-50"></div>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.username')}</label>
                                        <input type="text" value={user?.username || ''} disabled className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-400 cursor-not-allowed uppercase tracking-widest opacity-60" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.email')}</label>
                                        <input type="email" value={user?.email || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:border-indigo-600 rounded-xl text-[11px] font-black transition-all outline-none text-slate-900" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('settings.role')}</label>
                                        <input type="text" value={user?.profile?.role || ''} disabled className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-400 cursor-not-allowed uppercase tracking-widest opacity-60" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(tab === 'notifications' || tab === 'security' || tab === 'billing') && (
                            <div className="py-24 text-center space-y-6">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-200 shadow-sm">
                                    <Lock size={28} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.25em] italic">{t('settings.comingSoon')}</h3>
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest max-w-xs mx-auto opacity-60 leading-relaxed">
                                        {tab === 'notifications' && t('settings.comingSoonNotif')}
                                        {tab === 'security' && t('settings.comingSoonSec')}
                                        {tab === 'billing' && t('settings.comingSoonBill')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {(tab === 'restaurant' || tab === 'profile') && (
                            <div className="pt-10 border-t border-slate-50 flex flex-col sm:flex-row justify-end gap-3">
                                <Button type="button" variant="secondary" className="h-10 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest border-slate-100" onClick={() => { if (tab === 'restaurant') loadRestaurant(); }}>{t('settings.discard')}</Button>
                                <Button type="submit" isLoading={loading} className="h-10 px-10 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 bg-indigo-600 text-white">
                                    <Save size={14} className="mr-2" /> {t('settings.saveChanges')}
                                </Button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
