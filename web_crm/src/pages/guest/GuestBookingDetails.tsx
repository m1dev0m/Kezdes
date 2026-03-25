import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { format, parseISO } from 'date-fns';
import GuestWriteReviewModal from './GuestWriteReviewModal';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Logo } from '@/components/ui/Logo';

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
    const { user } = useAuth();
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

    if (loading) return <div className="flex justify-center items-center h-screen text-slate-500 font-medium">Loading details...</div>;
    if (!booking) return <div className="flex justify-center items-center h-screen text-red-500 font-medium">Booking not found.</div>;

    const isActive = ['pending', 'confirmed', 'payment_pending', 'approved', 'arrived'].includes(booking.status);
    const isCompleted = booking.status === 'completed';
    const isSeated = booking.status === 'seated';

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <nav className="flex items-center gap-2 mb-2 text-sm">
                        <Link to="/guest/dashboard" className="text-slate-500 hover:text-primary font-medium transition-colors">My Bookings</Link>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900 font-bold">Booking #{booking.id}</span>
                    </nav>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{booking.restaurant_name}</h1>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${isSeated ? 'bg-primary/10 text-primary border border-primary/20' : isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : isCompleted ? 'bg-slate-200 text-slate-600 border border-slate-300' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                        {booking.status === 'seated' ? 'CURRENTLY SEATED' : booking.status.replace(/_/g, ' ')}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-8">

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date</span>
                                <span className="text-lg font-black text-slate-900">{format(parseISO(`${booking.date}T00:00:00`), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time</span>
                                <span className="text-lg font-black text-slate-900">{booking.time.substring(0, 5)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Guests</span>
                                <span className="text-lg font-black text-slate-900">{booking.guests} People</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirmation</span>
                                <span className="text-lg font-black text-slate-900">#{booking.id.toString().padStart(5, '0')}</span>
                            </div>
                        </div>

                        {booking.special_requests && (
                            <div className="px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-100">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Special Requests</span>
                                <p className="text-sm font-medium text-slate-700 italic">"{booking.special_requests}"</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Seating Map</h3>
                                <p className="text-sm text-slate-500">
                                    {booking.table_id ? 'Your table is highlighted on the floor plan.' : 'Table will be assigned upon arrival.'}
                                </p>
                            </div>
                            {booking.table_id && (
                                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                                    <div className="size-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-xs font-bold text-primary tracking-wide">
                                        TABLE {restaurantTables.find(t => t.id === booking.table_id)?.number || booking.table_id}
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
                                                <circle r={table.width / 2} cx={table.width / 2} cy={table.height / 2} className={`stroke-2 transition-all ${isMyTable ? 'fill-primary stroke-primary/80 shadow-2xl' : 'fill-white stroke-slate-300'}`} />
                                            ) : (
                                                <rect width={table.width} height={table.height} rx="6" className={`stroke-2 transition-all ${isMyTable ? 'fill-primary stroke-primary/80 shadow-2xl' : 'fill-white stroke-slate-300'}`} />
                                            )}
                                            <text x={table.width / 2} y={table.height / 2} textAnchor="middle" dominantBaseline="middle" className={`text-sm font-black ${isMyTable ? 'fill-white' : 'fill-slate-400'}`}>
                                                {table.number}
                                            </text>
                                            {isMyTable && <circle r="6" cx={table.width} cy="0" className="fill-emerald-400 stroke-2 stroke-white animate-pulse" />}
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
                        <h3 className="font-bold text-slate-900 mb-4">Manage Reservation</h3>

                        <div className="flex flex-col gap-3">
                            {isActive ? (
                                <>
                                    <button className="w-full flex justify-center items-center py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors">
                                        Add to Calendar
                                    </button>
                                    <button className="w-full flex justify-center items-center py-3.5 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                                        Modify Booking
                                    </button>
                                    <button
                                        onClick={() => setShowCancelConfirm(true)}
                                        className="w-full flex justify-center items-center py-3.5 bg-white text-red-600 font-bold rounded-xl border border-slate-200 hover:bg-red-50 transition-colors shadow-sm mt-2"
                                    >
                                        Cancel Reservation
                                    </button>
                                </>
                            ) : isCompleted ? (
                                <button
                                    onClick={() => setShowReviewModal(true)}
                                    className="w-full flex justify-center items-center py-3.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors"
                                >
                                    Write a Review
                                </button>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl text-center">
                                    <p className="text-sm font-medium text-slate-500">Booking is {booking.status.replace(/_/g, ' ')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="h-32 bg-slate-100 flex items-center justify-center border-b border-slate-200">
                            <span className="material-symbols-outlined text-slate-300 text-5xl">map</span>
                        </div>
                        <div className="p-5 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location</p>
                                <p className="font-bold text-slate-900">{booking.restaurant_name}</p>
                            </div>
                            <button className="text-primary hover:text-primary/80 transition-colors">
                                <span className="material-symbols-outlined">directions</span>
                            </button>
                        </div>
                    </div>

                    {isActive && (
                        <div className="bg-white rounded-2xl border border-primary/20 bg-gradient-to-b from-white to-primary/5 shadow-sm p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <span className="material-symbols-outlined text-8xl">room_service</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">Pre-order Food</h3>
                            <p className="text-sm text-slate-600 mb-6 relative z-10">Skip the wait and have your food ready when you arrive.</p>

                            {!activeOrder || activeOrder.status === 'draft' ? (
                                <button
                                    onClick={handlePreOrderStart}
                                    disabled={fetchingMenu}
                                    className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 relative z-10"
                                >
                                    {fetchingMenu ? <span className="animate-spin material-symbols-outlined text-sm">refresh</span> : null}
                                    {activeOrder ? 'Continue Order' : 'View Menu'}
                                </button>
                            ) : (
                                <div className="w-full py-3 bg-emerald-100 text-emerald-800 rounded-xl font-bold border border-emerald-200 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    Order Placed
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {showMenu && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
                    <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-black">Menu</h2>
                            <button onClick={() => setShowMenu(false)} className="text-slate-400 hover:text-slate-900"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">
                            {menuCategories.map(cat => (
                                <div key={cat.id} className="space-y-4">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">{cat.name}</h4>
                                    <div className="space-y-3">
                                        {cat.items.map(item => {
                                            const inCart = activeOrder?.items.find((i: any) => i.menu_item === item.id);
                                            return (
                                                <div key={item.id} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                    <div className="size-16 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                                        {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between">
                                                            <h5 className="font-bold text-sm">{item.name}</h5>
                                                            <span className="font-black text-primary text-sm">₸{Number(item.price).toLocaleString()}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 mb-2">{item.description}</p>
                                                        {inCart ? (
                                                            <div className="flex items-center gap-3">
                                                                <button onClick={() => addToOrder(item.id, inCart.quantity - 1)} className="size-6 bg-slate-100 rounded text-slate-600 font-bold hover:bg-slate-200 flex items-center justify-center">-</button>
                                                                <span className="text-xs font-bold w-3 text-center">{inCart.quantity}</span>
                                                                <button onClick={() => addToOrder(item.id, inCart.quantity + 1)} className="size-6 bg-slate-100 rounded text-slate-600 font-bold hover:bg-slate-200 flex items-center justify-center">+</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => addToOrder(item.id, 1)} className="text-xs font-bold text-primary hover:text-primary/80">Add to order</button>
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
                            <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-sm font-bold text-slate-500">{activeOrder.items.length} items</p>
                                    <p className="text-xl font-black">₸{Number(activeOrder.total_amount).toLocaleString()}</p>
                                </div>
                                <button onClick={confirmOrder} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all">
                                    Confirm Pre-order
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
                title="Cancel Reservation"
                description="Are you sure you want to cancel this reservation? This cannot be undone."
                confirmLabel="Cancel Booking"
                onConfirm={handleCancel}
                onCancel={() => setShowCancelConfirm(false)}
            />
        </div>
    );
}
