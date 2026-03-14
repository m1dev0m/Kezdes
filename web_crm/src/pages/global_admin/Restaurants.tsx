import { useEffect, useState } from 'react';
import { Store, ShieldCheck, MoreVertical, Search } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function Restaurants() {
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRestaurants();
    }, []);

    const loadRestaurants = async () => {
        try {
            const res = await api.get('/restaurants/');
            setRestaurants(res.data);
        } catch (error) {
            toast.error('Failed to load restaurants');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Restaurants</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage all registered businesses on the platform.</p>
                </div>

                <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search restaurants..."
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Restaurant</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner ID</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Loading restaurants...</td>
                                </tr>
                            ) : restaurants.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center">
                                            <Store className="w-8 h-8 text-slate-300 mb-2" />
                                            <p>No restaurants found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : restaurants.map((restaurant) => (
                                <tr key={restaurant.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                {restaurant.image ? (
                                                    <img src={restaurant.image} alt="" className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <Store className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{restaurant.name}</p>
                                                <p className="text-xs text-slate-500">{restaurant.phone || 'No phone'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5">
                                            {restaurant.is_verified ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                    Unverified
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-slate-600 max-w-[200px] truncate" title={restaurant.address}>
                                            {restaurant.address}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-slate-600 font-mono">
                                            {restaurant.owner || '-'}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors tooltip" aria-label="More actions">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
