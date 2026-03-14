import { useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface GuestWriteReviewModalProps {
    bookingId: number;
    restaurantName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GuestWriteReviewModal({ bookingId, restaurantName, onClose, onSuccess }: GuestWriteReviewModalProps) {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);

    const getRatingLabel = () => {
        const value = hoveredRating || rating;
        switch (value) {
            case 5: return 'Excellent';
            case 4: return 'Very Good';
            case 3: return 'Average';
            case 2: return 'Poor';
            case 1: return 'Terrible';
            default: return 'Select rating';
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error('Please select a star rating.');
            return;
        }
        setLoading(true);
        try {
            await api.post(`/restaurants/${bookingId}/reviews/`, {
                rating,
                comment,
                is_anonymous: isAnonymous,
            });
            onSuccess();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to submit review. It may already exist.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[640px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Write a Review</h1>
                        <p className="text-slate-500 text-sm mt-1">Tell others about your experience at <span className="text-primary font-semibold">{restaurantName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="px-8 py-4 overflow-y-auto max-h-[80vh]">
                    <div className="flex flex-col items-center justify-center py-6 border-b border-slate-100 dark:border-slate-800 mb-6">
                        <p className="text-slate-900 dark:text-slate-200 font-bold mb-3 text-lg">How was your visit?</p>
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
                                    <span className={`material-symbols-outlined text-5xl transition-all group-hover:scale-110 ${(hoveredRating || rating) >= star ? 'text-primary drop-shadow-sm' : 'text-slate-300 dark:text-slate-700'}`} style={{ fontVariationSettings: `'FILL' ${(hoveredRating || rating) >= star ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 48` }}>
                                        star
                                    </span>
                                </button>
                            ))}
                        </div>
                        <p className="text-primary text-xs font-bold uppercase tracking-widest mt-3 h-4">
                            {rating > 0 || hoveredRating > 0 ? getRatingLabel() : ''}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Share your experience</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full min-h-[160px] p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-400"
                                placeholder="The food was amazing, and the service was top-notch..."
                            ></textarea>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Add Photos <span className="text-slate-400 text-xs font-normal">(Coming Soon)</span></label>
                            <div className="flex flex-wrap gap-3">
                                <button disabled className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                                    <span className="material-symbols-outlined text-slate-400 text-2xl">add_a_photo</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Upload</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <input
                            id="anonymous"
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="rounded border-slate-300 text-primary focus:ring-primary size-4"
                        />
                        <label className="text-sm text-slate-500 cursor-pointer select-none" htmlFor="anonymous">Post review anonymously</label>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-3 rounded-lg text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            Cancel
                        </button>
                        <button disabled={loading} onClick={handleSubmit} className="flex-1 sm:flex-none min-w-[140px] px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70">
                            {loading ? 'Posting...' : 'Post Review'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
