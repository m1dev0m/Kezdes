# Kezdes Backend Development Guide

## Quick Start (Localhost Development)

### Option 1: Docker Compose (Recommended)
```bash
# From root directory
docker compose up --build

# Backend will be running at: http://localhost:8000
# API docs: http://localhost:8000/api/docs/
# WebSocket: ws://localhost:8000/ws/bookings/<id>/
```

### Option 2: Local Python + Environment
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Ensure .env file
cp .env.example .env  # if exists, or create with your DB/Redis URLs

# Run migrations
python manage.py migrate

# Start ASGI dev server (with WS support)
./run_dev.sh
# Or manually:
daphne -b 0.0.0.0 -p 8000 -v 2 config.asgi:application
```

## Verify WS is Working

### From Web CRM Console (when logged in)
```javascript
// Should NOT show 404/refused errors
// Check: Network tab → WS tab → look for ws://localhost:8000/ws/bookings/<id>/ or /ws/chat/<id>/
```

### Using websocat (CLI)
```bash
# Install: cargo install websocat (or brew install websocat)
# Test chat WS (replace with real token)
websocat "ws://localhost:8000/ws/chat/1/?token=YOUR_JWT_TOKEN"

# Should show connection accepted, no 404
```

### Using curl (HTTP check)
```bash
# Verify HTTP API works
curl http://localhost:8000/api/v1/auth/me/ -H "Authorization: Bearer YOUR_TOKEN"

# Should return user profile, not 404
```

## Key Endpoints

| Purpose | URL | Type |
|---------|-----|------|
| API Schema | `http://localhost:8000/api/schema/` | GET |
| Docs (Swagger) | `http://localhost:8000/api/docs/` | GET (OpenAPI UI) |
| Health Check | `http://localhost:8000/api/v1/health/live/` | GET |
| Chat WS | `ws://localhost:8000/ws/chat/RESTAURANT_ID/?token=JWT` | WebSocket |
| Bookings WS | `ws://localhost:8000/ws/bookings/RESTAURANT_ID/?token=JWT` | WebSocket |

## Environment Variables

Create `.env` file in backend/:
```
DEBUG=True
SECRET_KEY=your-secret-key-here-min-32-chars
DATABASE_URL=postgres://postgres:password@localhost:5432/kezdes_db
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1,localhost:3000,localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
```

## Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=.

# Run specific app tests
pytest bookings/tests/ -v
```

## Architecture Notes

- **ASGI Server**: Daphne (handles HTTP + WebSocket simultaneously)
- **Channel Layer**: Redis (for multi-instance scaling)
- **Auth**: JWT (simplejwt) + Session auth
- **Task Queue**: Celery + RabbitMQ

**Important**: `manage.py runserver` does NOT reliably serve WebSockets. Always use `daphne` for dev.
