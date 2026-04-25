import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';
import {
  LogOut,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Camera,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export default function GuestProfile() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const defaultCountry = t('guestProfile.defaultCountry');
  const defaultCity = t('guestProfile.defaultCity');
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [formData, setFormData] = useState({
    username: user?.username || '',
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: (user as any)?.profile?.phone || (user as any)?.phone || '',
    country: defaultCountry,
    city: defaultCity,
  });

  useEffect(() => {
    const storageKey = user?.id ? `guest-profile-preferences:${user.id}` : 'guest-profile-preferences:anonymous';
    const storedValue = window.localStorage.getItem(storageKey);
    const fallbackPhone = (user as any)?.profile?.phone || (user as any)?.phone || '';

    if (storedValue) {
      try {
        const parsed = JSON.parse(storedValue) as Partial<Pick<typeof formData, 'country' | 'city'>>;
        setFormData((current) => ({
          ...current,
          username: user?.username ?? '',
          firstName: user?.first_name ?? '',
          lastName: user?.last_name ?? '',
          email: user?.email ?? '',
          phone: fallbackPhone,
          country: parsed.country ?? defaultCountry,
          city: parsed.city ?? defaultCity,
        }));
        setSaveState('idle');
        return;
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setFormData({
      username: user?.username || '',
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
      email: user?.email || '',
      phone: fallbackPhone,
      country: defaultCountry,
      city: defaultCity,
    });
    setSaveState('idle');
  }, [defaultCity, defaultCountry, user]);

  useEffect(() => {
    if (saveState === 'saved') {
      setSaveState('idle');
    }
  }, [formData, saveState]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.patch('/auth/me/', {
        username: formData.username.trim(),
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      });

      const storageKey = user?.id ? `guest-profile-preferences:${user.id}` : 'guest-profile-preferences:anonymous';
      window.localStorage.setItem(storageKey, JSON.stringify({
        country: formData.country,
        city: formData.city,
      }));
      setSaveState('saved');
      toast.success(t('guestProfile.toastSaved'));
    } catch (error: any) {
      setSaveState('error');
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.username?.[0] ||
        error?.response?.data?.email?.[0] ||
        t('guestProfile.toastSaveError');
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success(t('guestProfile.toastLoggedOut'));
  };

  return (
    <div className="max-w-[800px] mx-auto px-6 py-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">{t('guestProfile.title')}</h1>
          <p className="text-sm font-medium leading-7 text-slate-500 uppercase tracking-wider">{t('guestProfile.subtitle')}</p>
        </div>
        <button
          onClick={handleLogout}
          className="h-12 px-6 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 text-xs font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
        >
          <LogOut size={16} />
          {t('guestProfile.logout')}
        </button>
      </header>

      {}
      <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="size-32 rounded-full border-4 border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-800 shadow-xl overflow-hidden flex items-center justify-center border-blue-50">
              {(user as any)?.avatar ? (
                <img src={(user as any).avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-[#1d4ed8]">{(formData.firstName || formData.username)?.charAt(0).toUpperCase() || 'G'}</span>
              )}
            </div>
            <button className="absolute bottom-1 right-1 size-10 bg-[#1d4ed8] text-white rounded-full shadow-lg border-2 border-white dark:border-slate-900 flex items-center justify-center hover:scale-110 transition-transform">
              <Camera size={18} />
            </button>
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 uppercase">{t('guestProfile.photoTitle')}</h3>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider leading-relaxed">{t('guestProfile.photoHint')}</p>
            </div>
            <div className="flex justify-center md:justify-start gap-3">
              <button className="h-10 px-6 bg-[#1d4ed8] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#1e40af] transition-all">{t('guestProfile.upload')}</button>
              <button className="h-10 px-6 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">{t('guestProfile.delete')}</button>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-medium leading-6 text-blue-800">
          {t('guestProfile.localPreferencesHint')}
        </div>
        {}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex items-center gap-3 text-[#1d4ed8]">
            <User size={24} />
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-[0.1em]">{t('guestProfile.personalInfo')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InputField
              label={t('guestProfile.username')}
              icon={<User size={18} />}
              value={formData.username}
              onChange={(v) => setFormData(p => ({ ...p, username: v }))}
            />
            <InputField
              label={t('guestProfile.firstName')}
              icon={<User size={18} />}
              value={formData.firstName}
              onChange={(v) => setFormData(p => ({ ...p, firstName: v }))}
            />
            <InputField
              label={t('guestProfile.lastName')}
              icon={<User size={18} />}
              value={formData.lastName}
              onChange={(v) => setFormData(p => ({ ...p, lastName: v }))}
            />
            <InputField
              label={t('guestProfile.email')}
              icon={<Mail size={18} />}
              type="email"
              value={formData.email}
              onChange={(v) => setFormData(p => ({ ...p, email: v }))}
            />
            <InputField
              label={t('guestProfile.phone')}
              icon={<Phone size={18} />}
              type="tel"
              value={formData.phone}
              onChange={(v) => setFormData(p => ({ ...p, phone: v }))}
            />
            <InputField
              label={t('guestProfile.city')}
              icon={<MapPin size={18} />}
              value={formData.city}
              onChange={(v) => setFormData(p => ({ ...p, city: v }))}
            />
            <InputField
              label={t('guestProfile.country')}
              icon={<MapPin size={18} />}
              value={formData.country}
              onChange={(v) => setFormData(p => ({ ...p, country: v }))}
            />
          </div>
        </section>

        {}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex items-center gap-3 text-[#1d4ed8]">
            <Shield size={24} />
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-[0.1em]">{t('guestProfile.security')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SecurityCard
              icon={<Mail size={16} />}
              label={t('guestProfile.securityEmailLabel')}
              value={formData.email || t('guestProfile.notSpecified')}
              hint={t('guestProfile.securityEmailHint')}
            />
            <SecurityCard
              icon={<Phone size={16} />}
              label={t('guestProfile.securityPhoneLabel')}
              value={formData.phone || t('guestProfile.notLinked')}
              hint={t('guestProfile.securityPhoneHint')}
            />
            <SecurityCard
              icon={<CheckCircle2 size={16} />}
              label={t('guestProfile.securityStatusLabel')}
              value={t('guestProfile.activeAccount')}
              hint={t('guestProfile.securityStatusHint')}
            />
          </div>
        </section>

        {}
        <div className="pt-8 flex flex-col-reverse md:flex-row items-center justify-between gap-6 border-t border-slate-100 dark:border-slate-800">
          <button type="button" className="group flex items-center gap-2 text-slate-400 hover:text-rose-500 transition-colors">
            <Trash2 size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('guestProfile.deleteAccount')}</span>
          </button>

          <div className="flex w-full md:w-auto gap-4">
            <button
              type="button"
              onClick={() => navigate('/guest/dashboard')}
              className="flex-1 md:px-10 h-14 bg-slate-50 text-slate-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 md:px-12 h-14 bg-[#1d4ed8] text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-2xl shadow-[#1d4ed8]/20 hover:bg-[#1e40af] hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? t('guestProfile.saving') : saveState === 'saved' ? t('guestProfile.saved') : t('guestProfile.saveChanges')}
            </button>
          </div>
        </div>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] text-center ${saveState === 'error' ? 'text-rose-500' : saveState === 'saved' ? 'text-emerald-600' : 'text-slate-400'}`}>
          {saveState === 'error' ? t('guestProfile.saveError') : saveState === 'saved' ? t('guestProfile.saveSuccess') : t('guestProfile.readyToSave')}
        </p>
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

function SecurityCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-[#1d4ed8]">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      </div>
      <div className="mt-4 text-sm font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-xs font-medium leading-6 text-slate-500">{hint}</div>
    </div>
  );
}
