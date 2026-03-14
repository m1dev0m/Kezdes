import { Link, useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function ConfirmationPage() {
    const { id } = useParams();

    return (
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 text-center mt-12">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-3">Booking Requested!</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
                Your reservation has been received and is currently pending approval. We will contact you shortly to confirm your table.
            </p>

            <div className="space-y-4">
                <Link
                    to={`/restaurant/${id}`}
                    className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-3 px-6 rounded-xl transition-colors"
                >
                    Return to Restaurant
                </Link>
            </div>
        </div>
    );
}
