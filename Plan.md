План развития Kezdes после MVP (без привязки к дням)

1. Полировка существующих флоу (web + mobile)





Бронирования (CRM веб, ресторан)  





Упростить работу с бронями в Bookings (web_crm/src/pages/Bookings.tsx):





Добавить быстрые фильтры по интервалам времени: "Сейчас", "+30 минут", "Сегодня", "Выходные" (параметры date, time_from, time_to к /bookings/my_restaurant/).



Сделать sticky‑панель действий для мобилки: на узких экранах Confirm/Reject/Complete всегда доступны внизу карточки.



Показать бейдж связанного предзаказа (draft/confirmed order) — использовать поле preorder из BookingSerializer (backend/bookings/serializers.py) и уже существующую страницу Orders (web_crm/src/pages/Orders.tsx).



Публичное бронирование (гость)  





В BookPage (web_crm/src/pages/public/BookPage.tsx) довести UX формы:





Явно подсвечивать ошибки валидации (поля, подсказки), используя структуру ошибок из core.responses.api_error.



Для мобильных ширин проверить, что тайм‑слоты и выбор гостей отображаются в один столбец с крупными тач‑таргетами.



Упростить выбор стола: по умолчанию автоподбор; отдельная кнопка "Выбрать конкретный стол" с модальным TableSelection только для продвинутых пользователей.



Чат (CRM веб + мобильный)  





В MessagesPage (web_crm/src/pages/Messages.tsx):





В шапке чата явно показывать статус брони, дату, время, гостей и стол — эти данные уже приходят через /bookings/ и /chat/messages/?booking=... (backend/chat/serializers.py).



На мобилке сделать компоновку: список броней слева/сверху → чат снизу/справа; убедиться, что кнопки Принять/Отклонить остаются крупными и доступны без горизонтального скролла.



На мобилке (mobile-rn/app/admin/bookings.tsx, mobile-rn/app/chat.tsx):





Синхронизировать статусы и подписи с вебом (pending/approved/completed/no_show ↔ русские бейджи).



Гарантировать, что переход из admin‑списка броней в chat передаёт bookingId и подгружает только её историю (/chat/messages/?booking=...).



Table Map / рассадка (визуал + список)  





В вебе Tables (web_crm/src/pages/Tables.tsx):





Доработать визуальную карту: для мобильных брейкпоинтов автоматически переключаться в табличный/карточный список (viewMode="grid") вместо drag‑and‑drop карты.



На карточке стола добавить быстрые действия: "Открыть бронь", "Отметить no‑show", используя current_booking из /restaurants/tables/status/ (backend/restaurants/views.TableViewSet.status).



В мобильной админке (mobile-rn/app/admin/tables.tsx):





Отражать статус стола (цвет/иконка) так же, как в вебе (map free/reserved/occupied/cleaning).



В список добавить кнопку "Открыть бронирование", если current_booking присутствует в ответе API (расширить fetchTables в mobile-rn/lib/api.ts при необходимости).



2. Углубление аналитики и метрик





Расширение backend‑аналитики  





В backend/analytics/ (особенно views.py и сервисный слой):





Добавить разбиение по источнику брони: сайт, мобильное приложение, оффлайн (source/channel в Booking, либо по маршруту/флагу в запросе).



Ввести метрики retention/повторных гостей на уровне периода: repeat_guests_7d, repeat_guests_30d, используя Customer и Visit (backend/crm/models.py).



Посчитать долю no‑show по дням недели/часам; отдавать серию в analytics/dashboard.



Веб‑дашборд (детализация)  





В Analytics (web_crm/src/pages/Analytics.tsx):





Добавить возможность выбирать период: сегодня / неделя / месяц / произвольный интервал (передача from/to в GET /analytics/dashboard).



Вынести в отдельный блок анализ no‑show: столбчатый график по дням недели, таблица top‑гостей по количеству no‑show.



Добавить сегмент "источник" (channel): фильтр и разбивка bookings/revenue по источникам.



Мобильный дашборд (управленческий вид)  





В AdminAnalyticsScreen (mobile-rn/app/admin/analytics.tsx):





Отображать не только текущие KPI, но и мини‑график тренда загрузки за последнюю неделю (агрегированные данные из DashboardAnalyticsResponse, при необходимости расширить backend‑ответ).



Сфокусироваться на сценариях менеджера: карточки "Сегодня", "Вчера", "Последние 7 дней" с кликабельным переключателем.

