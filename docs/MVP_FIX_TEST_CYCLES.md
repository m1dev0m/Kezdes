# MVP Fix/Test Cycles

Run this loop 3-5 times:

1. Fix logic
- inspect auth/restaurant/table/reservation flows
- patch backend validation and ownership checks
- patch frontend payload mismatches

2. Test system
- run API tests
- run reservation conflict tests
- smoke-test key UI pages

3. Fix bugs
- prioritize data integrity and booking conflicts first
- then UX and non-blocking issues

## Exit Criteria
MVP is accepted when:
- restaurant registration + admin approval works
- table CRUD works per-restaurant
- customer can book reservation
- double-booking is prevented
- owner dashboard shows correct reservations
