import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CalendarClock, CalendarDays, Clock3, MapPin, Phone, Sparkles, Star, Users } from 'lucide-react';
import api from '@/services/api';
import { getApiErrorMessage, getLocalDateString, type RestaurantRecord } from '@/features/reservations/shared';
import { useAuth } from '@/modules/auth/logic/AuthContext';

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1400&q=80',
];

interface ReviewRecord {
  id: number;
  user_name?: string | null;
  rating?: number | null;
  comment?: string | null;
  created_at?: string;
}

interface RestaurantProfile extends RestaurantRecord {
  slug?: string | null;
  average_price?: number | null;
  price_level?: string | null;
  rating?: number | null;
  capacity?: number | null;
  max_party_size?: number | null;
  has_namazhana?: boolean;
  has_parking?: boolean;
  has_kids_zone?: boolean;
  has_wifi?: boolean;
  has_terrace?: boolean;
  wheelchair_accessible?: boolean;
  birthday_service_available?: boolean;
  deposit_required?: boolean;
}

export default function RestaurantPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Restaurant not found.');
      return;
    }

    const loadRestaurant = async () => {
      try {
        const isNumericId = /^\d+$/.test(id);
        const response = await api.get<RestaurantProfile>(isNumericId ? `/restaurants/${id}/` : `/restaurants/by-slug/${id}/`);
        const profile = response.data;
        setRestaurant(profile);

        if (profile.id) {
          const reviewsResponse = await api.get<ReviewRecord[]>(`/restaurants/${profile.id}/reviews/`);
          setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
        }
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Restaurant not found.'));
      } finally {
        setLoading(false);
      }
    };

    void loadRestaurant();
  }, [id, reloadToken]);

  const photos = useMemo(() => {
    const primaryPhoto = restaurant?.photo_url || restaurant?.image_url;
    return primaryPhoto ? [primaryPhoto, ...FALLBACK_PHOTOS.slice(1)] : FALLBACK_PHOTOS;
  }, [restaurant]);

  const cuisineLabel = useMemo(() => getCuisineLabel(restaurant), [restaurant]);
  const featureList = useMemo(() => getRestaurantFeatures(restaurant), [restaurant]);
  const rawRatingValue = restaurant?.rating ?? getAverageRating(reviews);
  const ratingValue = typeof rawRatingValue === 'number' ? rawRatingValue : Number(rawRatingValue ?? 0);
  const ratingLabel = Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : '0.0';
  const averageCheckLabel = restaurant?.average_price ? `${Math.round(restaurant.average_price).toLocaleString('ru-RU')} ₸` : 'По запросу';
  const topReviews = reviews.slice(0, 3);
  const capacityLabel = restaurant?.max_party_size || restaurant?.capacity || 8;
  const selectedDate = searchParams.get('date') ?? getLocalDateString();
  const selectedTime = searchParams.get('time') ?? '19:00';
  const selectedGuests = searchParams.get('guests') ?? '2';
  const bookingParams = new URLSearchParams({
    date: selectedDate,
    time: selectedTime,
    guests: selectedGuests,
  }).toString();
  const bookHref = restaurant ? `/restaurant/${restaurant.id}/book?${bookingParams}` : '/restaurants';
  const waitlistHref = restaurant ? `${bookHref}&waitlist=1` : '/restaurants';
  const waitlistButtonLabel = 'Встать в лист ожидания';
  const waitlistHint = user
    ? 'Лист ожидания уже может привязать запрос к вашему аккаунту и сохранить контакты.'
    : 'Если слот занят, можно сразу оставить заявку в лист ожидания без отдельного логина.';

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
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setReloadToken((current) => current + 1)}
            className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
          >
            Повторить загрузку
          </button>
          <Link
            to="/restaurants"
            aria-label="back-to-restaurants"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
          >
            Вернуться к поиску
          </Link>
        </div>
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
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">{cuisineLabel}</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Средний чек {averageCheckLabel}</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">До {capacityLabel} гостей</span>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-600">
              {restaurant.description || 'Заведение с быстрым онлайн-бронированием, понятной клиентской частью и аккуратной работой с гостями.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={bookHref}
              aria-label="restaurant-book"
              className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#1e40af] shadow-lg shadow-[#1d4ed8]/15"
            >
              Забронировать столик
            </Link>
            <Link
              to={waitlistHref}
              aria-label="restaurant-waitlist"
              className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-6 py-4 text-xs font-bold uppercase tracking-widest text-blue-700 transition hover:bg-blue-100"
            >
              {waitlistButtonLabel}
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
          <p className="text-xs leading-6 text-slate-500">{waitlistHint}</p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoStat icon={<MapPin size={18} />} label="Адрес" value={restaurant.address || 'Адрес не указан'} />
            <InfoStat
              icon={<Clock3 size={18} />}
              label="Время работы"
              value={`${restaurant.opening_time?.slice(0, 5) || '10:00'} - ${restaurant.closing_time?.slice(0, 5) || '23:00'}`}
            />
            <InfoStat icon={<Star size={18} />} label="Рейтинг" value={`${ratingLabel} / 5.0`} />
            <InfoStat icon={<Users size={18} />} label="Бронирование" value="Онлайн и без звонков" />
          </div>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Текущий запрос на бронирование</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Параметры из поиска уже перенесены в карточку ресторана. Их можно сразу передать в бронь или лист ожидания.
                </p>
              </div>
              <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <CalendarDays size={16} className="text-slate-400" />
                <span>{selectedDate}</span>
                <span className="text-slate-300">·</span>
                <span>{selectedTime}</span>
                <span className="text-slate-300">·</span>
                <span>{selectedGuests} гостей</span>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <ValueCard
              title="Быстрое бронирование"
              description="Выберите дату, время и количество гостей. После отправки получите подтверждение с деталями визита."
            />
            <ValueCard
              title="Понятные правила визита"
              description={
                restaurant.deposit_required
                  ? 'Для некоторых сценариев может потребоваться депозит. Условия и подтверждение придут после отправки заявки.'
                  : 'Бронь подтверждается без лишних шагов, а детали и статус сохраняются в заявке.'
              }
            />
          </div>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-2xl border border-blue-100 bg-blue-50 p-3 text-[#1d4ed8]">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Особенности ресторана</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Главное о пространстве, атмосфере и формате визита.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {featureList.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold tracking-wide text-slate-700"
                >
                  {feature}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Отзывы гостей</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Реальные впечатления после визита и общая оценка сервиса.</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Средняя оценка</div>
                <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                  {ratingLabel}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {topReviews.length > 0 ? (
                topReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
              ) : (
                <div className="md:col-span-3 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                  Пока нет опубликованных отзывов. После визита гости смогут оставить оценку и комментарий.
                </div>
              )}
            </div>
          </section>
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

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Быстрая информация</h2>
            <div className="mt-5 space-y-3">
              <DetailRow icon={<MapPin size={16} />} label="Адрес" value={restaurant.address || 'Адрес не указан'} />
              <DetailRow icon={<Phone size={16} />} label="Контакты" value={restaurant.phone || 'Телефон не указан'} />
              <DetailRow
                icon={<Clock3 size={16} />}
                label="Часы работы"
                value={`${restaurant.opening_time?.slice(0, 5) || '10:00'} - ${restaurant.closing_time?.slice(0, 5) || '23:00'}`}
              />
              <DetailRow
                icon={<CalendarClock size={16} />}
                label="Формат брони"
                value="Онлайн-бронирование с подтверждением и управлением визитом"
              />
            </div>

            <div className="mt-6 rounded-[24px] border border-blue-100 bg-blue-50 p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Если удобного слота нет</div>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Если нужный слот занят, оставьте заявку в лист ожидания. Контакты сохранятся в форме, и ресторан сможет вернуться к
                вам, когда освободится подходящее время.
              </p>
              <Link
                to={waitlistHref}
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-blue-700 transition hover:bg-slate-100"
              >
                {waitlistButtonLabel}
              </Link>
            </div>
          </section>
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
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
      <div className="inline-flex rounded-2xl border border-blue-100 bg-blue-50 p-3 text-[#1d4ed8]">{icon}</div>
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

function ReviewCard({ review }: { review: ReviewRecord }) {
  const createdDate = review.created_at ? new Date(review.created_at) : null;
  const dateLabel =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(createdDate)
      : 'Недавно';

  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{review.user_name || 'Гость ресторана'}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{dateLabel}</div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-900">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          {Number(review.rating ?? 5).toFixed(1)}
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {review.comment?.trim() || 'Гость отметил хороший сервис и комфортный визит.'}
      </p>
    </article>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="mt-0.5 text-blue-700">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
        <div className="mt-1 text-sm font-medium leading-6 text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function getRestaurantFeatures(restaurant: RestaurantProfile | null): string[] {
  if (!restaurant) return ['Комфортное пространство', 'Подходит для компании'];

  const features: string[] = [];
  if (restaurant.has_kids_zone) features.push('Family friendly');
  if (restaurant.has_terrace) features.push('Outdoor seating');
  if (restaurant.has_wifi) features.push('Wi-Fi');
  if (restaurant.has_parking) features.push('Парковка');
  if (restaurant.wheelchair_accessible) features.push('Wheelchair accessible');
  if (restaurant.has_namazhana) features.push('Halal friendly');
  if (restaurant.birthday_service_available) features.push('Special occasions');
  if (restaurant.deposit_required) features.push('Подтверждение с депозитом');

  if (features.length === 0) {
    features.push('Уютная атмосфера', 'Подходит для встреч', 'Онлайн-бронирование');
  }

  return features;
}

function getCuisineLabel(restaurant: RestaurantProfile | null): string {
  const source = `${restaurant?.name ?? ''} ${restaurant?.description ?? ''}`.toLowerCase();
  if (source.includes('ital')) return 'Итальянская кухня';
  if (source.includes('japan') || source.includes('sushi') || source.includes('азиат')) return 'Японская кухня';
  if (source.includes('steak') || source.includes('grill')) return 'Стейк и гриль';
  if (source.includes('coffee') || source.includes('brunch')) return 'Кафе и brunch';
  if (source.includes('georg') || source.includes('хинк') || source.includes('груз')) return 'Грузинская кухня';
  return 'Авторская кухня';
}

function getAverageRating(reviews: ReviewRecord[]): number {
  const ratings = reviews
    .map((review) => Number(review.rating))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (ratings.length === 0) return 4.8;
  return ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
}
