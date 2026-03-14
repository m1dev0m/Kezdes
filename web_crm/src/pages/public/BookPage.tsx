import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarDays, Users, User, Phone, Mail, FileText, Loader2, ArrowLeft, CheckCircle2, UtensilsCrossed, Plus, Minus, ShoppingBag } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import TableSelection from '@/components/TableSelection';

interface MenuItem {
    id: number;
    name: string;
    description: string;
    price: string;
    image_url: string;
    is_available: boolean;
    category?: number;
}

interface MenuCategory {
    id: number;
    name: string;
    items: MenuItem[];
}

interface PreOrderItem {
    menu_item_id: number;
    name: string;
    price: number;
    quantity: number;
}

export default function BookPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        date: '',
        time: '',
        guests: '2',
        user_name: '',
        user_phone: '',
        user_email: '',
        special_requests: '',
        event_type: 'dinner',
        event_title: '',
        budget: '',
        table_id: null as number | null,
    });

    const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [joiningWaitlist, setJoiningWaitlist] = useState(false);

    // Food pre-ordering
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [preOrder, setPreOrder] = useState<PreOrderItem[]>([]);
    const [showMenu, setShowMenu] = useState(false);

    const loadMenu = useCallback(async () => {
        try {
            const res = await api.get(`/restaurants/${id}/menu/`);
            const payload = res.data as { categories?: MenuCategory[]; results?: MenuCategory[] } | MenuCategory[];
            const categories: MenuCategory[] = Array.isArray(payload) ? payload : payload.categories || payload.results || [];
            setMenuCategories(categories);
        } catch {
            // Menu not available — that's fine
        }
    }, [id]);

    useEffect(() => { loadMenu(); }, [loadMenu]);

    const addToPreOrder = (item: MenuItem) => {
        setPreOrder(prev => {
            const existing = prev.find(p => p.menu_item_id === item.id);
            if (existing) {
                return prev.map(p => p.menu_item_id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { menu_item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
        });
    };

    const removeFromPreOrder = (itemId: number) => {
        setPreOrder(prev => {
            const existing = prev.find(p => p.menu_item_id === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map(p => p.menu_item_id === itemId ? { ...p, quantity: p.quantity - 1 } : p);
            }
            return prev.filter(p => p.menu_item_id !== itemId);
        });
    };

    const preOrderTotal = preOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const eventTypes = [
        { id: 'dinner', label: t('booking.occasion_dinner', { defaultValue: 'Ужин' }), icon: '🍽️' },
        { id: 'birthday', label: t('booking.occasion_birthday', { defaultValue: 'День рождения' }), icon: '🎂' },
        { id: 'business', label: t('booking.occasion_business', { defaultValue: 'Бизнес встреча' }), icon: '💼' },
        { id: 'date', label: t('booking.occasion_date', { defaultValue: 'Свидание' }), icon: '❤️' },
        { id: 'banquet', label: t('booking.occasion_banquet', { defaultValue: 'Банкет' }), icon: '🥂' },
        { id: 'other', label: t('booking.occasion_other', { defaultValue: 'Другое' }), icon: '✨' },
    ];

    const minDate = new Date().toISOString().split('T')[0];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setFieldErrors({});

        const finalPhone = user?.phone || formData.user_phone;
        const phoneRegex = /^\+?[0-9\s\-()]{10,}$/;
        if (!user && finalPhone && !phoneRegex.test(finalPhone.replace(/\s/g, ''))) {
            setError(t('booking.invalidPhone'));
            setLoading(false);
            return;
        }

        try {
            const userEmail = user ? (user.email || '') : formData.user_email;

            // Build special_requests with pre-order
            let finalRequests = formData.special_requests;
            if (preOrder.length > 0) {
                const preOrderText = preOrder.map(p => `${p.name} x${p.quantity} (₸${(p.price * p.quantity).toLocaleString()})`).join(', ');
                finalRequests = `${finalRequests}\n\n🍽️ Предзаказ еды: ${preOrderText}. Итого: ₸${preOrderTotal.toLocaleString()}`;
            }

            const payload = {
                restaurant: parseInt(id || '0', 10),
                date: formData.date,
                time: formData.time,
                guests: parseInt(formData.guests, 10),
                user_name: user ? (user.first_name || user.username || '') : formData.user_name,
                user_phone: user ? (user.phone || '') : formData.user_phone,
                ...(userEmail ? { user_email: userEmail } : {}),
                special_requests: finalRequests.trim(),
                event_type: formData.event_type,
                event_title: formData.event_title,
                budget: formData.budget ? parseInt(formData.budget, 10) : null,
                table_id: formData.table_id,
                pre_order_items: preOrder.length > 0 ? preOrder : undefined,
            };
            await api.post('/bookings/', {
                ...payload,
            });

            navigate(`/restaurant/${id}/success`);
        } catch (err: any) {
            const data = err?.response?.data;
            const detail = data?.error?.message
                || data?.detail
                || (typeof data === 'string' ? data : null)
                || t('booking.errorCreating');
            setError(detail);
            if (data && typeof data === 'object') {
                const fe: Record<string, string> = {};
                ['date', 'time', 'guests', 'table_id'].forEach((key) => {
                    const v = (data as any)[key];
                    if (Array.isArray(v) && v.length > 0) {
                        fe[key] = String(v[0]);
                    } else if (typeof v === 'string') {
                        fe[key] = v;
                    }
                });
                setFieldErrors(fe);
            }
            // If error is about capacity/tables, offer the waitlist
            if (
                detail.toLowerCase().includes('стол') ||
                detail.toLowerCase().includes('table') ||
                detail.toLowerCase().includes('нет мест') ||
                detail.toLowerCase().includes('capacity') ||
                err?.response?.status === 409
            ) {
                setShowWaitlist(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleJoinWaitlist = async () => {
        setJoiningWaitlist(true);
        try {
            await api.post('/bookings/join_waitlist/', {
                restaurant: parseInt(id || '0', 10),
                date: formData.date,
                time: formData.time,
                guests: parseInt(formData.guests, 10),
            });
            toast.success(t('booking.joinedWaitlist', { defaultValue: 'Вы добавлены в лист ожидания! Мы уведомим вас, когда место освободится.' }));
            setShowWaitlist(false);
            setError('');
        } catch (err: any) {
            const detail = err?.response?.data?.detail || t('booking.waitlistError', { defaultValue: 'Не удалось встать в очередь.' });
            toast.error(detail);
        } finally {
            setJoiningWaitlist(false);
        }
    };

    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [fetchingSlots, setFetchingSlots] = useState(false);

    const fetchSlots = async (date: string, guests: string) => {
        if (!id || !date || !guests) return;
        setFetchingSlots(true);
        try {
            const res = await api.get(`/bookings/available_slots/?restaurant_id=${id}&date=${date}&guests=${guests}`);
            setAvailableSlots(res.data.slots || []);
            if (res.data.slots?.length > 0 && !res.data.slots.includes(formData.time)) {
                setFormData(p => ({ ...p, time: res.data.slots[0] }));
            }
        } catch {
            toast.error(t('booking.failedToLoadSlots'));
        } finally {
            setFetchingSlots(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const nextData = { ...formData, [name]: value };
        setFormData(nextData);

        if (name === 'date' || name === 'guests') {
            fetchSlots(nextData.date, nextData.guests);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition-colors text-sm font-black uppercase tracking-widest group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {t('booking.backToRestaurant')}
            </button>

            {/* Table Selection Modal */}
            <TableSelection
                restaurantId={id || ''}
                date={formData.date}
                time={formData.time}
                guests={parseInt(formData.guests, 10)}
                isOpen={isTableSelectorOpen}
                onClose={() => setIsTableSelectorOpen(false)}
                onSelect={(tableId) => {
                    setFormData(p => ({ ...p, table_id: tableId }));
                    setIsTableSelectorOpen(false);
                    toast.success(`Table #${tableId} selected`);
                }}
            />

            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-12 text-center text-white relative h-48 flex flex-col justify-center items-center">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                    <h1 className="text-3xl font-black tracking-tight mb-2">{t('booking.title')}</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">{t('booking.subtitle')}</p>
                </div>

                {error && (
                    <div className="mx-12 mt-8 p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-black uppercase tracking-widest border border-rose-100 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        {error}
                    </div>
                )}

                {showWaitlist && user && (
                    <div className="mx-12 mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-sm font-bold text-amber-800 mb-3">
                            {t('booking.waitlistOffer', { defaultValue: 'Мест на это время нет, но вы можете встать в лист ожидания — мы уведомим вас, если место освободится.' })}
                        </p>
                        <button
                            type="button"
                            onClick={handleJoinWaitlist}
                            disabled={joiningWaitlist}
                            className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                            {joiningWaitlist
                                ? t('booking.joining', { defaultValue: 'Добавляем...' })
                                : t('booking.joinWaitlist', { defaultValue: '🔔 Встать в лист ожидания' })
                            }
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-12 space-y-12">
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black shadow-lg shadow-primary/20">1</div>
                            <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">{t('booking.occasion')}</h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {eventTypes.map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, event_type: type.id }))}
                                    className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${formData.event_type === type.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-white hover:border-slate-200'}`}
                                >
                                    <span className="text-2xl">{type.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black shadow-lg shadow-primary/20">2</div>
                            <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">{t('booking.dateAndGuests')}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('booking.selectDate')}</label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        name="date"
                                        min={minDate}
                                        required
                                        value={formData.date}
                                        onChange={handleChange}
                                        className={`w-full bg-slate-50 border-2 rounded-[1.25rem] py-4 pl-12 pr-4 focus:bg-white text-sm font-black transition-all outline-none ${
                                            fieldErrors.date ? 'border-rose-400 focus:border-rose-500' : 'border-transparent focus:border-slate-900'
                                        }`}
                                    />
                                </div>
                                {fieldErrors.date && (
                                    <p className="text-[11px] text-rose-500 font-medium mt-1">{fieldErrors.date}</p>
                                )}
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('booking.partySize')}</label>
                                <div className="relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <select
                                        name="guests"
                                        required
                                        value={formData.guests}
                                        onChange={handleChange}
                                        className={`w-full bg-slate-50 border-2 rounded-[1.25rem] py-4 pl-12 pr-4 focus:bg-white text-sm font-black transition-all outline-none appearance-none ${
                                            fieldErrors.guests ? 'border-rose-400 focus:border-rose-500' : 'border-transparent focus:border-slate-900'
                                        }`}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                            <option key={n} value={n}>{n} {n === 1 ? t('booking.guest') : t('booking.guests')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {formData.date && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('booking.availableTimes')}</label>
                                    {fetchingSlots && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                    {availableSlots.length > 0 ? (
                                        availableSlots.map(slot => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, time: slot }))}
                                                className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${formData.time === slot ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}
                                            >
                                                {slot}
                                            </button>
                                        ))
                                    ) : (
                                        !fetchingSlots && (
                                            <div className="col-span-full py-8 text-center bg-slate-50 rounded-[1.25rem] border-2 border-dashed border-slate-200">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('booking.noSlots')}</div>
                                            </div>
                                        )
                                    )}
                                </div>
                                {formData.time && (
                                    <div className="pt-4 space-y-2 mt-6">
                                        <div className="flex items-center justify-between bg-primary/5 rounded-2xl p-6 border border-primary/10">
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Specific Table (Optional)</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    {formData.table_id ? `Table #${formData.table_id} Selected` : 'Any available table will be assigned'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsTableSelectorOpen(true)}
                                                className="bg-white text-primary text-[10px] font-black uppercase tracking-widest py-3 px-6 rounded-xl shadow-md cursor-pointer hover:bg-slate-50 transition-all border-2 border-primary/20"
                                            >
                                                {formData.table_id ? 'Change Table' : 'Choose Table'}
                                            </button>
                                        </div>
                                        {fieldErrors.table_id && (
                                            <p className="text-[11px] text-rose-500 font-medium">{fieldErrors.table_id}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">2</div>
                            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">{t('booking.yourDetails')}</h3>
                        </div>

                        <div className="space-y-6">
                            {user ? (
                                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col gap-1.5 mb-2">
                                    <p className="text-sm font-bold text-slate-900 tracking-tight">{t('booking.bookingAs', { defaultValue: 'Бронирование от имени' })}: {user.first_name || user.username}</p>
                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5" /> {user.email}
                                        {user.phone && <><span className="text-slate-300">•</span> <Phone className="w-3.5 h-3.5" /> {user.phone}</>}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('booking.fullName')}</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            <input type="text" name="user_name" required value={formData.user_name} onChange={handleChange} placeholder="e.g. John Doe" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 text-sm font-bold transition-all outline-none" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('booking.phone')}</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                <input type="tel" name="user_phone" required value={formData.user_phone} onChange={handleChange} placeholder="+7 (___) ___-__-__" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 text-sm font-bold transition-all outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 text-slate-400">{t('booking.email')}</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                                                <input type="email" name="user_email" value={formData.user_email} onChange={handleChange} placeholder="john@example.com" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 text-sm font-bold transition-all outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 text-slate-400">{t('booking.eventTitle')}</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        <input type="text" name="event_title" value={formData.event_title} onChange={handleChange} placeholder="e.g. Birthday Party" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 text-sm font-bold transition-all outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 text-slate-400">{t('booking.plannedBudget')}</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">₸</div>
                                        <input type="number" name="budget" value={formData.budget} onChange={handleChange} placeholder="e.g. 50000" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 text-sm font-bold transition-all outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" /> {t('booking.specialRequests')}
                        </label>
                        <textarea name="special_requests" value={formData.special_requests} onChange={handleChange} placeholder={t('booking.specialRequestsPlaceholder')} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 text-sm font-bold transition-all outline-none h-32 resize-none"></textarea>
                    </div>

                    {/* Food Pre-ordering */}
                    {menuCategories.length > 0 && (
                        <div className="space-y-6 pt-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black shadow-inner">
                                        <UtensilsCrossed size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Предзаказ еды</h3>
                                        <p className="text-[10px] text-slate-400 font-bold">Закажите блюда заранее к вашему визиту</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-100 transition-all border border-amber-200"
                                >
                                    {showMenu ? 'Скрыть меню' : 'Открыть меню'}
                                </button>
                            </div>

                            {showMenu && (
                                <div className="space-y-6 bg-slate-50 rounded-[2rem] p-6 border-2 border-slate-100">
                                    {menuCategories.map(cat => (
                                        <div key={cat.id} className="space-y-3">
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{cat.name}</h4>
                                            <div className="grid gap-2">
                                                {cat.items.filter(i => i.is_available).map(item => {
                                                    const inCart = preOrder.find(p => p.menu_item_id === item.id);
                                                    return (
                                                        <div key={item.id} className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100 hover:shadow-md transition-all">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                                                                {item.description && <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>}
                                                            </div>
                                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                                <span className="text-primary font-black text-sm">₸{Number(item.price).toLocaleString()}</span>
                                                                {inCart ? (
                                                                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-2 py-1">
                                                                        <button type="button" onClick={() => removeFromPreOrder(item.id)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                                                            <Minus size={12} />
                                                                        </button>
                                                                        <span className="text-xs font-black text-slate-900 w-5 text-center">{inCart.quantity}</span>
                                                                        <button type="button" onClick={() => addToPreOrder(item)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                                                            <Plus size={12} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button type="button" onClick={() => addToPreOrder(item)} className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
                                                                        <Plus size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {preOrder.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center gap-2 text-amber-800">
                                        <ShoppingBag size={16} />
                                        <span className="text-xs font-black uppercase tracking-widest">Ваш предзаказ</span>
                                    </div>
                                    {preOrder.map(item => (
                                        <div key={item.menu_item_id} className="flex items-center justify-between text-sm">
                                            <span className="font-bold text-slate-700">{item.name} ×{item.quantity}</span>
                                            <span className="font-black text-amber-700">₸{(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-amber-200 pt-3 flex items-center justify-between">
                                        <span className="text-xs font-black text-amber-800 uppercase tracking-widest">Итого предзаказ</span>
                                        <span className="text-lg font-black text-amber-800">₸{preOrderTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-black py-5 rounded-[1.5rem] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:scale-100 uppercase tracking-widest text-sm"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                <>
                                    {t('booking.confirmReservation')}
                                    <CheckCircle2 className="w-5 h-5" />
                                </>
                            )}
                        </button>
                        <p className="text-center text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-widest">
                            {t('booking.secureReservation')}
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
