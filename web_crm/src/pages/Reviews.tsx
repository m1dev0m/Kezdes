import { useState, useEffect } from 'react';
import { Star, MessageSquareReply, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
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
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Отзывы</h1>
                <p className="text-slate-500 font-medium mt-1">Отзывы гостей о вашем заведении</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-primary animate-spin"></div>
                </div>
            ) : reviews.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                        <SearchX className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Пока нет отзывов</h3>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto">
                        Настройте автоматизацию «Запрос отзыва», чтобы собирать больше оценок.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <AnimatePresence>
                        {reviews.map((review) => (
                            <motion.div
                                key={review.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300">
                                            {review.user_name?.[0]?.toUpperCase() || 'Г'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{review.user_name || 'Гость'}</h3>
                                            <div className="flex items-center gap-1 mt-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        size={14}
                                                        className={star <= review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200 dark:text-slate-700"}
                                                    />
                                                ))}
                                                <span className="text-xs text-slate-400 ml-2">
                                                    {new Date(review.created_at).toLocaleDateString('ru-RU')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {!review.reply_text && replyingTo !== review.id && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setReplyingTo(review.id)}
                                            className="self-start"
                                        >
                                            <MessageSquareReply size={16} className="mr-2" />
                                            Ответить
                                        </Button>
                                    )}
                                </div>

                                {review.comment && (
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[15px] mb-6 whitespace-pre-line">
                                        {review.comment}
                                    </p>
                                )}

                                {review.reply_text && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 mt-4 ml-6 border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MessageSquareReply size={16} className="text-primary" />
                                            <span className="font-bold text-sm text-slate-900 dark:text-white">Ответ ресторана</span>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                                            {review.reply_text}
                                        </p>
                                    </div>
                                )}

                                {replyingTo === review.id && (
                                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center mt-1">
                                                <MessageSquareReply size={14} className="text-primary" />
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Напишите ответ гостю..."
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-y"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyText(''); }}>Отмена</Button>
                                                    <Button variant="primary" size="sm" onClick={() => handleReply(review.id)} disabled={!replyText.trim()}>Отправить</Button>
                                                </div>
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
