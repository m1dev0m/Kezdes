import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Store, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/auth/logic/AuthContext';

export default function RoleSelection() {
    const [loading, setLoading] = useState<string | null>(null);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            return;
        }
        if (user.role === 'pending' && user.restaurant_verified === false && user.restaurant_setup_required === false) {
            navigate('/register-restaurant/pending', { replace: true });
        }
    }, [navigate, user]);

    const handleSelectRole = async (role: 'owner' | 'customer') => {
        setLoading(role);
        try {
            if (role === 'owner') {
                navigate('/setup-restaurant');
                return;
            }

            await api.post('/auth/update-role/', { role });

            
            const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
            if (accessToken && refreshToken) {
                await login(accessToken, refreshToken);
            }

            toast.success('Welcome, Guest');
            navigate('/restaurants');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to set role');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center p-6 font-inter">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-16">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1d4ed8] text-white shadow-xl shadow-blue-100 mb-6 font-bold text-xl">
                        K
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4 uppercase">Как вы планируете использовать Kezdes?</h1>
                    <p className="text-slate-500 max-w-lg mx-auto font-bold text-xs uppercase tracking-widest">Выберите тип аккаунта для настройки инструментов</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {}
                    <button
                        onClick={() => handleSelectRole('customer')}
                        disabled={!!loading}
                        className="group relative flex flex-col items-start p-10 bg-white border-2 border-transparent hover:border-[#1d4ed8] rounded-[3rem] shadow-2xl shadow-slate-200/50 transition-all text-left disabled:opacity-50"
                    >
                        <div className="w-16 h-16 bg-blue-50 text-[#1d4ed8] rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-inner border border-blue-100/50">
                            <User size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight uppercase">Я пользователь</h2>
                        <p className="text-slate-500 text-xs font-bold leading-6 mb-8 flex-1 uppercase tracking-wider">
                            Бронируйте столы, просматривайте меню и копите бонусы. Идеально для гостей, которые любят комфорт.
                        </p>
                        <div className="flex items-center gap-2 text-white font-bold text-[10px] uppercase tracking-[0.2em] bg-[#1d4ed8] px-6 py-3 rounded-xl shadow-lg shadow-blue-100">
                            {loading === 'customer' ? <Loader2 className="animate-spin" size={16} /> : (
                                <>Продолжить как гость <ArrowRight size={16} /></>
                            )}
                        </div>
                    </button>

                    {}
                    <button
                        onClick={() => handleSelectRole('owner')}
                        disabled={!!loading}
                        className="group relative flex flex-col items-start p-10 bg-white border-2 border-transparent hover:border-[#1d4ed8] rounded-[3rem] shadow-2xl shadow-slate-200/50 transition-all text-left disabled:opacity-50"
                    >
                        <div className="w-16 h-16 bg-blue-50 text-[#1d4ed8] rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-inner border border-blue-100/50">
                            <Store size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight uppercase">Я админ ресторана</h2>
                        <p className="text-slate-500 text-xs font-bold leading-6 mb-8 flex-1 uppercase tracking-wider">
                            Управляйте бронированиями, настраивайте схему столов и следите за аналитикой. Полнофункциональная CRM.
                        </p>
                        <div className="flex items-center gap-2 text-white font-bold text-[10px] uppercase tracking-[0.2em] bg-[#1d4ed8] px-6 py-3 rounded-xl shadow-lg shadow-blue-100">
                            {loading === 'owner' ? <Loader2 className="animate-spin" size={16} /> : (
                                <>Настроить ресторан <ArrowRight size={16} /></>
                            )}
                        </div>
                    </button>
                </div>

                <p className="mt-12 text-center text-xs text-slate-400 font-medium">
                    Вы сможете изменить тип аккаунта позже в настройках профиля.
                </p>
            </div>
        </div>
    );
}
