import { useState, useEffect, useCallback } from 'react';
import { Building2, Clock3, Mail, MapPin, Phone, Save, ShieldCheck, Store, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';

interface RestaurantSettings {
  id: number;
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  photo_url?: string;
  opening_time?: string;
  closing_time?: string;
  total_tables?: number;
  total_capacity?: number;
  slot_duration_minutes?: number;
  deposit_min_guests?: number | null;
  deposit_amount_per_guest?: number | null;
  slug?: string;
  turnover_default_min?: number;
}

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'business' | 'operational' | 'account'>('business');
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<RestaurantSettings | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const loadRestaurant = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await api.get('/restaurants/me/');
      setRestaurant(res.data);
    } catch {
      toast.error('Failed to load restaurant settings');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void loadRestaurant();
  }, [loadRestaurant]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    try {
      await api.patch('/restaurants/me/', {
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        opening_time: restaurant.opening_time,
        closing_time: restaurant.closing_time,
        total_tables: restaurant.total_tables,
        total_capacity: restaurant.total_capacity,
        slot_duration_minutes: restaurant.slot_duration_minutes,
        deposit_min_guests: restaurant.deposit_min_guests,
        deposit_amount_per_guest: restaurant.deposit_amount_per_guest,
        slug: restaurant.slug,
        turnover_default_min: restaurant.turnover_default_min,
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const update = <K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) => {
    setRestaurant((current) => (current ? { ...current, [key]: value } : current));
  };

  const tabs = [
    { id: 'business', label: 'Business profile' },
    { id: 'operational', label: 'Operating rules' },
    { id: 'account', label: 'Account' },
  ] as const;

  if (loadingData) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[#1d4ed8]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 py-8">
      <header>
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Settings</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Настройки ресторана</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Основные данные ресторана, часы работы и параметры бронирования. Всё, что влияет на ежедневную работу CRM и публичную страницу.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === item.id ? 'bg-[#1d4ed8] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {tab === 'business' && restaurant ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
              <div className="rounded-[24px] border border-slate-200 bg-[#fafaf9] p-6">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white border border-slate-200">
                  {restaurant.photo_url ? (
                    <img src={restaurant.photo_url} alt={restaurant.name || 'Restaurant'} className="h-full w-full object-cover" />
                  ) : (
                    <Store size={32} className="text-slate-400" />
                  )}
                </div>
                <div className="mt-5 text-lg font-bold tracking-tight text-slate-900">{restaurant.name || 'Restaurant'}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">Публичная информация, адрес и базовые контактные данные.</div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Restaurant name" value={restaurant.name || ''} onChange={(v) => update('name', v)} icon={<Building2 size={18} />} />
                <Field label="Public slug" value={restaurant.slug || ''} onChange={(v) => update('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))} icon={<Store size={18} />} />
                <Field label="Email" type="email" value={restaurant.email || ''} onChange={(v) => update('email', v)} icon={<Mail size={18} />} />
                <Field label="Phone" type="tel" value={restaurant.phone || ''} onChange={(v) => update('phone', v)} icon={<Phone size={18} />} />
                <div className="md:col-span-2">
                  <Field label="Address" value={restaurant.address || ''} onChange={(v) => update('address', v)} icon={<MapPin size={18} />} />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {tab === 'operational' && restaurant ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Opening time" type="time" value={restaurant.opening_time || ''} onChange={(v) => update('opening_time', v)} icon={<Clock3 size={18} />} />
              <Field label="Closing time" type="time" value={restaurant.closing_time || ''} onChange={(v) => update('closing_time', v)} icon={<Clock3 size={18} />} />
              <Field
                label="Default turnover (min)"
                type="number"
                value={String(restaurant.turnover_default_min || 90)}
                onChange={(v) => update('turnover_default_min', Number(v))}
                icon={<Timer size={18} />}
              />
              <Field
                label="Slot duration (min)"
                type="number"
                value={String(restaurant.slot_duration_minutes || 30)}
                onChange={(v) => update('slot_duration_minutes', Number(v))}
                icon={<Timer size={18} />}
              />
              <Field
                label="Min guests for deposit"
                type="number"
                value={String(restaurant.deposit_min_guests || 0)}
                onChange={(v) => update('deposit_min_guests', Number(v) || null)}
                icon={<ShieldCheck size={18} />}
              />
              <Field
                label="Deposit amount per guest"
                type="number"
                value={String(restaurant.deposit_amount_per_guest || 0)}
                onChange={(v) => update('deposit_amount_per_guest', Number(v) || null)}
                icon={<ShieldCheck size={18} />}
              />
            </div>
          </section>
        ) : null}

        {tab === 'account' ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="grid gap-6 md:grid-cols-2">
              <StaticField label="Username" value={user?.username || '—'} />
              <StaticField label="Email" value={user?.email || '—'} />
            </div>
            <div className="mt-6 rounded-2xl bg-[#fafaf9] px-4 py-4 text-sm text-slate-600">
              Смена пароля и расширенные права доступа пока не вынесены в отдельный self-service экран.
            </div>
          </section>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !restaurant}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  type = 'text',
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafaf9] pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
        />
      </div>
    </div>
  );
}

function StaticField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#fafaf9] px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
