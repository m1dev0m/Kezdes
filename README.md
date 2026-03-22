# Kezdes

Full-stack MVP for restaurant reservations with a Django API, Web CRM, and Expo mobile app.

## Contents
- backend: Django + DRF + Channels + Celery
- web_crm: React + Vite + TypeScript
- mobile-rn: Expo React Native
- docker-compose.yml: Postgres, Redis, RabbitMQ, MinIO, backend services

## Prerequisites
- Python 3.12+
- Node.js 18+
- Docker (optional but recommended)

## Environment
Copy env templates and adjust as needed:
- `.env.example` (docker services)
- `backend/.env.example`
- `mobile-rn/.env.example`

Minimal local backend env:
```
DEBUG=True
DATABASE_URL=postgres://kezdes_user:kezdes_password@localhost:5432/kezdes
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
SECRET_KEY=django-insecure-dev-key-example
ALLOWED_HOSTS=*
JWT_SIGNING_KEY=secret
```

## Quick Start (Docker)
```
docker compose up --build
```

This brings up:
- API: http://localhost:8000
- Swagger: http://localhost:8000/api/docs/
- Redoc: http://localhost:8000/api/redoc/
- Postgres: localhost:5432
- Redis: localhost:6379
- RabbitMQ: localhost:5672 (UI http://localhost:15672)
- MinIO: http://localhost:9000 (console http://localhost:9001)

## Backend (local dev)
```
cd backend
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows (PowerShell):
# .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
# ASGI (WS enabled):
./run_dev.sh
```

Run tests:
```
python manage.py test
```

## Web CRM (local dev)
```
cd web_crm
npm install
npm run dev
```

Run tests:
```
npm test -- --run
```

## Mobile (Expo)
```
cd mobile-rn
npm install
npx expo start
```

Set API base URL in `mobile-rn/.env`:
```
EXPO_PUBLIC_API_URL=http://YOUR_IP:8000/api/v1
```

## API Endpoints (high level)
- Auth: `/api/v1/auth/`
- Health: `/api/v1/health/live/`, `/api/v1/health/ready/`
- Bookings: `/api/v1/bookings/`
- Orders: `/api/v1/orders/`
- Chat: `/api/v1/chat/messages/`

## MVP E2E Flow (booking -> confirm -> chat -> attach_order)
1. Organizer creates booking: `POST /api/v1/bookings/`
2. Restaurant admin lists pending bookings: `GET /api/v1/bookings/my_restaurant/?status=pending`
3. Admin confirms booking: `POST /api/v1/bookings/{id}/confirm/`
4. Chat message for booking: `POST /api/v1/chat/messages/`
5. Create draft order: `POST /api/v1/orders/`
6. Attach order to booking: `POST /api/v1/bookings/{id}/attach_order/`
