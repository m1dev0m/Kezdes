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

            // Fetch restaurant tables for map
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
            // 1. Fetch Menu
            const menuRes = await api.get(`/orders/restaurants/${booking.restaurant}/public_menu/`);
            setMenuCategories(menuRes.data);

            // 2. Create/Get Draft Order
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
            toast.error('Could not cancel reservation. It might be too late or already cancelled.');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen text-slate-500">Loading details...</div>;
    if (!booking) return <div className="flex justify-center items-center h-screen text-red-500">Booking not found.</div>;

    const isActive = ['pending', 'confirmed', 'payment_pending', 'approved', 'arrived', 'seated'].includes(booking.status);

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f5f6f8] dark:bg-[#101522] font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 md:px-10 py-3 sticky top-0 z-50">
                <div className="flex items-center gap-4 text-primary">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined">restaurant</span>
                        </div>
                        <h2 className="text-xl font-extrabold leading-tight tracking-tight"><Logo /></h2>
                    </Link>
                </div>
                <div className="flex flex-1 justify-end gap-8 items-center">
                    <nav className="hidden md:flex items-center gap-8">
                        <Link to="/search" className="text-slate-600 dark:text-slate-300 text-sm font-semibold hover:text-primary transition-colors">Explore</Link>
                        <Link to="/guest/dashboard" className="text-slate-600 dark:text-slate-300 text-sm font-semibold hover:text-primary transition-colors">My Bookings</Link>
                        <Link to="/guest/profile" className="text-slate-600 dark:text-slate-300 text-sm font-semibold hover:text-primary transition-colors">Profile</Link>
                    </nav>
                    <div className="size-10 rounded-full border-2 border-primary/20 bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden cursor-pointer">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            <main className="flex flex-1 justify-center py-8">
                <div className="flex flex-col max-w-[1024px] flex-1 px-4 md:px-10">
                    <nav className="flex items-center gap-2 mb-6">
                        <Link to="/guest/dashboard" className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors">My Bookings</Link>
                        <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
                        <span className="text-slate-900 dark:text-slate-100 text-sm font-bold">Reservation #{booking.id}</span>
                    </nav>

                    <div className="relative w-full aspect-[21/9] bg-slate-800 bg-center bg-no-repeat bg-cover rounded-xl shadow-xl overflow-hidden mb-8">
                        {booking.restaurant_photo_url && (
                            <img src={booking.restaurant_photo_url} alt="restaurant" className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between z-10">
                            <div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white mb-2 uppercase tracking-wider ${isActive ? 'bg-green-500' : 'bg-slate-500'}`}>
                                    <span className="material-symbols-outlined text-[14px] mr-1">{isActive ? 'check_circle' : 'info'}</span>
                                    {booking.status.replace('_', ' ')}
                                </span>
                                <h1 className="text-white text-3xl sm:text-4xl font-extrabold leading-tight drop-shadow-md">{booking.restaurant_name}</h1>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-xl">calendar_today</span>
                                        <p className="text-sm font-medium">Date</p>
                                    </div>
                                    <p className="text-slate-900 dark:text-white text-xl font-bold">{format(parseISO(`${booking.date}T00:00:00`), 'MMM d, yyyy')}</p>
                                </div>
                                <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-xl">schedule</span>
                                        <p className="text-sm font-medium">Time</p>
                                    </div>
                                    <p className="text-slate-900 dark:text-white text-xl font-bold">{booking.time.substring(0, 5)}</p>
                                </div>
                                <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-xl">group</span>
                                        <p className="text-sm font-medium">Guests</p>
                                    </div>
                                    <p className="text-slate-900 dark:text-white text-xl font-bold">{booking.guests} People</p>
                                </div>
                            </div>

                            {booking.special_requests && (
                                <div className="rounded-xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                    <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">priority_high</span>
                                        Special Requests & Dietary Needs
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-lg border-l-4 border-primary">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Special Request:</p>
                                            <p className="text-slate-600 dark:text-slate-400 italic">"{booking.special_requests}"</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-slate-900 dark:text-white text-lg font-bold">Your Table Location</h3>
                                    <div className="flex gap-4 text-xs font-black uppercase tracking-widest text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <div className="size-3 rounded-full bg-primary ring-2 ring-primary/20"></div>
                                            Your Seat
                                        </div>
                                    </div>
                                </div>
                                <div className="relative w-full aspect-[10/8] bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-inner">
                                    <svg viewBox="0 0 1000 800" className="w-full h-full drop-shadow-2xl">
                                        {restaurantTables.map(table => {
                                            const isMyTable = table.id === booking.table_id;
                                            return (
                                                <g key={table.id} transform={`translate(${table.x}, ${table.y})`}>
                                                    {table.table_type === 'circle' ? (
                                                        <circle
                                                            r={table.width / 2} cx={table.width / 2} cy={table.height / 2}
                                                            className={`stroke-2 transition-all ${isMyTable ? 'fill-primary stroke-primary ring-4 ring-primary/20 shadow-lg' : 'fill-white dark:fill-slate-700 stroke-slate-200 dark:stroke-slate-600 opacity-40'}`}
                                                        />
                                                    ) : (
                                                        <rect
                                                            width={table.width} height={table.height} rx={12}
                                                            className={`stroke-2 transition-all ${isMyTable ? 'fill-primary stroke-primary ring-4 ring-primary/20 shadow-lg' : 'fill-white dark:fill-slate-700 stroke-slate-200 dark:stroke-slate-600 opacity-40'}`}
                                                        />
                                                    )}
                                                    <text x={table.width / 2} y={table.height / 2} textAnchor="middle" dominantBaseline="middle" className={`text-[12px] font-black ${isMyTable ? 'fill-white' : 'fill-slate-400 opacity-40'}`}>T{table.number}</text>
                                                </g>
                                            );
                                        })}
                                        {!booking.table_id && (
                                            <text x="500" y="400" textAnchor="middle" className="fill-slate-400 text-sm font-bold italic">Table assignment pending...</text>
                                        )}
                                    </svg>
                                </div>
                            </div>

                            {/* Pre-order Section */}
                            <div className="rounded-xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
                                        </div>
                                        <div>
                                            <h3 className="text-slate-900 dark:text-white text-lg font-black uppercase tracking-tight">Pre-order Food</h3>
                                            <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Skip the wait, order ahead</p>
                                        </div>
                                    </div>
                                    {!activeOrder || activeOrder.status === 'draft' ? (
                                        <button
                                            onClick={handlePreOrderStart}
                                            disabled={fetchingMenu}
                                            className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
                                        >
                                            {fetchingMenu ? <span className="animate-spin material-symbols-outlined text-xs">refresh</span> : <span className="material-symbols-outlined text-xs">add</span>}
                                            {activeOrder ? 'Continue Ordering' : 'Start Pre-order'}
                                        </button>
                                    ) : (
                                        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-xs">check_circle</span>
                                            Order Confirmed
                                        </div>
                                    )}
                                </div>

                                {activeOrder && activeOrder.items?.length > 0 && (
                                    <div className="space-y-4 mb-6">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-8">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Your Pre-order Items</p>
                                            <div className="space-y-4">
                                                {activeOrder.items.map((item: any) => (
                                                    <div key={item.id} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-sm font-black text-slate-900 dark:text-white w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm">{item.quantity}×</div>
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.menu_item_name}</span>
                                                        </div>
                                                        <span className="text-sm font-black text-slate-900 dark:text-white">₸{Number(item.price_snapshot * item.quantity).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 mt-6 flex justify-between items-center">
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                                                    <span className="text-2xl font-black text-primary">₸{Number(activeOrder.total_amount).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showMenu && (
                                    <div className="space-y-12 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {menuCategories.map(cat => (
                                            <div key={cat.id} className="space-y-6">
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] border-l-4 border-primary pl-4">{cat.name}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {cat.items.map(item => {
                                                        const inCart = activeOrder?.items.find((i: any) => i.menu_item === item.id);
                                                        return (
                                                            <div key={item.id} className="group p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl hover:shadow-2xl hover:border-primary/20 transition-all flex gap-5">
                                                                <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden shrink-0">
                                                                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <h5 className="text-sm font-black text-slate-900 dark:text-white truncate">{item.name}</h5>
                                                                        <span className="text-sm font-black text-primary">₸{Number(item.price).toLocaleString()}</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-4 h-8">{item.description}</p>
                                                                    <div className="flex items-center gap-3">
                                                                        {inCart ? (
                                                                            <div className="flex items-center gap-3 bg-slate-900 text-white rounded-xl p-1.5">
                                                                                <button onClick={() => addToOrder(item.id, inCart.quantity - 1)} className="size-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold text-lg leading-none">－</button>
                                                                                <span className="text-xs font-black w-4 text-center">{inCart.quantity}</span>
                                                                                <button onClick={() => addToOrder(item.id, inCart.quantity + 1)} className="size-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold text-lg leading-none">＋</button>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => addToOrder(item.id, 1)}
                                                                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                Add to Order
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                        {activeOrder?.items.length > 0 && activeOrder.status === 'draft' && (
                                            <div className="sticky bottom-8 left-0 right-0 p-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-primary/20 rounded-[2.5rem] shadow-2xl flex items-center justify-between z-30 ring-1 ring-black/5">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected items: {activeOrder.items.length}</p>
                                                    <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">₸{Number(activeOrder.total_amount).toLocaleString()}</p>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setShowMenu(false)} className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50">Later</button>
                                                    <button onClick={confirmOrder} className="px-10 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Confirm Pre-order</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="sticky top-24 flex flex-col gap-4">
                                {isActive && (
                                    <button className="w-full flex items-center justify-center gap-3 rounded-xl h-14 bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.01] active:scale-95 transition-all">
                                        <span className="material-symbols-outlined">calendar_add_on</span>
                                        <span>Add to Calendar</span>
                                    </button>
                                )}

                                {isActive && (
                                    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <h4 className="text-slate-900 dark:text-white font-bold mb-4">Manage Reservation</h4>
                                        <div className="flex flex-col gap-3">
                                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                                <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">edit_calendar</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Modify Booking</span>
                                            </button>
                                            <button onClick={() => setShowCancelConfirm(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group">
                                                <span className="material-symbols-outlined text-slate-500 group-hover:text-red-500 transition-colors">cancel</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm text-left">Cancel Reservation</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {booking.status === 'completed' && (
                                    <button onClick={() => setShowReviewModal(true)} className="w-full flex items-center justify-center gap-3 rounded-xl h-14 bg-white text-primary border-2 border-primary font-bold shadow-sm hover:bg-primary/5 transition-all">
                                        <span className="material-symbols-outlined">rate_review</span>
                                        <span>Write a Review</span>
                                    </button>
                                )}

                                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="h-40 w-full bg-slate-200 dark:bg-slate-800 relative flex items-center justify-center">
                                        <span className="material-symbols-outlined text-slate-400 text-4xl">location_on</span>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-900">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Getting There</p>
                                        <button className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                                            Open in Google Maps
                                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="mt-auto py-10 px-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">© 2024 Kezdes Reservation System. All rights reserved.</p>
            </footer>

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
                description="Are you sure you want to cancel this reservation? This action cannot be undone."
                confirmLabel="Cancel Reservation"
                onConfirm={handleCancel}
                onCancel={() => setShowCancelConfirm(false)}
            />
        </div>
    );
}
