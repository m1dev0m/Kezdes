# Staging Checklist (MVP)

## Environment
- [ ] `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY` configured
- [ ] migrations applied
- [ ] superadmin user exists
- [ ] health endpoints return `200`

## Backend Validation
- [ ] auth register/login works
- [ ] restaurant setup + admin approval works
- [ ] table CRUD works
- [ ] booking create/confirm/cancel works
- [ ] idempotency key behavior verified
- [ ] double-booking prevention verified

## Frontend Validation
- [ ] web app builds
- [ ] web Playwright smoke passes
- [ ] mobile typecheck passes
- [ ] mobile login + booking + admin booking list manually verified

## Observability
- [ ] error monitoring enabled
- [ ] application logs retained
- [ ] DB backup job scheduled

## Sign-off
- [ ] QA sign-off
- [ ] Product sign-off
- [ ] Go/No-go decision recorded
