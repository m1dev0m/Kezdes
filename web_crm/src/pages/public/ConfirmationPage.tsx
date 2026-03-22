import { Link, useParams, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, CalendarDays, Clock, Users, MapPin, Edit, X } from 'lucide-react';

interface BookingState {
    date?: string;
    time?: string;
    guests?: number;
    restaurantName?: string;
    confirmationNumber?: string;
}

export default function ConfirmationPage() {
    const { id } = useParams();
    const location = useLocation();
    const state = location.state as BookingState | null;

    const confirmationNum = state?.confirmationNumber || `BK-${Math.floor(10000 + Math.random() * 90000)}`;

    return (
        <div className="min-h-screen bg-[#f8f6f6] font-sans text-slate-900">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 lg:px-40 bg-[#f8f6f6] sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="text-[#1A3C34]">
                        <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0)">
                                <path fillRule="evenodd" clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" />
                            </g>
                            <defs><clipPath id="clip0"><rect width="48" height="48" fill="white" /></clipPath></defs>
                        </svg>
                    </div>
                    <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight">Kezdes</h2>
                </div>
                <div className="flex gap-3">
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 hover:bg-[#1A3C34]/20 transition-colors" aria-label="Share">
                        <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-start py-8 px-4 max-w-4xl mx-auto w-full">
                {/* Success Icon */}
                <div className="mb-6 flex flex-col items-center">
                    <div className="bg-[#1A3C34]/10 p-6 rounded-full mb-6">
                        <CheckCircle className="w-16 h-16 text-[#1A3C34]" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 tracking-tight">Your table is reserved!</h1>
                    <p className="text-slate-500 text-lg font-medium">Confirmation #{confirmationNum}</p>
                </div>

                {/* Booking Details Card */}
                <div className="w-full bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        {/* Restaurant Info */}
                        <div className="p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100">
                            <div>
                                <span className="text-[#1A3C34] text-xs font-bold uppercase tracking-widest">Restaurant Details</span>
                                <h3 className="text-2xl font-bold mt-2 mb-1">{state?.restaurantName || 'Kezdes Restaurant'}</h3>
                                <div className="flex items-center gap-2 text-slate-600 mb-6">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-sm">Your reserved table awaits</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg">
                                {state?.date && (
                                    <div className="flex items-center gap-3">
                                        <CalendarDays className="w-5 h-5 text-[#1A3C34]" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Date</p>
                                            <p className="text-sm font-bold">{state.date}</p>
                                        </div>
                                    </div>
                                )}
                                {state?.time && (
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-[#1A3C34]" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Time</p>
                                            <p className="text-sm font-bold">{state.time}</p>
                                        </div>
                                    </div>
                                )}
                                {state?.guests && (
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-[#1A3C34]" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Guests</p>
                                            <p className="text-sm font-bold">{state.guests} {state.guests === 1 ? 'Person' : 'People'}</p>
                                        </div>
                                    </div>
                                )}
                                {!state?.date && !state?.time && !state?.guests && (
                                    <p className="text-sm text-slate-500">Your reservation has been received and is pending confirmation.</p>
                                )}
                            </div>
                        </div>

                        {/* Visual Section */}
                        <div className="relative min-h-[250px] md:min-h-full bg-slate-200">
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800')" }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-6">
                                <button className="w-full flex items-center justify-center gap-2 bg-white/90 backdrop-blur-sm text-slate-900 py-3 px-6 rounded-xl font-bold hover:bg-white transition-all shadow-md">
                                    <CalendarDays className="w-5 h-5" />
                                    Add to Calendar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pre-order CTA */}
                <div className="w-full bg-[#1A3C34] rounded-xl p-8 text-white shadow-xl shadow-[#1A3C34]/20 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                    <div className="text-center md:text-left">
                        <h4 className="text-2xl font-bold mb-2">Want to skip the wait?</h4>
                        <p className="text-white/80">Browse our seasonal menu and pre-order your favorites now for a seamless dining experience.</p>
                    </div>
                    <Link
                        to={`/restaurant/${id}`}
                        className="whitespace-nowrap bg-white text-[#1A3C34] px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-colors shadow-lg flex items-center gap-2"
                    >
                        Pre-order Menu
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

                {/* Secondary Actions */}
                <div className="w-full grid grid-cols-2 gap-4 mb-12">
                    <Link
                        to="/guest/dashboard"
                        className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-slate-200 font-bold hover:bg-slate-100 transition-colors"
                    >
                        <Edit className="w-5 h-5" />
                        View Bookings
                    </Link>
                    <Link
                        to={`/restaurant/${id}`}
                        className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-slate-200 font-bold hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                        Back to Restaurant
                    </Link>
                </div>
            </main>
        </div>
    );
}
