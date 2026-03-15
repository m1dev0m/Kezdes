# Kezdes Scaling Guide: 1000-1500 Active Users

## Executive Summary
For 1000-1500 concurrent active users, Kezdes needs:
- ✅ Database indexes (already present)
- ✅ Query optimization (select_related/prefetch_related)
- ✅ Connection pooling (pgBouncer / Django-dbconn-retry)
- ✅ Redis caching layer
- ✅ Rate limiting & throttling
- ✅ ASGI async workers (daphne/uvicorn)
- ✅ Load balancing (nginx)
- ✅ Celery task offloading

---

## Architecture for 1000-1500 Users

### Deployment Structure
```
                          [DNS]
                           |
                    [nginx/caddy] (load balancer)
                      /    |    \
            [daphne:1]  [daphne:2]  [daphne:3]
                          |
                    [PostgreSQL + pgBouncer]
                          |
            [Redis cluster] --- [Celery workers]
```

### Key Numbers
- **Concurrent Connections**: ~1000-1500
- **Database Connections**: 2 per daphne × 3 = 6 (+ pgBouncer pool 20)
- **Redis Memory**: ~2-4 GB (sessions + channel layer)
- **Disk I/O**: ~100-200 IOPS
- **Network**: 100 Mbps+ recommended

---

## 1. Database Optimization (PostgreSQL)

### Connection Pooling
```bash
# Install pgBouncer
sudo apt-get install pgbouncer

# /etc/pgbouncer/pgbouncer.ini
[databases]
kezdes_db = host=localhost port=5432 dbname=kezdes_db

[pgbouncer]
pool_mode = transaction
max_client_conn = 500
default_pool_size = 20
reserve_pool_size = 5
reserve_pool_timeout = 3
```

### Critical Indexes (Verify)
```sql
-- These MUST exist for scale
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_date ON bookings(restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_restaurant ON chat_message(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders_order(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders_order(restaurant_id, status);
```

### Query Tuning
In Django settings.py:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Connection persistence
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'  # 30s timeout
        }
    }
}
```

### Monitor
```sql
-- Check slow queries
SELECT query, calls, mean_time FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;

-- Check connections
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
```

---

## 2. Caching Strategy

### Redis Layers
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'MAX_CONNECTIONS': 50,
            'IGNORE_EXCEPTIONS': True,  # Fail gracefully if Redis down
        }
    }
}

# Cache keys expiry (in seconds)
CACHE_TIMEOUTS = {
    'restaurant': 3600,        # 1 hour
    'booking_availability': 300,  # 5 min
    'menu': 7200,              # 2 hours
    'user_profile': 1800,      # 30 min
}
```

### What to Cache
```python
# In views/serializers
from django.views.decorators.cache import cache_page

@cache_page(60 * 15)  # 15 minutes
def list_restaurants(request):
    ...

# Or with fragment caching in templates
{% load cache %}
{% cache 300 "restaurant_list" %}
    {# expensive computation #}
{% endcache %}
```

---

## 3. Async Task Offloading

### Celery Configuration
```python
# settings.py
CELERY_BROKER_URL = 'amqp://guest:guest@localhost:5672//'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_EXPIRES = 3600

# Task routing
CELERY_TASK_ROUTES = {
    'bookings.tasks.process_past_bookings': {'queue': 'analytics'},
    'analytics.tasks.generate_report': {'queue': 'analytics'},
    'notifications.tasks.send_email': {'queue': 'notifications'},
}

# Beat schedule (periodic tasks)
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'process-bookings-every-hour': {
        'task': 'bookings.tasks.process_past_bookings',
        'schedule': crontab(minute=0),  # Every hour
    },
    'expire-stale-bookings-every-30min': {
        'task': 'bookings.tasks.expire_stale_bookings',
        'schedule': 1800.0,  # Every 30 minutes
    },
}
```

### Move Heavy Operations
```python
# tasks.py
@shared_task
def send_booking_confirmation(booking_id):
    """Send email async - don't block HTTP response"""
    booking = Booking.objects.get(id=booking_id)
    send_email(booking.user.email, ...)

# In views.py
def create_booking(request):
    booking = Booking.objects.create(...)
    send_booking_confirmation.delay(booking.id)  # Async
    return Response({'status': 'created'})
```

---

## 4. ASGI Server (Daphne) Tuning

### docker-compose.yml or production
```yaml
backend:
  image: kezdes-backend:latest
  command: >
    daphne 
    -b 0.0.0.0 
    -p 8000 
    --ws-per-message-deflate=false
    config.asgi:application
  environment:
    - WEB_CONCURRENCY=4  # 4 worker processes
    - PYTHONUNBUFFERED=1
    - DJANGO_SETTINGS_MODULE=config.settings
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

### Systemd service (production Linux)
```ini
# /etc/systemd/system/kezdes-backend.service
[Unit]
Description=Kezdes Backend (Daphne)
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/kezdes/backend
Environment="PATH=/opt/kezdes/venv/bin"
Environment="PYTHONPATH=/opt/kezdes/backend"
ExecStart=/opt/kezdes/venv/bin/daphne -b 0.0.0.0 -p 8000 config.asgi:application
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## 5. Rate Limiting & Throttling

