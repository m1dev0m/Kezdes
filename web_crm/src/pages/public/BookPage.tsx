import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarDays, Users, User, Phone, Mail, FileText, Loader2, ArrowLeft, Plus, Minus, Utensils, Gift, Briefcase, Heart, GlassWater, Sparkles } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import TableSelection from '@/components/TableSelection';
import { Logo } from '@/components/ui/Logo';

interface MenuItem { id: number; name: string; description: string; price: string; image_url: string; is_available: boolean; category?: number; }
interface MenuCategory { id: number; name: string; items: MenuItem[]; }
interface PreOrderItem { menu_item_id: number; name: string; price: number; quantity: number; }

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
        table_name: '' as string,
    });

    const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [preOrder, setPreOrder] = useState<PreOrderItem[]>([]);
    const [showMenu, setShowMenu] = useState(false);

    const loadMenu = useCallback(async () => {
        try {
            const res = await api.get(`/restaurants/${id}/menu/`);
            const payload = res.data;
            const categories = Array.isArray(payload) ? payload : (payload.categories || payload.results || []);
            setMenuCategories(categories);
        } catch { }
    }, [id]);

    useEffect(() => { loadMenu(); }, [loadMenu]);

    const addToPreOrder = (item: MenuItem) => {
        setPreOrder(prev => {
            const existing = prev.find(p => p.menu_item_id === item.id);
            if (existing) return prev.map(p => p.menu_item_id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
            return [...prev, { menu_item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
        });
    };

    const removeFromPreOrder = (itemId: number) => {
        setPreOrder(prev => {
            const existing = prev.find(p => p.menu_item_id === itemId);
            if (existing && existing.quantity > 1) return prev.map(p => p.menu_item_id === itemId ? { ...p, quantity: p.quantity - 1 } : p);
            return prev.filter(p => p.menu_item_id !== itemId);
        });
    };

    const preOrderTotal = preOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const eventTypes = [
        { id: 'dinner', label: t('booking.occasion_dinner', { defaultValue: 'Ужин' }), icon: <Utensils className="w-4 h-4" /> },
        { id: 'birthday', label: t('booking.occasion_birthday', { defaultValue: 'День рождения' }), icon: <Gift className="w-4 h-4" /> },
        { id: 'business', label: t('booking.occasion_business', { defaultValue: 'Бизнес встреча' }), icon: <Briefcase className="w-4 h-4" /> },
        { id: 'date', label: t('booking.occasion_date', { defaultValue: 'Свидание' }), icon: <Heart className="w-4 h-4" /> },
        { id: 'banquet', label: t('booking.occasion_banquet', { defaultValue: 'Банкет' }), icon: <GlassWater className="w-4 h-4" /> },
        { id: 'other', label: t('booking.occasion_other', { defaultValue: 'Другое' }), icon: <Sparkles className="w-4 h-4" /> },
    ];

    const minDate = new Date().toISOString().split('T')[0];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const finalPhone = user?.phone || formData.user_phone;
        const phoneRegex = /^\+?[0-9\s\-()]{10,}$/;
        if (!user && finalPhone && !phoneRegex.test(finalPhone.replace(/\s/g, ''))) {
            setError(t('booking.invalidPhone'));
            setLoading(false);
            return;
        }

        try {
            let finalRequests = formData.special_requests;
            if (preOrder.length > 0) {
                const preOrderText = preOrder.map(p => `${p.name} x${p.quantity} (₸${(p.price * p.quantity).toLocaleString()})`).join(', ');
                finalRequests = `${finalRequests}\n\nПредзаказ еды: ${preOrderText}. Итого: ₸${preOrderTotal.toLocaleString()}`;
            }

            const payload = {
                restaurant: parseInt(id || '0', 10),
                date: formData.date,
                time: formData.time,
                guests: parseInt(formData.guests, 10),
                user_name: user ? (user.first_name || user.username || '') : formData.user_name,
                user_phone: user ? (user.phone || '') : formData.user_phone,
                user_email: user ? (user.email || '') : formData.user_email,
                special_requests: finalRequests,
                event_type: formData.event_type,
                table_id: formData.table_id || null
            };

            await api.post('/bookings/', payload);
            toast.success(t('booking.success'));
            navigate(-1);
        } catch (err: any) {
            const data = err?.response?.data;
            let msg = t('errors.validationError');
            if (data) {
                if (typeof data.detail === 'string') msg = data.detail;
                else if (typeof data.error?.message === 'string') msg = data.error.message;
                else {
                    const first = Object.values(data).find(v => Array.isArray(v) && v.length > 0);
                    if (Array.isArray(first) && typeof first[0] === 'string') msg = first[0];
                }
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f6f6] font-sans text-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-[#f8f6f6]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#1B4332] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('common.back', { defaultValue: 'Назад' })}
                        </button>
                        <div className="flex items-center gap-2">
                            <Logo variant="text" className="text-[#1B4332]" />
                        </div>
                        <div className="w-20" />
                    </div>
                </div>
            </header>

            <TableSelection
                restaurantId={id || ''}
                date={formData.date}
                time={formData.time}
                guests={parseInt(formData.guests, 10)}
                isOpen={isTableSelectorOpen}
                onClose={() => setIsTableSelectorOpen(false)}
                onSelect={(tableId, tableName) => {
                    setFormData(p => ({ ...p, table_id: tableId, table_name: tableName }));
                    setIsTableSelectorOpen(false);
                    toast.success(`Стол ${tableName} выбран`);
                }}
            />

            <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
                    {/* Left: Steps */}
                    <div className="flex-1 space-y-8">
                        {/* Breadcrumb + Title */}
                        <div className="space-y-2">
                            <nav className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-4">
                                <span className="text-[#1B4332]">Reservation</span>
                                <span className="text-xs">›</span>
                                <span>Guest Details</span>
                                <span className="text-xs">›</span>
                                <span>Confirmation</span>
                            </nav>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Book your table</h2>
                            <p className="text-slate-600">Join us for an unforgettable dining experience.</p>
                        </div>

                        {/* Step 1: Occasion */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1B4332] text-white text-sm font-bold">1</span>
                                <h3 className="text-xl font-bold">Select Occasion</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {eventTypes.map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, event_type: type.id }))}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                                            formData.event_type === type.id
                                                ? 'border-[#1B4332] bg-[#1B4332]/5 text-[#1B4332]'
                                                : 'border-slate-200 text-slate-600 hover:border-[#1B4332]/50 hover:text-[#1B4332]'
                                        }`}
                                    >
                                        {type.icon}
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Step 2: Date, Time & Guests */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1B4332] text-white text-sm font-bold">2</span>
                                <h3 className="text-xl font-bold">Date, Time &amp; Party Size</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">{t('booking.selectDate')}</label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="date"
                                            required
                                            min={minDate}
                                            value={formData.date}
                                            onChange={e => setFormData(p => ({ ...p, date: e.target.value, time: '', table_id: null, table_name: '' }))}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">{t('booking.guests')}</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            min="1" max="20" required
                                            value={formData.guests}
                                            onChange={e => setFormData(p => ({ ...p, guests: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {formData.date && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-700">{t('booking.selectTime')}</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                        {['12:00', '13:00', '14:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'].map(slot => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, time: slot, table_id: null, table_name: '' }))}
                                                className={`py-2 px-3 text-sm font-semibold rounded-lg border transition-colors ${
                                                    formData.time === slot
                                                        ? 'border-[#1B4332] bg-[#1B4332]/10 text-[#1B4332]'
                                                        : 'border-slate-200 hover:border-[#1B4332] hover:text-[#1B4332]'
                                                }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 italic">Expected duration: 2 hours</p>
                                </div>
                            )}

                            {formData.date && formData.time && (
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsTableSelectorOpen(true)}
                                        className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#1B4332] text-sm font-semibold text-slate-500 hover:text-[#1B4332] transition-colors flex items-center justify-center gap-2"
                                    >
                                        {formData.table_id ? `Стол ${formData.table_name || formData.table_id} выбран ✓` : 'Выбрать конкретный стол (опционально)'}
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* Step 3: Contact Details */}
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1B4332] text-white text-sm font-bold">3</span>
                                <h3 className="text-xl font-bold">Guest Details</h3>
                            </div>

                            {user ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="font-bold text-slate-800">{user.first_name || user.username}</p>
                                    <p className="text-sm text-slate-500 mt-1">{user.phone}</p>
                                    <p className="text-xs text-slate-400 mt-3 uppercase tracking-wider font-semibold">Бронирование от имени аккаунта</p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-slate-700">{t('booking.fullName')}</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                value={formData.user_name}
                                                onChange={e => setFormData(p => ({ ...p, user_name: e.target.value }))}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-slate-700">{t('booking.phoneNumber')}</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="tel"
                                                required
                                                placeholder="+7 (___) ___-__-__"
                                                value={formData.user_phone}
                                                onChange={e => setFormData(p => ({ ...p, user_phone: e.target.value }))}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="block text-sm font-bold text-slate-700">{t('booking.email')} (опционально)</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="email"
                                                value={formData.user_email}
                                                onChange={e => setFormData(p => ({ ...p, user_email: e.target.value }))}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-5 space-y-2">
                                <label className="block text-sm font-bold text-slate-700">{t('booking.specialRequests')}</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <textarea
                                        rows={3}
                                        value={formData.special_requests}
                                        onChange={e => setFormData(p => ({ ...p, special_requests: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] resize-none"
                                        placeholder="Аллергии, пожелания к столику..."
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Step 4: Pre-order (optional) */}
                        {menuCategories.length > 0 && (
                            <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-sm font-bold">4</span>
                                        <h3 className="text-xl font-bold">Pre-order <span className="text-sm font-normal text-slate-400">(optional)</span></h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowMenu(!showMenu)}
                                        className="text-sm font-semibold text-[#1B4332] hover:underline"
                                    >
                                        {showMenu ? 'Hide menu' : 'Browse menu'}
                                    </button>
                                </div>

                                <div className={`transition-all duration-500 overflow-hidden ${showMenu ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="space-y-8">
                                        {menuCategories.map(cat => (
                                            <div key={cat.id}>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">{cat.name}</p>
                                                <div className="grid md:grid-cols-2 gap-3">
                                                    {cat.items.filter(i => i.is_available).map(item => {
                                                        const inCart = preOrder.find(p => p.menu_item_id === item.id);
                                                        return (
                                                            <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                                                                    <p className="text-xs text-slate-500 mt-0.5">₸{Number(item.price).toLocaleString()}</p>
                                                                </div>
                                                                <div className="shrink-0">
                                                                    {inCart ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <button type="button" onClick={() => removeFromPreOrder(item.id)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center transition-colors">
                                                                                <Minus size={13} />
                                                                            </button>
                                                                            <span className="text-sm font-bold w-5 text-center">{inCart.quantity}</span>
                                                                            <button type="button" onClick={() => addToPreOrder(item)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center transition-colors">
                                                                                <Plus size={13} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button type="button" onClick={() => addToPreOrder(item)} className="px-3 py-1.5 rounded-lg border border-[#1B4332] text-[#1B4332] text-xs font-bold hover:bg-[#1B4332] hover:text-white transition-colors">
                                                                            Add
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
                                </div>
                            </section>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading || !formData.date || !formData.time}
                                className="bg-[#1B4332] text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg shadow-[#1B4332]/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Reservation'}
                            </button>
                        </div>
                    </div>

                    {/* Right: Summary Sidebar */}
                    <aside className="w-full lg:w-96 space-y-6 lg:sticky lg:top-[80px] h-fit">
                        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                            <div className="h-48 w-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800')" }} />
                            <div className="p-6 space-y-4">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Kezdes Restaurant</h3>
                                <div className="space-y-3 text-sm text-slate-600">
                                    {formData.date && (
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-[#1B4332]" />
                                            <span>{formData.date}{formData.time ? ` at ${formData.time}` : ''}</span>
                                        </div>
                                    )}
                                    {formData.guests && (
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-[#1B4332]" />
                                            <span>{formData.guests} {parseInt(formData.guests) === 1 ? 'Guest' : 'Guests'}</span>
                                        </div>
                                    )}
                                    {formData.table_id && (
                                        <div className="flex items-center gap-2">
                                            <span className="w-4 h-4 text-[#1B4332] text-xs font-black">T</span>
                                            <span>Стол {formData.table_name || formData.table_id}</span>
                                        </div>
                                    )}
                                </div>

                                {preOrder.length > 0 && (
                                    <>
                                        <hr className="border-slate-100" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pre-order</p>
                                            <div className="space-y-1">
                                                {preOrder.map(item => (
                                                    <div key={item.menu_item_id} className="flex justify-between text-sm">
                                                        <span className="text-slate-700 truncate">{item.name} ×{item.quantity}</span>
                                                        <span className="text-slate-500 shrink-0 ml-2">₸{(item.price * item.quantity).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-100 mt-2">
                                                    <span>Total</span>
                                                    <span>₸{preOrderTotal.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="bg-[#1B4332]/5 border border-[#1B4332]/20 rounded-xl p-6">
                            <h4 className="font-bold text-[#1B4332] mb-2 flex items-center gap-2 text-sm">
                                Booking Policy
                            </h4>
                            <p className="text-sm text-slate-700">
                                We hold tables for 15 minutes. For parties larger than 8, please call us directly to arrange a custom menu.
                            </p>
                        </div>
                    </aside>
                </form>
            </main>
        </div>
    );
}
