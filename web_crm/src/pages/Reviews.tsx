import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';

interface Review {
    id: number;
    user_name: string;
    rating: number;
    comment: string | null;
    reply_text: string | null;
    created_at: string;
}

export default function Reviews() {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');

    useEffect(() => {
        if (user?.restaurant) {
            fetchReviews();
        }
    }, [user]);

    const fetchReviews = async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/restaurants/${user?.restaurant}/reviews/`);
            setReviews(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load reviews');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReply = async (reviewId: number) => {
        if (!replyText.trim()) return;

        try {
            await api.patch(`/restaurants/${user?.restaurant}/reviews/${reviewId}/`, {
                reply_text: replyText
            });
            toast.success('Reply posted successfully');
            setReplyingTo(null);
            setReplyText('');
            fetchReviews();
        } catch (error) {
            console.error(error);
            toast.error('Failed to post reply');
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto px-6 py-10 space-y-12 animate-in fade-in duration-700">

            {/* Page Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">Reviews & Feedback</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Manage and respond to your guest's dining experiences.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-[#0047FF]/10 text-[#0047FF] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] fill-1">star</span>
                        4.8 Average Rating
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <div className="size-12 border-4 border-[#0047FF]/20 border-t-[#0047FF] rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading review feed...</span>
                </div>
            ) : reviews.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 p-24 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="size-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
                        <span className="material-symbols-outlined text-slate-300 text-[48px]">reviews</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">No reviews yet</h3>
                        <p className="text-slate-500 font-medium max-w-sm mx-auto">
                            Connect with your guests and gather feedback to improve your service.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <AnimatePresence>
                        {reviews.map((review) => (
                            <motion.div
                                key={review.id}
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:shadow-[#0047FF]/5 transition-all"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                                    <div className="flex gap-5">
                                        <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl font-black text-[#0047FF] border border-slate-100 dark:border-slate-800">
                                            {review.user_name?.[0]?.toUpperCase() || 'G'}
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tight">{review.user_name || 'Anonymous Guest'}</h3>
                                            <div className="flex items-center gap-3">
                                                <div className="flex text-yellow-500">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <span key={s} className={`material-symbols-outlined text-[16px] ${s <= review.rating ? 'fill-1' : ''}`}>star</span>
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {!review.reply_text && replyingTo !== review.id && (
                                        <button
                                            onClick={() => setReplyingTo(review.id)}
                                            className="h-10 px-6 rounded-xl bg-[#0047FF] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0039cc] transition-all flex items-center gap-2 shadow-lg shadow-[#0047FF]/20"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">reply</span>
                                            Respond
                                        </button>
                                    )}
                                </div>

                                {review.comment && (
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-lg mb-8 max-w-3xl border-l-4 border-[#0047FF]/10 pl-6">
                                        "{review.comment}"
                                    </p>
                                )}

                                {review.reply_text && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 mt-6 border border-slate-100 dark:border-slate-800 relative group/reply">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="size-8 rounded-lg bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[16px] fill-1">restaurant</span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Official Response</span>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed italic">
                                            {review.reply_text}
                                        </p>
                                    </div>
                                )}

                                {replyingTo === review.id && (
                                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800">
                                        <div className="flex flex-col gap-4">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Write a professional response to your guest..."
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 text-sm font-medium focus:ring-4 focus:ring-[#0047FF]/5 focus:border-[#0047FF] transition-all min-h-[120px] outline-none"
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                    className="h-11 px-6 bg-white dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleReply(review.id)}
                                                    disabled={!replyText.trim()}
                                                    className="h-11 px-8 bg-[#0047FF] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#0047FF]/20 hover:bg-[#0039cc] transition-all disabled:opacity-50"
                                                >
                                                    Post Reply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
