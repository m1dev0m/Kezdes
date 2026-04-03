import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { getLocalDateString } from '@/features/reservations/shared';

interface Restaurant {
  id: number;
  name: string;
  description?: string | null;
  address?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  rating?: number | null;
  opening_time?: string | null;
  closing_time?: string | null;
}

function buildRestaurantLink(restaurantId: number, date: string, time: string, guests: number) {
  return `/restaurant/${restaurantId}?${new URLSearchParams({
    date,
    time,
    guests: String(guests),
  }).toString()}`;
}

const TAGS = ['Все', 'Итальянская', 'Японская', 'Стейкхаус', 'Грузинская', 'Бистро'] as const;
const SORT_OPTIONS = [
  { value: 'recommended', label: 'Рекомендуемые' },
  { value: 'rating_desc', label: 'По рейтингу' },
  { value: 'name_asc', label: 'По названию' },
] as const;

type SortMode = (typeof SORT_OPTIONS)[number]['value'];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [activeFilter, setActiveFilter] = useState<(typeof TAGS)[number]>('Все');
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [bookingDate, setBookingDate] = useState(searchParams.get('date') ?? getLocalDateString());
  const [bookingTime, setBookingTime] = useState(searchParams.get('time') ?? '19:00');
  const [partySize, setPartySize] = useState(Number(searchParams.get('guests') ?? 2));

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    setPageError(null);

    try {
      const response = await api.get('/restaurants/');
      const payload = Array.isArray(response.data?.results) ? response.data.results : response.data;
      const items = Array.isArray(payload) ? payload : [];
      setRestaurants(items);

      if (!Array.isArray(payload) && !response.data?.results) {
        setPageError('Не удалось разобрать список заведений. Попробуйте обновить страницу.');
      }
    } catch (error) {
      const message = 'Не удалось загрузить список заведений.';
      setRestaurants([]);
      setPageError(message);
      toast.error(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRestaurants();
  }, [loadRestaurants]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (query.trim()) next.set('q', query.trim());
    else next.delete('q');

    if (bookingDate) next.set('date', bookingDate);
    else next.delete('date');

    if (bookingTime) next.set('time', bookingTime);
    else next.delete('time');

    next.set('guests', String(partySize));
    setSearchParams(next, { replace: true });
  }, [bookingDate, bookingTime, partySize, query, searchParams, setSearchParams]);

  const counts = useMemo(() => {
    return TAGS.reduce<Record<string, number>>((acc, tag) => {
      if (tag === 'Все') {
        acc[tag] = restaurants.length;
        return acc;
      }
      acc[tag] = restaurants.filter((restaurant) => matchesCuisine(restaurant, tag)).length;
      return acc;
    }, {});
  }, [restaurants]);

  const visibleRestaurants = useMemo(() => {
    const value = query.trim().toLowerCase();
    let results = restaurants;

    if (value) {
      results = results.filter((restaurant) => getSearchText(restaurant).includes(value));
    }

    if (activeFilter !== 'Все') {
      results = results.filter((restaurant) => matchesCuisine(restaurant, activeFilter));
    }

    const sorted = [...results];

    if (sortMode === 'rating_desc') {
      sorted.sort((a, b) => getRating(b) - getRating(a) || a.name.localeCompare(b.name, 'ru'));
    } else if (sortMode === 'name_asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    }

    return sorted;
  }, [restaurants, query, activeFilter, sortMode]);

  const featuredRestaurant = visibleRestaurants[0] ?? null;
  const remainingRestaurants = visibleRestaurants.slice(1);
  const hasFilters = Boolean(query.trim()) || activeFilter !== 'Все' || sortMode !== 'recommended';

  const resultTitle = (() => {
    if (query.trim()) return `Поиск: ${query.trim()}`;
    if (activeFilter !== 'Все') return activeFilter;
    return 'Все заведения';
  })();

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f6f7f9] font-inter text-slate-900">
      <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_30px_80px_-52px_rgba(15,23,42,0.22)]">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-slate-200 px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                <Sparkles size={14} />
                Curated dining
              </div>

              <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.65rem] lg:leading-[1.02]">
                Выбор заведений с более ясной подачей и быстрым бронированием
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                Подборка ресторанов без ощущения бесконечной сетки. Сначала лучший кандидат, затем живая лента карточек с
                разной плотностью, заметным CTA и быстрым сравнением по фото, адресу и времени работы.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <StatTile label="Результатов" value={visibleRestaurants.length.toString()} />
                <StatTile label="Дата" value={bookingDate} />
                <StatTile label="Гостей" value={String(partySize)} />
              </div>

              <div className="mt-8 space-y-3">
                <div className="grid gap-3 lg:grid-cols-3">
                  <label className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
                    <CalendarDays size={18} className="text-slate-400" />
                    <input
                      type="date"
                      min={getLocalDateString()}
                      value={bookingDate}
                      onChange={(event) => setBookingDate(event.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                    />
                  </label>
                  <label className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
                    <Clock3 size={18} className="text-slate-400" />
                    <input
                      type="time"
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                    />
                  </label>
                  <label className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
                    <Users size={18} className="text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={partySize}
                      onChange={(event) => setPartySize(Math.min(20, Math.max(1, Number(event.target.value) || 1)))}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      aria-label="restaurants-search"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                      placeholder="Название, адрес или кухня..."
                    />
                  </div>

                  <label className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
                    <SlidersHorizontal size={18} className="text-slate-400" />
                    <span className="sr-only">Сортировка</span>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as SortMode)}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TAGS.map((tag) => (
                    <FilterChip
                      key={tag}
                      active={activeFilter === tag}
                      label={tag}
                      count={counts[tag] ?? 0}
                      onClick={() => setActiveFilter(tag)}
                    />
                  ))}

                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setActiveFilter('Все');
                        setSortMode('recommended');
                        setBookingDate(getLocalDateString());
                        setBookingTime('19:00');
                        setPartySize(2);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      Сбросить
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-4 sm:p-5 lg:p-6">
              {featuredRestaurant ? (
                <FeaturedRestaurantCard
                  restaurant={featuredRestaurant}
                  bookingDate={bookingDate}
                  bookingTime={bookingTime}
                  partySize={partySize}
                />
              ) : pageError ? (
                <ErrorPreview error={pageError} onRetry={loadRestaurants} />
              ) : (
                <EmptyPreview />
              )}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.18)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Срез выдачи</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{resultTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                В приоритете лучший ресторан сверху. Ниже карточки идут в более живом ритме, чтобы быстрее сканировать выдачу.
              </p>

              <div className="mt-6 space-y-3">
                <InfoRow label="Найдено" value={visibleRestaurants.length.toString()} />
                <InfoRow label="Активный фильтр" value={activeFilter} />
                <InfoRow
                  label="Сортировка"
                  value={SORT_OPTIONS.find((item) => item.value === sortMode)?.label ?? 'Рекомендуемые'}
                />
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Почему так легче читать</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Крупное главное предложение убирает конкуренцию между всеми карточками сразу.</p>
                  <p>Остальные рестораны разбиты на карточки разного масштаба, а CTA читается раньше вторичного текста.</p>
                </div>
              </div>
            </div>
          </aside>

          <section>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-6">
                <div className="min-h-[420px] animate-pulse rounded-[32px] border border-slate-200 bg-white md:col-span-6" />
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className={`animate-pulse rounded-[28px] border border-slate-200 bg-white ${
                      index === 0 ? 'h-[420px] md:col-span-4' : index === 1 ? 'h-[420px] md:col-span-2' : 'h-[360px] md:col-span-3'
                    }`}
                  />
                ))}
              </div>
            ) : pageError ? (
              <div className="overflow-hidden rounded-[32px] border border-rose-200 bg-white p-8 text-center shadow-[0_20px_60px_-44px_rgba(15,23,42,0.16)] sm:p-12">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                  <SearchIcon size={24} />
                </div>
                <div className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Каталог временно недоступен</div>
                <div className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">{pageError}</div>
                <button
                  type="button"
                  onClick={() => void loadRestaurants()}
                  className="mt-7 inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
                >
                  Повторить загрузку
                </button>
              </div>
            ) : visibleRestaurants.length === 0 ? (
              <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_-44px_rgba(15,23,42,0.16)] sm:p-12">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <SearchIcon size={24} />
                </div>
                <div className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Ничего не найдено</div>
                <div className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                  Попробуйте изменить поисковый запрос, переключить кухню или сбросить фильтры.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setActiveFilter('Все');
                    setSortMode('recommended');
                  }}
                  className="mt-7 inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
                >
                  Сбросить поиск
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-6">
                {remainingRestaurants.length === 0 ? (
                  <CompactLeadCard
                    restaurant={featuredRestaurant!}
                    className="md:col-span-6"
                    bookingDate={bookingDate}
                    bookingTime={bookingTime}
                    partySize={partySize}
                  />
                ) : (
                  remainingRestaurants.map((restaurant, index) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      variant={getCardVariant(index)}
                      className={getCardSpan(index)}
                      bookingDate={bookingDate}
                      bookingTime={bookingTime}
                      partySize={partySize}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function FeaturedRestaurantCard({
  restaurant,
  bookingDate,
  bookingTime,
  partySize,
}: {
  restaurant: Restaurant;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
}) {
  const label = getCuisineLabel(restaurant);
  const rating = getRating(restaurant).toFixed(1);

  return (
    <article className="overflow-hidden rounded-[32px] border border-slate-200 bg-white">
      <Link to={buildRestaurantLink(restaurant.id, bookingDate, bookingTime, partySize)} className="group block h-full">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative order-2 px-6 py-6 sm:px-7 sm:py-7 lg:order-1 lg:flex lg:flex-col lg:justify-between lg:px-8 lg:py-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <BadgeChip solid>Лучший выбор</BadgeChip>
                <BadgeChip>{label}</BadgeChip>
                <BadgeChip>{rating} / 5</BadgeChip>
              </div>

              <h3 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{restaurant.name}</h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                {restaurant.description ||
                  'Ресторан с аккуратной атмосферой, быстрой бронью и понятной подачей основных деталей ещё до перехода в карточку.'}
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <InfoPill icon={<MapPin size={15} />} value={restaurant.address || 'Адрес не указан'} />
              <InfoPill icon={<Clock3 size={15} />} value={getHoursLabel(restaurant)} />
            </div>

              <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
                <div className="text-sm text-slate-500">
                Откройте карточку ресторана, чтобы посмотреть детали и перейти к бронированию.
                </div>
                <div className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition group-hover:bg-[#1e40af]">
                Проверить доступность
                <ArrowRight size={16} />
              </div>
            </div>
          </div>

          <div className="relative order-1 aspect-[4/3] overflow-hidden border-b border-slate-200 bg-slate-100 lg:order-2 lg:aspect-auto lg:border-b-0 lg:border-l">
            <img
              src={getRestaurantImage(restaurant, 'featured')}
              alt={restaurant.name}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/10 to-transparent" />
          </div>
        </div>
      </Link>
    </article>
  );
}

function CompactLeadCard({
  restaurant,
  className = '',
  bookingDate,
  bookingTime,
  partySize,
}: {
  restaurant: Restaurant;
  className?: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
}) {
  return (
    <RestaurantCard
      restaurant={restaurant}
      variant="wide"
      className={className}
      bookingDate={bookingDate}
      bookingTime={bookingTime}
      partySize={partySize}
    />
  );
}

function RestaurantCard({
  restaurant,
  variant,
  className = '',
  bookingDate,
  bookingTime,
  partySize,
}: {
  restaurant: Restaurant;
  variant: 'wide' | 'tall' | 'compact';
  className?: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
}) {
  const label = getCuisineLabel(restaurant);
  const rating = getRating(restaurant).toFixed(1);
  const isWide = variant === 'wide';
  const isTall = variant === 'tall';

  return (
    <article
      className={`group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_-40px_rgba(15,23,42,0.16)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)] ${className}`}
    >
      <Link
        to={buildRestaurantLink(restaurant.id, bookingDate, bookingTime, partySize)}
        className={`block h-full ${isWide ? 'md:h-[100%]' : ''}`}
      >
        <div className={isWide ? 'grid h-full md:grid-cols-[1.05fr_0.95fr]' : ''}>
          <div className={`relative overflow-hidden ${isWide ? 'aspect-[4/3] md:aspect-auto md:h-full' : isTall ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
            <img
              src={getRestaurantImage(restaurant, 'card')}
              alt={restaurant.name}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/28 via-transparent to-transparent opacity-80" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <BadgeChip solid>{label}</BadgeChip>
            </div>
            <div className="absolute bottom-4 right-4 rounded-2xl bg-white/95 px-3 py-2 text-sm font-semibold text-slate-900 shadow-lg">
              <span className="inline-flex items-center gap-1">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {rating}
              </span>
            </div>
          </div>

          <div className="flex h-full flex-col p-5">
            <div className="flex-1">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{restaurant.name}</h3>

              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={14} className="shrink-0" />
                <span className="truncate">{restaurant.address || 'Адрес не указан'}</span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <Clock3 size={14} className="shrink-0" />
                <span>{getHoursLabel(restaurant)}</span>
              </div>

              <p className={`mt-4 text-sm leading-7 text-slate-600 ${isWide ? 'line-clamp-4' : 'line-clamp-3'}`}>
                {restaurant.description ||
                  'Краткое описание заведения, которое помогает быстрее понять атмосферу, сервис и формат визита.'}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Открыть карточку</div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 transition group-hover:bg-blue-100">
                Открыть и выбрать
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    </button>
  );
}

function BadgeChip({
  children,
  solid = false,
}: {
  children: ReactNode;
  solid?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
        solid ? 'bg-white text-slate-700 border border-slate-200' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </span>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="max-w-[65%] truncate text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoPill({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <span className="text-slate-400">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-[32px] border border-slate-200 bg-white px-8 py-10">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Sparkles size={24} />
        </div>
        <div className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Главный ресторан появится здесь</div>
        <p className="mt-3 text-sm leading-7 text-slate-600">После загрузки списка первый результат будет показан в крупном блоке справа.</p>
      </div>
    </div>
  );
}

function ErrorPreview({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-[32px] border border-rose-200 bg-white px-8 py-10">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
          <SearchIcon size={24} />
        </div>
        <div className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Не удалось показать выборку</div>
        <p className="mt-3 text-sm leading-7 text-slate-600">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
        >
          Повторить
        </button>
      </div>
    </div>
  );
}

function getSearchText(restaurant: Restaurant): string {
  return `${restaurant.name} ${restaurant.address ?? ''} ${restaurant.description ?? ''}`.toLowerCase();
}

function getRestaurantImage(restaurant: Restaurant, variant: 'featured' | 'card'): string {
  const image = restaurant.photo_url || restaurant.image_url;
  if (image) return image;

  return variant === 'featured'
    ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1555992336-03a23c7b20f9?w=1200&auto=format&fit=crop&q=80';
}

function matchesCuisine(restaurant: Restaurant, filter: string): boolean {
  const text = getSearchText(restaurant);
  const cuisine = getCuisineLabel(restaurant).toLowerCase();
  return cuisine.includes(filter.toLowerCase()) || text.includes(filter.toLowerCase());
}

function getCuisineLabel(restaurant: Restaurant): string {
  const text = getSearchText(restaurant);

  if (text.includes('pizza') || text.includes('pasta') || text.includes('ital')) return 'Итальянская';
  if (text.includes('sushi') || text.includes('ramen') || text.includes('japan')) return 'Японская';
  if (text.includes('steak') || text.includes('grill') || text.includes('meat')) return 'Стейкхаус';
  if (text.includes('georg') || text.includes('khinkal') || text.includes('wine')) return 'Грузинская';
  if (text.includes('bistro') || text.includes('cafe')) return 'Бистро';

  return 'Авторская';
}

function getRating(restaurant: Restaurant): number {
  const rating = Number(restaurant.rating ?? 4.8);
  if (Number.isNaN(rating)) return 4.8;
  return Math.min(5, Math.max(0, rating));
}

function getHoursLabel(restaurant: Restaurant): string {
  const opening = restaurant.opening_time?.slice(0, 5) || '10:00';
  const closing = restaurant.closing_time?.slice(0, 5) || '23:00';
  return `${opening} - ${closing}`;
}

function getCardVariant(index: number): 'wide' | 'tall' | 'compact' {
  if (index === 0) return 'wide';
  if (index % 4 === 1) return 'tall';
  return 'compact';
}

function getCardSpan(index: number): string {
  if (index === 0) return 'md:col-span-6';
  if (index % 4 === 1) return 'md:col-span-2';
  if (index % 4 === 2) return 'md:col-span-4';
  return 'md:col-span-3';
}
