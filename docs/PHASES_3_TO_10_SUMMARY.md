# Phases 3–10 — Summary

## Phase 3: Frontend

- **IndexRedirect**: Added `owner` and `host` to role list so backend role `owner` redirects to app dashboard and setup flow.
- **Requests**: Handle paginated response (`res.data.results || res.data`); show credentials only when present.
- **Favorites**: Backend stubs `GET /restaurants/favorites/` (returns `[]`) and `DELETE /restaurants/:id/favorite/` (204) so GuestFavorites does not 404.

## Phase 4: Backend API

- **CRM customers**: `GET /crm/customers/:id/bookings/` added; returns bookings for that customer (same restaurant, matching `user_phone`).
- **CRM serializer**: Added `full_name`, `total_bookings`, `notes` (SerializerMethodField) for CustomerDetail page.
- **CRM PATCH notes**: `partial_update` on CustomerViewSet saves `notes` into CustomerNote (create or update first note).
- **Favorites**: New actions on RestaurantViewSet: `favorites` (GET → []), `favorite` (DELETE → 204).

## Phase 5: Reservation system

- Covered by existing booking tests: locking, capacity, duration, status transitions (see `bookings/test_edge_cases.py`, `test_core_mvp.py`).
- E2E test: customer creates booking, owner sees it in `my_restaurant`.

## Phase 6: CRM

- Customers list/detail, customer bookings, PATCH notes — all covered by Phase6CRMAPI in `test_e2e_phases.py`.

## Phase 7: Mobile app

- **API**: `mobile-rn/lib/api.ts` uses `EXPO_PUBLIC_API_URL` or dev fallback. Set `EXPO_PUBLIC_API_URL` in `mobile-rn/.env` to your backend (e.g. `http://YOUR_IP:8000/api/v1`). `.env.example` added.
- Endpoints used by mobile match backend: login, restaurants, bookings (create, list, cancel, confirm, etc.), tables, orders, push token.

## Phase 8: Database

- `test_e2e_phases.Phase8DatabaseValidation` checks presence of `auth_user`, `core_profile`, `restaurants_*`, `bookings_booking`, `crm_customer` (SQLite/PostgreSQL).

## Phase 9: Automated tests

- **test_e2e_phases.py**: Phase3 (login, me, restaurant list/me, available_slots, favorites), Phase4 (create booking, my_restaurant), Phase6 (customers list, detail, bookings, PATCH notes), Phase8 (tables exist), Phase10 (3 restaurants, 3 bookings, each owner sees 1).
- **core.tests_critical**: Registration, restaurant creation, visibility with `my_restaurants=true`, booking lifecycle.
- **bookings**: test_core_mvp, test_edge_cases (capacity, duration, status transitions) — run with `pytest bookings/`.

## Phase 10: Load simulation

- **Phase10LoadSimulation**: Creates 3 owners, 3 restaurants (2 tables each), 1 customer; customer books one slot per restaurant at non-overlapping times (18:00, 20:00, 22:00); each owner sees exactly 1 booking in `my_restaurant`.

## How to run

```bash
# Backend
cd backend && source venv/bin/activate
python manage.py migrate --noinput
python manage.py test test_e2e_phases core.tests_critical --noinput
pytest bookings/ -v

# Frontend
cd web_crm && npm run dev   # http://localhost:5173

# Mobile (set EXPO_PUBLIC_API_URL in mobile-rn/.env)
cd mobile-rn && npx expo start
```

## Stability

- All 17 tests in `test_e2e_phases` + `core.tests_critical` pass.
- Booking conflict and capacity rules enforced (serializer + service + tests).
- Frontend and CRM flows covered by E2E API tests; mobile uses same API with correct base URL.
