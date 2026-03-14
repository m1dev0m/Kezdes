# Pilot Runbook (10 Restaurants)

## Scope
- 10 restaurants
- 100+ bookings target
- 2-week pilot

## Daily Ops
1. Check health:
   - `GET /api/v1/health/live/`
   - `GET /api/v1/health/ready/`
2. Check failed reservation attempts
3. Check admin queue for pending restaurant approvals
4. Verify booking conflict rate remains low

## Incident Playbook
- Booking failures spike:
  - verify DB/cache readiness
  - inspect recent deploy and rollback if needed
- Duplicate booking reported:
  - inspect booking ids + timestamps
  - verify idempotency key and slot lock behavior
  - hotfix and rerun concurrency tests

## Success Criteria
- Restaurants can manage tables
- Customers can create/cancel bookings reliably
- No double-booking incidents in pilot
- Admin approvals processed within SLA
