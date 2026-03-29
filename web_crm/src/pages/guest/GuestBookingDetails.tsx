import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/services/api';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import GuestWriteReviewModal from './GuestWriteReviewModal';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
    ChevronLeft,
    Clock,
    CalendarDays,
    Users2,
    Hash,
    MapPin,
    Navigation,
    UtensilsCrossed,
    ShoppingBag,
    X,
    Plus,
    CheckCircle2,
    CalendarPlus,
    Settings2,
    Trash2,
    Star
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: 'В ожидании', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    approved: { label: 'Одобрено', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    confirmed: { label: 'Подтверждено', color: 'bg-blue-50 text-[#1d4ed8] border-blue-100' },
    payment_pending: { label: 'Ожидает оплаты', color: 'bg-violet-50 text-violet-600 border-violet-100' },
    arrived: { label: 'Прибыл', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    seated: { label: 'Занят стол', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    completed: { label: 'Завершено', color: 'bg-slate-100 text-slate-500 border-slate-200' },
    no_show: { label: 'Не пришел', color: 'bg-slate-100 text-slate-500 border-slate-200' },
    cancelled: { label: 'Отменено', color: 'bg-slate-100 text-slate-500 border-slate-200' },
    cancelled_by_user: { label: 'Отменено вами', color: 'bg-slate-100 text-slate-500 border-slate-200' },
    cancelled_by_restaurant: { label: 'Отменено заведением', color: 'bg-slate-100 text-slate-500 border-slate-200' },
    rejected: { label: 'Отклонено', color: 'bg-rose-50 text-rose-600 border-rose-100' },
};

interface Booking {
    id: number;
    restaurant: number;
    restaurant_name: string;
    restaurant_photo_url?: string;
    date: string;
    time: string;
    guests: number;
    status: string;
    special_requests?: string;
    table_id?: number;
    preorder?: {
        id: number;
        items: any[];
        total_amount: string;
        status: string;
        payment_status: string;
    } | null;
}

interface MenuItem {
    id: number;
    name: string;
    price: string;
    description: string;
    image: string;
}

interface MenuCategory {
    id: number;
    name: string;
    items: MenuItem[];
}

export default function GuestBookingDetails() {
    const { id } = useParams<{ id: string }>();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [restaurantTables, setRestaurantTables] = useState<any[]>([]);
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fetchingMenu, setFetchingMenu] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const fetchBooking = async () => {
        try {
            const res = await api.get(`/bookings/${id}/`);
            const bData = res.data;
            setBooking(bData);

            if (bData.preorder) {
                setActiveOrder(bData.preorder);
            }

            api.get(`/restaurants/${bData.restaurant}/`).then(r => {
                setRestaurantTables(r.data.tables || []);
            });
        } catch (err) {
            toast.error('Failed to load booking details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooking();
    }, [id]);

    const handlePreOrderStart = async () => {
        if (!booking) return;
        setFetchingMenu(true);
        try {
            const menuRes = await api.get(`/orders/restaurants/${booking.restaurant}/public_menu/`);
            setMenuCategories(menuRes.data);

            const orderRes = await api.post('/orders/', {
                restaurant_id: booking.restaurant,
                reservation_id: booking.id
            });
            setActiveOrder(orderRes.data);
            setShowMenu(true);
        } catch (err) {
            toast.error('Failed to load menu');
        } finally {
            setFetchingMenu(false);
        }
    };

    const addToOrder = async (itemId: number, qty: number) => {
        if (!activeOrder) return;
        try {
            const res = await api.post(`/orders/${activeOrder.id}/set_item/`, {
                menu_item_id: itemId,
                quantity: qty
            });
            setActiveOrder(res.data);
            toast.success('Cart updated');
        } catch (err) {
            toast.error('Failed to update order');
        }
    };

    const confirmOrder = async () => {
        if (!activeOrder) return;
        try {
            await api.post(`/orders/${activeOrder.id}/confirm/`, { payment_mode: 'pay_later' });
            toast.success('Pre-order confirmed!');
            setShowMenu(false);
            fetchBooking();
        } catch (err) {
            toast.error('Failed to confirm order');
        }
    };

    const handleCancel = async () => {
        try {
            await api.post(`/bookings/${id}/cancel/`);
            setBooking(prev => prev ? { ...prev, status: 'cancelled_by_user' } : null);
            toast.success('Reservation cancelled successfully.');
            setShowCancelConfirm(false);
        } catch (err) {
            toast.error('Could not cancel reservation.');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen bg-white"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-50 border-t-[#1d4ed8]" /></div>;
    if (!booking) return <div className="flex flex-col justify-center items-center h-screen bg-white gap-4">
        <h2 className="text-2xl font-black text-slate-900 uppercase">Бронирование не найдено</h2>
        <Link to="/guest/dashboard" className="text-xs font-bold uppercase tracking-widest text-white bg-[#1d4ed8] px-6 py-3 rounded-xl transition hover:bg-[#1e40af]">Вернуться в кабинет</Link>
    </div>;

    const isActive = ['pending', 'confirmed', 'payment_pending', 'approved', 'arrived'].includes(booking.status);
    const isCompleted = booking.status === 'completed';
    const isSeated = booking.status === 'seated';

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <nav className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest">
                        <Link to="/guest/dashboard" className="text-slate-400 hover:text-[#1d4ed8] transition-colors flex items-center gap-1">
                            <ChevronLeft size={14} />
                            Мои бронирования
                        </Link>
                        <span className="text-slate-200">/</span>
                        <span className="text-[#1d4ed8]">Бронь #{booking.id}</span>
                    </nav>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{booking.restaurant_name}</h1>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${isSeated ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : isActive ? 'bg-blue-50 text-[#1d4ed8] border border-blue-100 shadow-sm' : isCompleted ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {isSeated ? 'ЗА СТОЛОМ' : (STATUS_MAP[booking.status]?.label || booking.status).toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-8">

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <CalendarDays size={12} className="text-[#1d4ed8]" /> Дата
                                </span>
                                <span className="text-lg font-bold text-slate-900">{format(parseISO(`${booking.date}T00:00:00`), 'd MMMM, yyyy', { locale: ru })}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock size={12} className="text-[#1d4ed8]" /> Время
                                </span>
                                <span className="text-lg font-bold text-slate-900">{booking.time.substring(0, 5)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Users2 size={12} className="text-[#1d4ed8]" /> Гостей
                                </span>
                                <span className="text-lg font-bold text-slate-900">{booking.guests} чел.</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Hash size={12} className="text-[#1d4ed8]" /> Код
                                </span>
                                <span className="text-lg font-bold text-slate-900">#{booking.id.toString().padStart(5, '0')}</span>
                            </div>
                        </div>

                        {booking.special_requests && (
                            <div className="px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-100">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Особые пожелания</span>
                                <p className="text-sm font-medium text-slate-900 tracking-wider">"{booking.special_requests}"</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight uppercase">Схема зала</h3>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                                    {booking.table_id ? 'Ваш стол отмечен на плане зала.' : 'Столик будет назначен при визите.'}
                                </p>
                            </div>
                            {booking.table_id && (
                                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm">
                                    <div className="size-2 rounded-full bg-[#1d4ed8] animate-pulse" />
                                    <span className="text-xs font-bold text-[#1d4ed8] uppercase tracking-widest">
                                        СТОЛ {restaurantTables.find(t => t.id === booking.table_id)?.number || booking.table_id}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="relative w-full aspect-[4/3] bg-[#f8fafc] rounded-xl border-2 border-slate-100 overflow-hidden shadow-inner">
                            <svg viewBox="0 0 1000 750" className="w-full h-full">
                                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                                </pattern>
                                <rect width="1000" height="750" fill="url(#grid)" />

                                <rect x="420" y="730" width="160" height="20" fill="#cbd5e1" rx="4" />
                                <text x="500" y="742" textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-bold fill-slate-500 uppercase tracking-widest">Entrance</text>

                                {restaurantTables.map(table => {
                                    const isMyTable = table.id === booking.table_id;

                                    return (
                                        <g key={table.id} transform={`translate(${table.x || Math.random() * 800}, ${table.y || Math.random() * 600})`}>
                                            {table.table_type === 'circle' ? (
                                                <circle r={table.width / 2} cx={table.width / 2} cy={table.height / 2} className={`stroke-2 transition-all ${isMyTable ? 'fill-[#1d4ed8] stroke-white shadow-2xl' : 'fill-white stroke-slate-300'}`} />
                                            ) : (
                                                <rect width={table.width} height={table.height} rx="6" className={`stroke-2 transition-all ${isMyTable ? 'fill-[#1d4ed8] stroke-white shadow-2xl' : 'fill-white stroke-slate-300'}`} />
                                            )}
                                            <text x={table.width / 2} y={table.height / 2} textAnchor="middle" dominantBaseline="middle" className={`text-sm font-bold ${isMyTable ? 'fill-white' : 'fill-slate-400'}`}>
                                                {table.number}
                                            </text>
                                            {isMyTable && <circle r="6" cx={table.width} cy="0" className="fill-blue-500 stroke-2 stroke-white animate-pulse" />}
                                        </g>
                                    );
                                })}

                                {!booking.table_id && restaurantTables.length === 0 && (
                                    <text x="500" y="375" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 font-medium text-sm">
                                        Layout not mapped
                                    </text>
                                )}
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="font-black text-slate-900 mb-6 uppercase text-[11px] tracking-widest border-b border-slate-50 pb-4">Управление</h3>

                        <div className="flex flex-col gap-3">
                            {isActive ? (
                                <>
                                    <button className="w-full flex justify-center items-center gap-2 py-4 bg-[#1d4ed8] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-[#1e40af] transition-all active:scale-[0.98]">
                                        <CalendarPlus size={18} />
                                        В календарь
                                    </button>
                                    <button className="w-full flex justify-center items-center gap-2 py-4 bg-white text-slate-900 font-bold text-xs uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm">
                                        <Settings2 size={18} />
                                        Изменить
                                    </button>
                                    <button
                                        onClick={() => setShowCancelConfirm(true)}
                                        className="w-full flex justify-center items-center gap-2 py-4 bg-white text-rose-600 font-bold text-xs uppercase tracking-widest rounded-xl border border-rose-100 hover:bg-rose-50 transition-all active:scale-[0.98] shadow-sm mt-2"
                                    >
                                        <Trash2 size={18} />
                                        Отменить
                                    </button>
                                </>
                            ) : isCompleted ? (
                                <button
                                    onClick={() => setShowReviewModal(true)}
                                    className="w-full flex justify-center items-center gap-2 py-4 bg-[#1d4ed8] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-[#1e40af] transition-all"
                                >
                                    <Star size={18} />
                                    Оставить отзыв
                                </button>
                            ) : (
                                <div className="p-6 bg-slate-50 rounded-xl text-center border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Бронирование: {(STATUS_MAP[booking.status]?.label || booking.status)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="h-32 bg-slate-50 flex items-center justify-center border-b border-slate-100 text-slate-200">
                            <MapPin size={48} strokeWidth={1} />
                        </div>
                        <div className="p-5 flex justify-between items-center bg-white">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Местоположение</p>
                                <p className="font-bold text-slate-900 text-sm">{booking.restaurant_name}</p>
                            </div>
                            <button className="text-[#1d4ed8] hover:opacity-70 transition-opacity">
                                <Navigation size={20} />
                            </button>
                        </div>
                    </div>

                    {isActive && (
                        <div className="bg-white rounded-2xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/30 shadow-sm p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-[#1d4ed8] -rotate-12 translate-x-4 -translate-y-4 group-hover:rotate-0 group-hover:translate-x-0 transition-transform">
                                <UtensilsCrossed size={96} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1 uppercase tracking-tight">Предзаказ кухни</h3>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-6 relative z-10 leading-relaxed">Выберите блюда заранее, чтобы к вашему приходу всё было готово.</p>

                            {!activeOrder || activeOrder.status === 'draft' ? (
                                <button
                                    onClick={handlePreOrderStart}
                                    disabled={fetchingMenu}
                                    className="w-full py-4 bg-[#1d4ed8] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#1e40af] transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 relative z-10 active:scale-[0.98]"
                                >
                                    {fetchingMenu ? <Plus size={18} className="animate-spin" /> : <ShoppingBag size={18} />}
                                    {activeOrder ? 'Продолжить выбор' : 'Смотреть меню'}
                                </button>
                            ) : (
                                <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs uppercase tracking-widest border border-emerald-100 flex items-center justify-center gap-2 relative z-10">
                                    <CheckCircle2 size={18} />
                                    Заказ оформлен
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {showMenu && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
                    <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm">
                            <h2 className="text-xl font-black tracking-tight">Меню заведения</h2>
                            <button onClick={() => setShowMenu(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                            {menuCategories.map(cat => (
                                <div key={cat.id} className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4ed8]">{cat.name}</h4>
                                    <div className="space-y-3">
                                        {cat.items.map(item => {
                                            const inCart = activeOrder?.items.find((i: any) => i.menu_item === item.id);
                                            return (
                                                <div key={item.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group">
                                                    <div className="size-16 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                                                        {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-bold text-sm tracking-tight text-slate-900">{item.name}</h5>
                                                            <span className="font-black text-[#1d4ed8] text-sm tabular-nums">₸{Number(item.price).toLocaleString()}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 line-clamp-1 mt-1 mb-3 font-medium">{item.description}</p>
                                                        {inCart ? (
                                                            <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-1 w-fit">
                                                                <button onClick={() => addToOrder(item.id, inCart.quantity - 1)} className="size-7 bg-white rounded-md text-slate-600 font-bold hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm">-</button>
                                                                <span className="text-xs font-black w-4 text-center">{inCart.quantity}</span>
                                                                <button onClick={() => addToOrder(item.id, inCart.quantity + 1)} className="size-7 bg-white rounded-md text-slate-600 font-bold hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm">+</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => addToOrder(item.id, 1)} className="text-[10px] font-black text-[#1d4ed8] uppercase tracking-widest hover:opacity-70 transition-opacity flex items-center gap-1.5">
                                                                <Plus size={14} /> Добавить
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
                        {activeOrder?.items.length > 0 && activeOrder.status === 'draft' && (
                            <div className="p-8 bg-blue-50 border-t border-blue-100 shadow-[0_-20px_50px_rgba(0,0,0,0.08)] rounded-t-[2.5rem]">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{activeOrder.items.length} позиций</p>
                                        <p className="text-2xl font-black tracking-tight text-slate-900 uppercase">₸{Number(activeOrder.total_amount).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button onClick={confirmOrder} className="w-full py-4 bg-[#1d4ed8] text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-[#1e40af] transition-all active:scale-[0.98]">
                                    Оформить предзаказ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showReviewModal && (
                <GuestWriteReviewModal
                    bookingId={booking.id}
                    restaurantName={booking.restaurant_name}
                    onClose={() => setShowReviewModal(false)}
                    onSuccess={() => {
                        setShowReviewModal(false);
                        toast.success('Review posted successfully!');
                    }}
                />
            )}

            <ConfirmModal
                isOpen={showCancelConfirm}
                title="Отмена бронирования"
                description="Вы уверены, что хотите отменить это бронирование? Это действие нельзя будет отменить."
                confirmLabel="Да, отменить"
                onConfirm={handleCancel}
                onCancel={() => setShowCancelConfirm(false)}
            />
        </div>
    );
}
