import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { MapPin, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';

const CITIES = [
  { value: 'Алматы', label: 'Алматы' },
  { value: 'Астана', label: 'Астана' },
];

export default function SetupRestaurant() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [form, setForm] = useState({
    restaurant_name: '',
    city: 'Алматы',
    address: '',
    phone: '',
    instagram: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!loading && user && user.role !== 'restaurant_admin') {
      navigate('/', { replace: true });
      return;
    }
    if (!loading && user && !user.restaurant_setup_required && !user.restaurant_verified) {
      navigate('/register-restaurant/pending', { replace: true });
    }
    if (!loading && user && user.restaurant_verified) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [loading, navigate, user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!form.restaurant_name.trim()) {
      toast.error('Введите название ресторана');
      return;
    }
    
    if (!form.address.trim()) {
      toast.error('Введите адрес ресторана');
      return;
    }
    
    if (!form.phone.trim()) {
      toast.error('Введите номер телефона');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/auth/setup-restaurant/', form);
      toast.success('Заявка отправлена на модерацию');
      navigate('/register-restaurant/pending', { replace: true });
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.detail ||
        'Не удалось отправить заявку';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl"
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black">
            K
          </div>
          <span className="text-xl"><Logo /></span>
        </Link>

        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-black text-slate-900 dark:text-white mb-2"
        >
          Настройка ресторана
        </motion.h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Заполните данные ресторана. После отправки заявка уйдет на модерацию.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Название ресторана</label>
            <input
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={form.restaurant_name}
              onChange={(e) => setForm((p) => ({ ...p, restaurant_name: e.target.value }))}
              placeholder="Название вашего заведения"
              required
            />
          </div>

          <div className="relative">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Город</label>
            <button
              type="button"
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <MapPin size={16} className="text-primary" />
                {form.city}
              </span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCityDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-10"
              >
                {CITIES.map(city => (
                  <button
                    key={city.value}
                    type="button"
                    onClick={() => {
                      setForm(p => ({ ...p, city: city.value }));
                      setShowCityDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-primary/10 transition-colors ${form.city === city.value ? 'text-primary bg-primary/5' : 'text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    {city.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Адрес</label>
            <input
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Улица Абая, 10"
              required
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Телефон</label>
            <input
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+7 (777) 123-45-67"
              required
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Instagram <span className="text-slate-300">(необязательно)</span></label>
            <input
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={form.instagram}
              onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))}
              placeholder="@restaurant_almaty"
            />
          </div>

          <motion.button
            type="submit"
            disabled={submitting}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-primary text-white font-black py-4 rounded-2xl disabled:opacity-60 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 mt-6"
          >
            {submitting ? 'Отправка...' : 'Отправить заявку'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