### Django settings
```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',        # Unauthenticated users
        'user': '10000/hour',      # Authenticated users
        'auth': '20/hour',         # Login endpoint
        'bookings': '100/hour',    # Per-endpoint scope
    }
}
```

### Custom throttle classes
```python
# permissions.py
from rest_framework.throttling import ScopedRateThrottle

class HighVolume(ScopedRateThrottle):
    """For endpoints that handle lots of traffic"""
    scope = 'bookings'
    
class LowVolume(ScopedRateThrottle):
    """For expensive operations"""
    scope = 'auth'
    THROTTLE_RATES = {'auth': '5/hour'}

# In viewsets
class BookingViewSet(viewsets.ModelViewSet):
    throttle_scope = 'bookings'
```

---

## 6. WebSocket Scaling

### Channel Layers Configuration
```python
# settings.py for production
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('redis', 6379)],
            'group_expiry': 3600,  # Expire groups after 1 hour
            'capacity': 1500,      # Max messages in channel buffer
            'expiry': 10,          # Message expiry time
        },
    },
}

# If using clustering, use Redis Sentinel or Cluster:
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [
                ('redis-1', 6379),
                ('redis-2', 6379),
                ('redis-3', 6379),
            ],
            'sentinel': [
                ('sentinel-1', 26379),
                ('sentinel-2', 26379),
                ('sentinel-3', 26379),
            ],
        },
    },
}
```

### WS Connection Limits
```python
# consumers.py
class ChatConsumer(AsyncJsonWebsocketConsumer):
    MAX_CONNECTIONS_PER_USER = 5
    
    async def connect(self):
        user_connections = await self.count_user_connections()
        if user_connections >= self.MAX_CONNECTIONS_PER_USER:
            await self.close(code=4029, reason="Too many connections")
        ...
```

---

## 7. Load Balancing (nginx)

### Production nginx config
```nginx
upstream daphne_backend {
    least_conn;
    server daphne-1:8000;
    server daphne-2:8000;
    server daphne-3:8000;
}

server {
    listen 80;
    server_name api.kezdes.kz;

    client_max_body_size 50M;
    
    # Rate limit by IP
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=50;

    # WebSocket upgrade
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    location / {
        proxy_pass http://daphne_backend;
        
        # HTTP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 86400;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static/media files
    location /static/ {
        alias /opt/kezdes/static/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 8. Monitoring & Observability

### Prometheus metrics (optional)
```python
# Install: pip install prometheus-client django-prometheus
# In urls.py: path('metrics/', include('django_prometheus.urls'))

# settings.py
INSTALLED_APPS = [
    'django_prometheus',
    ...
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    ...
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]
```

### Structured logging
```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        }
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        }
    }
}
```

### Key metrics to monitor
```
- HTTP response time (p95, p99)
- WebSocket connections (active count)
- Database connection pool usage
- Redis memory / operations/sec
- Celery task queue depth
- Error rate (4xx, 5xx)
```

---

## 9. Pre-Launch Checklist

- [ ] Database indexes verified: `django-extension show_urls | grep admin`
- [ ] N+1 queries tested: Use django-debug-toolbar or `django-extensions`
- [ ] Slow queries identified: `django-silk` or PostgreSQL slow query log
- [ ] Caching layer tested: Redis cluster up and working
- [ ] Celery tasks offloaded: Long-running operations in async queues
- [ ] Rate limiting configured: Throttle scopes set for all public endpoints
- [ ] WS stress tested: 1000+ concurrent WS connections
- [ ] Load tested: 1000+ concurrent HTTP requests
- [ ] Error tracking: Sentry or similar for production errors
- [ ] Database backup strategy: Daily backups to S3 or similar
- [ ] SSL/TLS configured: HTTPS/WSS for production
- [ ] CORS validated: Only allowed origins
- [ ] ALLOWED_HOSTS set: Specific domain names, not `*`

---

## 10. Auto-Scaling (if using Kubernetes/cloud)

### Kubernetes HPA (Horizontal Pod Autoscaling)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Capacity Planning

| Users | Containers | DB Connections | Redis Memory | Estimated Cost/mo |
|-------|------------|-----------------|--------------|-------------------|
| 100   | 1          | 5               | 256 MB       | $50               |
| 500   | 2          | 10              | 1 GB         | $150              |
| 1000  | 3          | 15              | 2 GB         | $300              |
| 1500  | 4          | 20              | 4 GB         | $500              |
| 5000  | 8          | 40              | 8 GB         | $1500             |

---

## Emergency Response

### Database Connection Exhaustion
```bash
# Check connections
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

# Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE datname='kezdes_db' AND state='idle' AND query_start < NOW() - INTERVAL '1 hour';
```

### Redis Memory Exhaustion
```bash
# Check memory
redis-cli INFO memory

# Clear old session data
redis-cli --scan --pattern "sessionid:*" | xargs redis-cli DEL
```

### API Overload
- Temporarily reduce throttle limits
- Enable read-only mode for non-critical endpoints
- Redirect traffic to cached responses

---

## Next Steps

1. Set up monitoring (Prometheus + Grafana)
2. Load test with 1000+ concurrent users (using locust or k6)
3. Verify database performance with query analyzer
4. Configure backup/disaster recovery
5. Plan blue-green deployment strategy
