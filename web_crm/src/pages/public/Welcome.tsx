import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck2, ChartColumnBig, CircleUserRound, DoorClosed, Phone, Users } from 'lucide-react';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { PublicHeader } from '@/components/public/PublicHeader';
import { getLocalDateString } from '@/features/reservations/shared';

const FEATURES = [
  {
    title: 'CRM и клиенты',
    description: 'История гостя, заметки команды и повторные визиты в одном рабочем окне.',
    icon: <CircleUserRound size={18} />,
  },
  {
    title: 'Управление столами',
    description: 'Вместимость, доступность и быстрые действия для смены без ручной путаницы.',
    icon: <DoorClosed size={18} />,
  },
  {
    title: 'Операционная картина',
    description: 'Сегодняшние брони, ближайшие гости и свободные столы без графиков и перегруза.',
    icon: <ChartColumnBig size={18} />,
  },
];

const BENEFITS = [
  {
    title: 'Для команды зала',
    points: ['Создание и подтверждение брони за минуты', 'Понятные статусы по каждой заявке', 'Быстрая посадка гостей без перезагрузки'],
  },
  {
    title: 'Для управляющего',
    points: ['Видно загрузку текущего дня', 'Есть карточка гостя с визитами и last visit', 'Свободные столы и статус зала доступны сразу'],
  },
  {
    title: 'Для запуска',
    points: ['Сначала настраиваются столы', 'Далее можно сразу принимать брони', 'Публичная форма работает без регистрации'],
  },
];

const FOOTER_INFO = [
  { label: 'Адрес', value: 'Алматы, пилотный запуск Kezdes' },
  { label: 'Связь', value: 'support@kezdes.app' },
  { label: 'Режим', value: 'CRM + public booking page' },
];

const PRICING_CARDS = [
  {
    title: 'Единый тариф для ресторана',
    price: '27 990 ₸ / месяц',
    description: 'Kezdes Plus включает CRM, столы, бронирования, аналитику и работу команды без выбора между планами.',
    ctaLabel: 'Посмотреть тариф',
    to: '/pricing',
  },
];

export default function Welcome() {
  const { user, logout } = useAuth();
  const [bookingDate, setBookingDate] = useState(getLocalDateString());
  const [bookingTime, setBookingTime] = useState('19:00');
  const [guests, setGuests] = useState(2);

  const quickBookingHref = useMemo(
    () =>
      `/restaurants?${new URLSearchParams({
        date: bookingDate,
        time: bookingTime,
        guests: String(Math.max(1, guests || 1)),
      }).toString()}`,
    [bookingDate, bookingTime, guests],
  );

  useEffect(() => {
    if (!user) return;

    logout();
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
    } catch {
      // ignore storage cleanup errors
    }
  }, [user, logout]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-inter text-slate-900">
      <PublicHeader active="home" />

      <main className="pt-8 sm:pt-10">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-8 lg:py-14">
            <div className="flex items-center">
              <div className="max-w-[580px]">
                <div className="inline-flex rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Kezdes for restaurants
                </div>
                <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Бронирования и работа зала в одном строгом интерфейсе
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                  Kezdes помогает ресторану быстро принимать бронирования, видеть свободные столы, вести базу гостей и
                  удерживать операционный порядок в течение смены.
                </p>

                <div className="mt-6 grid gap-3 sm:flex sm:flex-row">
                  <Link
                    to="/register?mode=restaurant"
                    className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
                  >
                    Открыть кабинет ресторана
                  </Link>
                  <Link
                    to="/restaurants"
                    className="inline-flex min-w-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Найти ресторан
                  </Link>
                </div>

                <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Запрос брони</div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Открыть бронирование сразу с главной</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Клиент выбирает дату, время и количество гостей здесь, а дальше сразу попадает в список ресторанов с нужным контекстом.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Дата</span>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(event) => setBookingDate(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Время</span>
                      <input
                        type="time"
                        value={bookingTime}
                        onChange={(event) => setBookingTime(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Гости</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={guests}
                        onChange={(event) => setGuests(Math.max(1, Number(event.target.value) || 1))}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
                      />
                    </label>
                  </div>
                  <Link
                    to={quickBookingHref}
                    className="mt-4 inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
                  >
                    Показать рестораны
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <img
                src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=80"
                alt="Restaurant dining room"
                className="h-[240px] w-full rounded-[24px] border border-slate-200 object-cover sm:h-[320px] sm:rounded-[28px]"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <LandingStat icon={<CalendarCheck2 size={18} />} label="CRM flow" value="Create → confirm → seat" />
                <LandingStat icon={<Users size={18} />} label="Guest data" value="Визиты и last visit" />
                <LandingStat icon={<Phone size={18} />} label="Public booking" value="Без звонков и без логина" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">О продукте</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Нужные блоки для MVP ресторана</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Без маркетингового шума: только бронирования, столы, гости и понятная клиентская форма.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3 sm:mt-8 sm:gap-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">{feature.icon}</div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Как это выглядит</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Интерфейс без перегруза</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Серьёзная нейтральная палитра, быстрые действия в CRM и понятная публичная страница бронирования.
                </p>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-5">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Kezdes CRM</div>
                      <div className="mt-1 text-xs text-slate-500">Dashboard, reservations, tables, guests</div>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Live</span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      {['Dashboard', 'Reservations', 'Tables', 'Guests', 'Settings'].map((item, index) => (
                        <div
                          key={item}
                          className={`rounded-xl px-3 py-2 text-sm ${index === 1 ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <PanelMetric label="Сегодня" value="18" />
                        <PanelMetric label="2 часа" value="5" />
                        <PanelMetric label="Свободные столы" value="7" />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-sm font-semibold text-slate-900">Быстрые действия по броням</div>
                        <div className="mt-3 space-y-3">
                          {[
                            ['Иван С.', '19:00 · confirmed'],
                            ['Айгерим Т.', '19:30 · seated'],
                            ['Murat K.', '20:00 · pending'],
                          ].map(([name, meta]) => (
                            <div key={name} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                              <div>
                                <div className="text-sm font-medium text-slate-900">{name}</div>
                                <div className="mt-1 text-xs text-slate-500">{meta}</div>
                              </div>
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Open</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-6 py-14 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {BENEFITS.map((block) => (
              <div key={block.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">{block.title}</h3>
                <div className="mt-5 space-y-3">
                  {block.points.map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <div className="mt-2 h-2 w-2 rounded-full bg-blue-700" />
                      <p className="text-sm leading-6 text-slate-600">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-14 lg:px-8">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Цены</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Единый тариф Kezdes Plus</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Один тариф для ресторанов — 27 990 ₸ в месяц. Для гостей сервис остаётся бесплатным.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-1">
              {PRICING_CARDS.map((card) => (
                <div key={card.title} className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.title}</div>
                  <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">{card.price}</div>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">{card.description}</p>
                  <Link
                    to={card.to}
                    className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
                  >
                    {card.ctaLabel}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-14 lg:px-8">
            <div className="rounded-[32px] border border-slate-200 bg-slate-50 px-8 py-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Дополнительная информация</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Публичная страница и CRM работают как один контур</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Гость бронирует столик на public-странице, а команда сразу обрабатывает заявку в CRM без page reload.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/register?mode=restaurant"
                    className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
                  >
                    Начать работу
                  </Link>
                  <Link
                    to="/restaurants"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Открыть бронирование
                  </Link>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {FOOTER_INFO.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                    <div className="mt-2 text-sm font-medium text-slate-900">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LandingStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">{icon}</div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function PanelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}
