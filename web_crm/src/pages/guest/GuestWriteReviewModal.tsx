import { useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';

interface GuestWriteReviewModalProps {
    bookingId: number;
    restaurantId: number;
    restaurantName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GuestWriteReviewModal({ bookingId, restaurantId, restaurantName, onClose, onSuccess }: GuestWriteReviewModalProps) {
    const { t } = useI18n();
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const getRatingLabel = () => {
        const value = hoveredRating || rating;
        switch (value) {
            case 5: return t('reviews.ratingExcellent');
            case 4: return t('reviews.ratingVeryGood');
            case 3: return t('reviews.ratingAverage');
            case 2: return t('reviews.ratingPoor');
            case 1: return t('reviews.ratingTerrible');
            default: return t('reviews.ratingSelect');
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            setErrorMessage(t('reviews.selectRatingError'));
            toast.error(t('reviews.selectRatingError'));
            return;
        }
        setErrorMessage(null);
        setLoading(true);
        try {
            await api.post(`/restaurants/${restaurantId}/reviews/`, {
                rating,
                comment,
                booking_id: bookingId,
                is_anonymous: isAnonymous,
            });
            onSuccess();
        } catch (err: any) {
            const detail = err.response?.data?.detail || t('reviews.submitError');
            setErrorMessage(detail);
            toast.error(detail);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[640px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">{t('reviews.writeTitle')}</h1>
                        <p className="text-slate-500 text-sm mt-1 uppercase tracking-wider font-bold">{t('reviews.shareExperiencePrefix')} <span className="text-[#1d4ed8]">{restaurantName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="px-8 py-4 overflow-y-auto max-h-[80vh]">
                    <div className="flex flex-col items-center justify-center py-6 border-b border-slate-100 mb-6">
                        <p className="text-slate-900 font-bold mb-3 text-lg uppercase tracking-tight">{t('reviews.howWasVisit')}</p>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className="group"
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    onClick={() => setRating(star)}
                                >
                                    <span className={`material-symbols-outlined text-5xl transition-all group-hover:scale-110 ${(hoveredRating || rating) >= star ? 'text-[#1d4ed8] drop-shadow-sm' : 'text-slate-300'}`} style={{ fontVariationSettings: `'FILL' ${(hoveredRating || rating) >= star ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 48` }}>
                                        star
                                    </span>
                                </button>
                            ))}
                        </div>
                        <p className="text-[#1d4ed8] text-xs font-bold uppercase tracking-widest mt-3 h-4">
                            {rating > 0 || hoveredRating > 0 ? getRatingLabel() : ''}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {errorMessage && (
                            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                {errorMessage}
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 font-bold text-xs uppercase tracking-widest">{t('reviews.yourReview')}</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full min-h-[160px] p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-[#1d4ed8] outline-none transition-all resize-none placeholder:text-slate-400 font-medium"
                                placeholder={t('reviews.reviewPlaceholder')}
                            ></textarea>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 font-bold text-xs uppercase tracking-widest">{t('reviews.addPhoto')} <span className="text-slate-400 font-normal opacity-60">({t('reviews.comingSoon')})</span></label>
                            <div className="flex flex-wrap gap-3">
                                <button disabled className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                                    <span className="material-symbols-outlined text-slate-400 text-2xl">add_a_photo</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t('guestProfile.upload')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <input
                            id="anonymous"
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="rounded border-slate-300 text-[#1d4ed8] focus:ring-[#1d4ed8] size-4"
                        />
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 cursor-pointer select-none" htmlFor="anonymous">{t('reviews.publishAnonymously')}</label>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button disabled={loading || rating === 0} onClick={handleSubmit} className="flex-1 sm:flex-none min-w-[140px] px-8 py-3 bg-[#1d4ed8] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70">
                            {loading ? t('reviews.publishing') : t('reviews.submit')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
