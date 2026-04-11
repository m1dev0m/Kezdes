import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PRICING_PLANS } from './pricing/pricingPlans';

const VALUE_POINTS = [
  {
    title: 'Только бронирование и зал',
    text: 'Без кассы, склада и бухгалтерских блоков: продукт не перегружен лишними экранами.',
  },
  {
    title: 'Просто обучить персонал',
    text: 'Хост и администратор начинают работать быстрее, потому что логика сценариев короче и понятнее.',
  },
  {
    title: 'Один тариф без конструктора',
    text: '27 990 ₸ / месяц за полный набор для бронирования, столов и работы с гостями.',
  },
];

const FIT_POINTS = [
  'Ресторанам с фокусом на бронях и посадке',
  'Небольшим и средним командам зала',
  'Быстрому запуску без тяжелого внедрения',
];

const NOT_FIT_POINTS = [
  'Тем, кому нужен полный POS-контур',
  'Сложный складской и финансовый учет',
  'Большая ERP-автоматизация кухни и закупа',
];

const COMPARISON_ROWS = [
  {
    product: 'Kezdes Plus',
    purpose: 'reservation CRM',
    complexity: 'low complexity',
    bestFor: 'small and medium restaurants',
    pricing: '27 990 ₸ / month',
  },
  {
    product: 'iiko',
    purpose: 'full restaurant automation',
    complexity: 'high complexity',
    bestFor: 'restaurants needing POS + stock + finance + staff systems',
    pricing: 'from 27 300 ₸+ / month or custom implementation cost',
  },
  {
    product: 'LIKO / local systems',
    purpose: 'restaurant automation / custom setup',
    complexity: 'medium to high complexity',
    bestFor: 'businesses needing broader operations setup',
    pricing: 'price on request / custom',
  },
];

export default function Pricing() {
  const plan = PRICING_PLANS.find((item) => item.id === 'plus');
  if (!plan) return null;
  const formattedPrice = new Intl.NumberFormat('ru-RU').format(plan.price);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <PublicHeader active="pricing" />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-24">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white">
          <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#1d4ed8]/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#0f172a]/6 blur-3xl" />
          <div className="relative grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">Kezdes Plus</p>
              <h1 className="mt-3 max-w-3xl border-l-4 border-[#1d4ed8] pl-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Управляйте бронями и посадкой в одном рабочем контуре
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                Если вам нужна именно система бронирования и работы с залом, Kezdes Plus проще и понятнее, чем большие
                системы автоматизации.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">резервы</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">столы</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">очередь</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">гости</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1d4ed8]/30 bg-[#1d4ed8] p-6 text-white shadow-xl shadow-[#1d4ed8]/20">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">Единый тариф</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Kezdes Plus</h2>
              <div className="mt-4 flex items-end gap-2">
                <p className="text-5xl font-black tracking-tight">{formattedPrice}</p>
                <p className="pb-1 text-xl font-bold text-blue-100">{plan.currencySymbol}</p>
              </div>
              <p className="mt-1 text-sm font-medium text-blue-100">{plan.periodLabel}</p>
              <p className="mt-4 text-sm leading-6 text-blue-50">{plan.tagline}</p>
              <Link
                to={plan.cta.to}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#1d4ed8] transition hover:bg-blue-50"
              >
                {plan.cta.label}
              </Link>
              <p className="mt-3 text-center text-xs text-blue-100">Запуск без сложного внедрения и долгого обучения</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Запуск</p>
              <p className="mt-1 text-lg font-black text-slate-900">Быстрее</p>
              <p className="mt-1 leading-6 text-slate-600">Команда осваивает процесс хоста без долгого онбординга.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Операции</p>
              <p className="mt-1 text-lg font-black text-slate-900">Проще</p>
              <p className="mt-1 leading-6 text-slate-600">Только бронирование, столы и очередь, без тяжелых модулей.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Стоимость</p>
              <p className="mt-1 text-lg font-black text-slate-900">Прозрачно</p>
              <p className="mt-1 leading-6 text-slate-600">Один тариф: 27 990 ₸ / месяц без конструктора цен.</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Что входит в Kezdes Plus</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Полный набор для ежедневной операционной работы с бронями и столами.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1d4ed8]" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-600">Почему проще</h3>
                <div className="mt-4 space-y-3">
                  {VALUE_POINTS.map((point) => (
                    <div key={point.title}>
                      <p className="text-sm font-semibold text-slate-900">{point.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{point.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Подходит</p>
                  <ul className="mt-3 space-y-2">
                    {FIT_POINTS.map((item) => (
                      <li key={item} className="text-sm text-emerald-900">{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Не цель продукта</p>
                  <ul className="mt-3 space-y-2">
                    {NOT_FIT_POINTS.map((item) => (
                      <li key={item} className="text-sm text-amber-900">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-10">
          <h3 className="text-2xl font-black tracking-tight sm:text-3xl">Чем Kezdes Plus отличается от сложных систем</h3>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
            Если вам нужна именно система бронирования и работы с залом, Kezdes Plus проще и понятнее, чем большие
            системы автоматизации.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Main purpose</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Complexity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Best for</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Pricing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.product}
                    className={row.product === 'Kezdes Plus' ? 'bg-[#f1f6ff]' : 'odd:bg-white even:bg-slate-50/40'}
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">{row.product}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{row.purpose}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{row.complexity}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{row.bestFor}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{row.pricing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Kezdes Plus не заменяет полную автоматизацию, а закрывает конкретный операционный слой ресторана:
              бронирование, посадку и работу с гостями.
            </p>
            <Link
              to={plan.cta.to}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
            >
              Попробовать Kezdes Plus
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
