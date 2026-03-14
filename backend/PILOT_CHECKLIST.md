## Pilot checklist (Kezdes → 1–3 restaurants)

### 1. Create demo restaurant

- Create owner user (role `restaurant_admin`).
- In admin or via API, create `Restaurant` with:
  - `name`, `address`, `city`, `phone`.
  - `capacity` and `average_price`.
  - `plan` set to `pro` or `business`.

### 2. Configure tables (minimal)

- Go to web CRM `Tables` screen (`/app/tables`).
- Add 6–12 tables with realistic seat counts and positions on the visual map.
- Validate:
  - Table statuses update when bookings are created.
  - Table Map shows `free / reserved / occupied` correctly for the next 2–3 hours.

### 3. Configure menu (optional but recommended)

- In web CRM `Menu`:
  - Add 1–2 categories (e.g. “Основное”, “Напитки”).
  - Add 5–10 popular dishes with prices.
- Check that:
  - Guest booking page shows menu for pre‑order.
  - Pre‑orders appear in `Orders` and link to reservations.

### 4. Daily operations script (host / manager)

**Host:**
- Открывает экран `Bookings` в web CRM или `Бронирования` в mobile admin.
- В течение дня:
  - Следит за новым списком заявок (`pending` сверху).
  - Использует `Confirm / Reject` из списка или из чата.
  - Отмечает `No‑show` и `Completed` по факту визита.

**Manager:**
- Утром проверяет загрузку через:
  - Web `Analytics` (`/app/analytics`) или
  - Mobile `Аналитика` (экран admin).
- В часы пик:
  - Следит за `Table Map` (web или мобильный список столов).
  - Пересаживает гостей при необходимости.
  - Следит за no‑show и повторными гостями.

### 5. Feedback after 1 pilot day

- 15–20 минутный созвон с менеджером:
  - Понятность интерфейса для хоста и менеджера (web + mobile).
  - Насколько помогают:
    - Table Map / статусы столов.
    - Дашборд аналитики (загрузка, выручка, no‑show).
  - Что мешает использовать систему каждый день.
  - Какую “рутинную боль” хотелось бы закрыть следующей.

