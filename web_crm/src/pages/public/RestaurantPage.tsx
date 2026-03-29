import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock3, MapPin, Star, Users } from 'lucide-react';
import api from '@/services/api';
import { getApiErrorMessage, type RestaurantRecord } from '@/features/reservations/shared';

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1400&q=80',
];

export default function RestaurantPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState<RestaurantRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const response = await api.get<RestaurantRecord>(`/restaurants/${id}/`);
        setRestaurant(response.data);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Restaurant not found.'));
      } finally {
        setLoading(false);
      }
    };

    void loadRestaurant();
  }, [id]);

  const photos = useMemo(() => {
    const primaryPhoto = restaurant?.photo_url || restaurant?.image_url;
    return primaryPhoto ? [primaryPhoto, ...FALLBACK_PHOTOS.slice(1)] : FALLBACK_PHOTOS;
  }, [restaurant]);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[#1d4ed8]" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">{error || 'Restaurant not found'}</h2>
        <p className="mt-4 text-base leading-8 text-slate-600">Вернитесь к списку ресторанов и выберите другое заведение.</p>
        <Link
          to="/restaurants"
          aria-label="back-to-restaurants"
          className="mt-8 inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
        >
          Вернуться к поиску
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#fafaf9] pb-20 pt-10 font-inter text-slate-900">
      <section className="mx-auto grid max-w-[1400px] gap-10 px-6 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-8">
          <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">
            Профиль заведения
          </div>

          <div>
            <h1 className="text-5xl font-black leading-[1.02] tracking-tight text-slate-900 md:text-6xl">{restaurant.name}</h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-600">
              {restaurant.description || 'Заведение с быстрым онлайн-бронированием, понятной клиентской частью и аккуратной работой с гостями.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={`/restaurant/${restaurant.id}/book`}
              aria-label="restaurant-book"
              className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#1e40af] shadow-lg shadow-[#1d4ed8]/15"
            >
              Забронировать столик
            </Link>
            {restaurant.phone ? (
              <a
                href={`tel:${restaurant.phone}`}
                aria-label="restaurant-call"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
              >
                Позвонить в ресторан
              </a>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoStat icon={<MapPin size={18} />} label="Адрес" value={restaurant.address || 'Адрес не указан'} />
            <InfoStat
              icon={<Clock3 size={18} />}
              label="Время работы"
              value={`${restaurant.opening_time?.slice(0, 5) || '10:00'} - ${restaurant.closing_time?.slice(0, 5) || '23:00'}`}
            />
            <InfoStat icon={<Star size={18} />} label="Рейтинг" value="4.9 / 5.0" />
            <InfoStat icon={<Users size={18} />} label="Бронирование" value="Мгновенное" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ValueCard
              title="Удобно для гостей"
              description="Бронирование без регистрации, ясная форма и подтверждение с деталями визита."
            />
            <ValueCard
              title="Подходит для команды"
              description="Заявки сразу попадают в CRM, где их можно подтвердить, посадить и завершить без лишних шагов."
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)]">
            <img src={photos[0]} alt={restaurant.name} className="h-[420px] w-full object-cover" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {photos.slice(1).map((photo, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.25)]"
              >
                <img src={photo} alt={`${restaurant.name} ${index + 2}`} className="h-[180px] w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
      <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-[#1d4ed8] border border-blue-100">{icon}</div>
      <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-slate-900">{value}</div>
    </div>
  );
}

function ValueCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6">
      <div className="text-xl font-bold tracking-tight text-slate-900">{title}</div>
      <div className="mt-3 text-sm leading-7 text-slate-600">{description}</div>
    </div>
  );
}
