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
    restaurant_name: string;
    restaurant_photo_url?: string;
    date: string;
    time: string;
    guests: number;
    status: string;
    special_requests?: string;
    table?: number;
}

export default function GuestBookingDetails() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await api.get(`/bookings/${id}/`);
                setBooking(res.data);
            } catch (err) {
                toast.error('Failed to load booking details');
            } finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [id]);

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

    const isActive = ['pending', 'approved', 'arrived', 'seated'].includes(booking.status);

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
                                    <h3 className="text-slate-900 dark:text-white text-lg font-bold">Floor Map</h3>
                                    <div className="flex gap-4 text-xs font-medium">
                                        <div className="flex items-center gap-1"><span className="size-3 rounded-full bg-primary shadow-sm shadow-primary/40"></span> Your Table</div>
                                    </div>
                                </div>
                                <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                                    <div className="text-slate-400 text-center p-4">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">map</span>
                                        <p className="text-sm font-medium">Interactive Floor Map will be available soon.</p>
                                        {booking.table && <p className="mt-2 text-primary font-bold">Assigned to Table #{booking.table}</p>}
                                    </div>
                                </div>
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