flowchart LR
  backendAnalytics[backend/analytics/*] --> dashboardAPI[GET /analytics/dashboard]
  bookingsDB[(Bookings + Orders + CRM)] --> backendAnalytics
  dashboardAPI --> webAnalytics[web_crm/pages/Analytics.tsx]
  dashboardAPI --> mobileAnalytics[mobile-rn/app/admin/analytics.tsx]



3. No‑show management и автоматизации (лайт‑CDP)





No‑show политика  





На бэкенде дополнить Booking и Visit:





Логировать причину no‑show (поле no_show_reason или отдельная модель событий/истории) при вызове BookingViewSet.no_show (backend/bookings/views.py).



При NO_SHOW автоматически создавать Visit с spent_amount = 0 и соответствующим флагом, чтобы не ломать статистику по визитам.



Автоматические напоминания (простые сценарии)  





В automations или через Celery задачи:





Триггер "напоминание гостю за X минут до визита" (если есть телефон/email).



Триггер "follow‑up" после визита: отправка ссылки на отзыв (/guest/booking/:id).



API уровня MVP: конфиг по умолчанию на ресторан, без сложного UI, но с возможностью выключения в Restaurant (поля типа auto_reminder_enabled).



UI в CRM  





В Bookings и/или Customers:





Для гостей с высоким no‑show rate: бейдж "Риск no‑show" в карточке гостя (web_crm/src/pages/Customers.tsx).



Отдельный фильтр "Проблемные гости" (на стороне API — фильтр по visits с высоким no_show процентом).



4. Углубление CRM / Loyalty





Бизнес‑карточка гостя  





В CustomerDetail (web_crm/src/pages/CustomerDetail.tsx):





Добавить временную шкалу взаимодействия: бронирования (/crm/customers/:id/bookings), визиты, чеки, отзывы, внутренние заметки.



Позволить помечать гостя тегами (VIP, Инфлюенсер, Корпоративный) — сохранить в Customer (поле tags или отдельная модель) и отображать в списке.



Сегменты и экспорт  





В CustomerViewSet (backend/crm/views.py):





Добавить параметры фильтрации: min_visits, max_visits, min_total_spent, tag.



Улучшить экспорт /crm/customers/export/, если он уже реализован, или добавить отдельный endpoint для CSV/XLSX с учётом фильтров.



Простые кампании  





Добавить сущность "кампания" (можно в crm): сегмент + текст + канал (SMS/email) без непосредственной интеграции с провайдерами, но с логированием запланированных рассылок.



В UI — лайт‑экран в CRM, где можно собрать сегмент и "запланировать" кампанию; пока это может фиксироваться только в БД/отчётах.



5. Улучшение UX и мобильности (сквозные задачи)





Mobile‑first дизайн на web CRM  





Проверить ключевые экраны в web_crm (Bookings, Analytics, Tables, Orders, Customers, Pricing, Contact) в devtools на ширинах 320 / 375 / 390 / 414 / 768:





Таргеты ≥44px, отсутствие горизонтального скролла (overflow-x-hidden на основном layout).



Таблицы → карточки на малых ширинах (через CSS/условный рендеринг).



Sticky‑панели действий (особенно confirm/reject, primary CTA) закреплены снизу.



Оптимизация скорости ответа  





На бэкенде:





Проверить время ответа для:





/bookings/my_restaurant/ (список броней для CRM и мобилки),



/restaurants/tables/status/ (Table Map),



/analytics/dashboard/.



Добавить select_related/prefetch_related там, где не хватает (особенно bookings → restaurant/user/table/history).



Единый язык ошибок  





Нормализовать ошибки API через core.responses.api_error так, чтобы фронт и мобилка всегда получали компактное поле detail.



На фронте (axios‑интерсептор web_crm/src/services/api.ts, helper mobile-rn/lib/api.ts) уже приводят ошибки к detail; задача — убедиться, что все новые эндпоинты (/crm/leads/, расширенные аналитики, no‑show) следуют этому контракту.



6. Подготовка к следующему этапу (эксперименты и масштабирование)





Эксперименты / A/B‑тесты (MVP‑уровень)  





Добавить простой механизм feature‑flags на фронте (например, window.__KEZDES_FLAGS__ или загрузка флагов из /core/feature_flags/), чтобы:





Включать/выключать новые виджеты аналитики.



Пробовать разные варианты CTA на Pricing/Contact без деплоя.



Масштабирование по ресторанам и городам  





Определить ограничения текущей архитектуры для 50–100 ресторанов:





База: индексы по restaurant_id и временным полям в Booking, Order, Visit.



Очереди задач (Celery/Redis) для автоматизаций и уведомлений.



Составить отдельный технический roadmap (не реализовывать сразу, но зафиксировать критичные точки).



Резюме приоритетов





Сначала: полировка существующих флоу (бронь, чат, предзаказ, Table Map) и улучшение UX web/mobile.



Далее: расширенная аналитика (каналы, no‑show, retention) + привязка к мобильному дашборду.



Затем: no‑show management и простые автоматизации (напоминания, follow‑up).



После этого: углубление CRM/loyalty (карточка гостя, сегменты, экспорт, кампании).



Фоном: оптимизация перфоманса, mobile‑UX, подготовка к feature‑flags и будущим A/B‑тестам.