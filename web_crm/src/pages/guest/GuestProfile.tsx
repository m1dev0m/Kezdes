import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import toast from 'react-hot-toast';
import {
  LogOut,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Lock,
  Camera,
  Trash2,
  Key,
  ShieldCheck
} from 'lucide-react';

export default function GuestProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: (user as any)?.profile?.phone || (user as any)?.phone || '',
    country: (user as any)?.profile?.country || 'Казахстан',
    city: (user as any)?.profile?.city || 'Алматы',
  });

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.patch('/auth/me/', formData);
      toast.success('Профиль успешно обновлен');
    } catch {
      toast.error('Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Вы успешно вышли из системы');
  };

  return (
    <div className="max-w-[800px] mx-auto px-6 py-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Page Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Настройки профиля</h1>
          <p className="text-sm font-medium leading-7 text-slate-500 uppercase tracking-wider">Управление персональными данными и безопасностью аккаунта.</p>
        </div>
        <button
          onClick={handleLogout}
          className="h-12 px-6 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 text-xs font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </header>

      {/* Profile Photo Section */}
      <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="size-32 rounded-full border-4 border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-800 shadow-xl overflow-hidden flex items-center justify-center border-blue-50">
              {(user as any)?.avatar ? (
                <img src={(user as any).avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-[#1d4ed8]">{formData.username?.charAt(0).toUpperCase() || 'G'}</span>
              )}
            </div>
            <button className="absolute bottom-1 right-1 size-10 bg-[#1d4ed8] text-white rounded-full shadow-lg border-2 border-white dark:border-slate-900 flex items-center justify-center hover:scale-110 transition-transform">
              <Camera size={18} />
            </button>
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 uppercase">Фото профиля</h3>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider leading-relaxed">Это изображение будет видно другим пользователям. Рекомендуемый размер 400x400px.</p>
            </div>
            <div className="flex justify-center md:justify-start gap-3">
              <button className="h-10 px-6 bg-[#1d4ed8] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#1e40af] transition-all">Загрузить</button>
              <button className="h-10 px-6 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">Удалить</button>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Personal Details Section */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex items-center gap-3 text-[#1d4ed8]">
            <User size={24} />
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-[0.1em]">Личная информация</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InputField
              label="Полное имя"
              icon={<User size={18} />}
              value={formData.username}
              onChange={(v) => setFormData(p => ({ ...p, username: v }))}
            />
            <InputField
              label="Электронная почта"
              icon={<Mail size={18} />}
              type="email"
              value={formData.email}
              onChange={(v) => setFormData(p => ({ ...p, email: v }))}
            />
            <InputField
              label="Номер телефона"
              icon={<Phone size={18} />}
              type="tel"
              value={formData.phone}
              onChange={(v) => setFormData(p => ({ ...p, phone: v }))}
            />
            <InputField
              label="Ваш город"
              icon={<MapPin size={18} />}
              value={formData.city}
              onChange={(v) => setFormData(p => ({ ...p, city: v }))}
            />
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex items-center gap-3 text-[#1d4ed8]">
            <Shield size={24} />
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-[0.1em]">Безопасность</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InputField label="Текущий пароль" icon={<Lock size={18} />} type="password" value="" onChange={() => { }} />
            <div className="hidden md:block" />
            <InputField label="Новый пароль" icon={<Key size={18} />} type="password" value="" onChange={() => { }} />
            <InputField label="Повторите пароль" icon={<ShieldCheck size={18} />} type="password" value="" onChange={() => { }} />
          </div>
        </section>

        {/* Action Buttons */}
        <div className="pt-8 flex flex-col-reverse md:flex-row items-center justify-between gap-6 border-t border-slate-100 dark:border-slate-800">
          <button type="button" className="group flex items-center gap-2 text-slate-400 hover:text-rose-500 transition-colors">
            <Trash2 size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Удалить мой аккаунт</span>
          </button>

          <div className="flex w-full md:w-auto gap-4">
            <button
              type="button"
              onClick={() => navigate('/guest/dashboard')}
              className="flex-1 md:px-10 h-14 bg-slate-50 text-slate-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 md:px-12 h-14 bg-[#1d4ed8] text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-2xl shadow-[#1d4ed8]/20 hover:bg-[#1e40af] hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function InputField({ label, icon, value, type = 'text', onChange }: { label: string; icon: React.ReactNode; value: string; type?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3 group">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] pl-1">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1d4ed8] transition-colors">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-14 pl-14 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#1d4ed8] transition-all text-sm font-bold placeholder:font-medium text-slate-900"
        />
      </div>
    </div>
  );
}
