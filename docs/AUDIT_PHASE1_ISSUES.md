# Phase 1 — Project Analysis: Detected Problems

## Fixes applied (before Phase 2)

- **Restaurant registration role**: Normalized `restaurant_owner`/`restaurant_admin` → `owner`, added `organizer` → `customer` in `RegisterSerializer`. `SetupRestaurantView` and restaurant `claim`/approve flow accept `owner`. Approved users get `profile.role = 'owner'`.
- **ValidationError**: Replaced `str(e.message)` with `str(e)` in `bookings/views.py` (Django ValidationError has `messages`, not `message`).
- **BookingSerializer null user**: `user_name`, `user_phone`, `table_number`, `table_id`, `customer_id` are now `SerializerMethodField` and handle `user=None` / `table=None` (manual bookings).
- **Migration 0015 (SQLite)**: Replaced raw `BtreeGistExtension()` with `RunPython(apply_btree_gist, noop)` that runs `CREATE EXTENSION btree_gist` only when `connection.vendor == 'postgresql'`.
- **BookingViewSet get_queryset**: Included `owner` and `host` in role branches so owners see their restaurant’s bookings.
- **Tests**: Updated `tests_critical` to expect role `owner` and to use `?my_restaurants=true` for restaurant list. Added `organizer` → `customer` so booking lifecycle test can register. Updated `UserMeSerializer` so `restaurant_verified`/`restaurant_setup_required` consider role `owner`.

---

## Project structure
- **Backend**: Django (config, core, restaurants, bookings, crm, orders, chat, analytics, reports, venues, contractors)
- **Frontend**: React (Vite) in `web_crm/`
- **Mobile**: React Native (Expo) in `mobile-rn/`
- **Database**: SQLite by default (no DATABASE_URL); PostgreSQL via Docker

## Backend routes (API v1)
- `auth/`: register, login, refresh, me, setup-restaurant, push-token
- `restaurants/`: CRUD, me, claim, availability, menu, reviews; requests (applications), tables
- `bookings/`: ViewSet (create, confirm, reject, cancel, available_slots, my_restaurant, create_manual, check_in, complete, no_show)
- `crm/`: customers, notes, visits
- `tables/`: (under restaurants) table management
- `orders/`, `chat/`, `analytics/`, `reports/`, `venues/`, `contractors/`

## Database models
- **core**: User, Profile (role, restaurant), PushToken
- **restaurants**: Restaurant, Table, OpeningHours, RestaurantRequest, Availability, Review
- **bookings**: Booking, BookingSecurity, ReservationHistory
- **crm**: Customer, Visit, CustomerNote
- **orders**: Order, MenuItem, MenuCategory, etc.

## Detected issues (to fix)

### Critical
1. **Restaurant registration role mismatch**  
   Profile.ROLE_CHOICES uses `owner`; RegisterSerializer allows only choices, but frontend/API often send `restaurant_owner`. Need to normalize `restaurant_owner` → `owner` and allow `owner` in SetupRestaurantView and claim.

2. **ValidationError.message**  
   Django ValidationError has `messages` (list), not `message`. Code uses `str(e.message)` in bookings/views.py (multiple places) → AttributeError. Use `str(e)` or `getattr(e, 'messages', [str(e)])`.

3. **BookingSerializer with null user**  
   Manual/admin bookings can have `user=None`. Serializer uses `source='user.get_full_name'` and `source='user.profile.phone'` → will break. Use SerializerMethodField and handle None.

4. **Migration 0015 (btree_gist) on SQLite**  
   `BtreeGistExtension()` is PostgreSQL-only. With default SQLite, `migrate` fails. Make 0015 conditional (skip on non-PostgreSQL).

### Medium
5. **BookingViewSet get_queryset roles**  
   Uses legacy role names (`restaurant_admin`, `restaurant_owner`, `worker`, `hostess`). Profile stores `owner`, `manager`, `host`. Ensure mapping or use consistent names so owners see their bookings.

6. **create_manual response**  
   On success, code path falls through to `return Response(serializer.data, 201)` after try/except; ensure no missing return on exception paths (CRM record_visit is already in try/except pass).

7. **Restaurant approve flow**  
   Sets `user.profile.role = "restaurant_admin"`; Profile.ROLE_CHOICES has `owner`. Prefer setting to `owner` for consistency, or keep both accepted everywhere.

### Low / consistency
8. **Settings**: `django.contrib.postgres` in INSTALLED_APPS — harmless on SQLite but only needed for PostgreSQL features.
9. **Mobile API**: updateBookingStatus uses PATCH; backend accepts POST and PATCH — OK.
10. **CORS**: Frontend expects backend at VITE_API_URL or localhost:8000 — verify .env for web_crm.

---

## Next steps (Phases 2–10)
- Phase 2: Run backend, frontend, DB; fix startup/migration errors.
- Phase 3–6: Test UI and CRM flows; fix broken endpoints and reservation logic.
- Phase 7: Run mobile app; fix API base URL and auth.
- Phase 8: Validate schema (tables, FKs, indexes).
- Phase 9: Add/run automated tests for auth, restaurant, tables, reservations.
- Phase 10: Load test with multiple restaurants and reservations.
