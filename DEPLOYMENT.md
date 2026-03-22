# Kezdes Deployment & Operations Manual

## Quick Start (Production)

### Prerequisites
- Docker + Docker Compose
- PostgreSQL 14+
- Redis 6+
- 8GB RAM minimum
- 2 CPU cores minimum

### 1-Minute Deploy
```bash
# Clone
git clone https://github.com/your-org/kezdes.git
cd kezdes

# Configure
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Build Web CRM (static)
cd web_crm
npm install
npm run build
cd ..

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify
curl http://localhost/api/v1/health/live/
```

---

## Environment Setup

### Production Variables (.env)
```bash
# Security
DEBUG=False
SECRET_KEY=<generate: python -c 'import secrets; print(secrets.token_urlsafe(32))'>
ALLOWED_HOSTS=api.kezdes.kz,www.kezdes.kz

# Database (use managed service in production)
DATABASE_URL=postgres://user:pass@db.example.com:5432/kezdes_prod
DATABASES_REPLICA_URL=postgres://user:pass@db-replica.example.com:5432/kezdes_prod

# Redis (use Redis Cloud or self-hosted cluster)
REDIS_URL=redis://redis-prod:6379/0
REDIS_REPLICA_URL=redis://redis-replica:6379/0

# API URLs (for frontend)
API_BASE_URL=https://api.kezdes.kz/api/v1
WS_BASE_URL=wss://api.kezdes.kz

# Celery
CELERY_BROKER_URL=amqp://user:pass@rabbitmq:5672//

# Email (required for production)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=<SendGrid API key>
DEFAULT_FROM_EMAIL=noreply@kezdes.kz

# Storage (S3 for media files)
USE_S3=True
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_STORAGE_BUCKET_NAME=kezdes-prod-media
AWS_S3_REGION_NAME=eu-central-1

# Monitoring (optional)
SENTRY_DSN=https://key@sentry.io/project
```

---

## Deployment Strategies

### Strategy 1: Docker Compose + VPS
**Best for**: < 5000 users, single region, budget-conscious

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Scale daphne workers
docker-compose up -d --scale backend=3
```

### Strategy 2: Kubernetes (EKS/GKE/AKS)
**Best for**: > 5000 users, multi-region, auto-scaling needed

```bash
# Deploy
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/nginx.yaml

# Monitor
kubectl get pods -w
kubectl logs -f deployment/backend
```

### Strategy 3: Cloud Platforms
**Best for**: Fully managed, minimal ops burden

- **Heroku**: Deploy with `git push heroku main`
- **Railway.app**: Connect GitHub repo, auto-deploy
- **Fly.io**: Use provided Dockerfile

---

## Health Checks & Monitoring

### Health Endpoints
```bash
# Liveness check (is the app running?)
curl https://api.kezdes.kz/api/v1/health/live/
# Expected: {"status": "ok"}

# Readiness check (is the app ready to serve?)
curl https://api.kezdes.kz/api/v1/health/ready/
# Expected: {"status": "ok", "components": {"database": "ok", "cache": "ok"}}
```

### Monitor Commands
```bash
# Check application
docker-compose logs backend | tail -50
docker-compose exec backend python manage.py check --deploy

# Check database
docker-compose exec backend python manage.py dbshell
# SELECT count(*) FROM bookings_booking;

# Check Redis
docker-compose exec redis redis-cli INFO

# Check Celery tasks
docker-compose logs celery_worker | tail -50
```

---

## Backup & Recovery

### Daily Backup (automated)
```bash
# Add to crontab: 0 2 * * * /opt/kezdes/backup.sh
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)

# Database
docker-compose exec -T postgres pg_dump -U postgres kezdes_db | \
    gzip > /backups/db_$DATE.sql.gz

# Media files (if using local storage)
tar -czf /backups/media_$DATE.tar.gz /opt/kezdes/media/

# Upload to S3
aws s3 cp /backups/db_$DATE.sql.gz s3://backups-bucket/
aws s3 cp /backups/media_$DATE.tar.gz s3://backups-bucket/
```

### Point-in-Time Recovery
```bash
# From backup
gunzip < /backups/db_20240315_020000.sql.gz | \
    docker-compose exec -T postgres psql -U postgres

# From S3
aws s3 cp s3://backups-bucket/db_20240315_020000.sql.gz - | \
    gunzip | docker-compose exec -T postgres psql -U postgres
```

---

## Scaling Operations

### Vertical Scaling (bigger instance)
```bash
# Stop the service
docker-compose down

# Update docker-compose.yml (resources limits)
# Restart
docker-compose up -d
```

### Horizontal Scaling (more instances)
```bash
# Scale backend workers
docker-compose up -d --scale backend=5

# Or with Kubernetes
kubectl scale deployment backend --replicas=5
```

### Database Scaling
```bash
# Add read replicas
# PostgreSQL standby: pg_basebackup -D /var/lib/postgresql/replica

# Switch to replica if primary fails
# In Django settings: use DATABASES_REPLICA_URL for read-only queries
```

---

## Troubleshooting

### Issue: High Database CPU
```bash
# Identify slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Add indexes
docker-compose exec backend python manage.py shell < optimize_db.py
```

### Issue: WebSocket 404
```bash
# Check WS routing
docker-compose exec backend python manage.py show_urls | grep ws

# Verify Daphne is running
docker-compose exec backend curl localhost:8000/api/v1/health/live/

# Check Channels config
docker-compose exec backend python manage.py shell -c "from channels.layers import get_channel_layer; print(get_channel_layer())"
```

### Issue: High Memory Usage
```bash
# Check Redis memory
docker-compose exec redis redis-cli INFO memory

# Clear sessions
docker-compose exec redis redis-cli FLUSHDB

# Check Celery queue backlog
docker-compose exec celery celery -A config inspect active_queues
```

### Issue: API Returns 403/404
```bash
# Check permissions
curl -H "Authorization: Bearer TOKEN" \
     https://api.kezdes.kz/api/v1/restaurants/me/

# Check CORS
curl -i -X OPTIONS https://api.kezdes.kz/api/v1/restaurants/ \
     -H "Origin: https://crm.kezdes.kz"
```

---

## Security Checklist

- [ ] SSL/TLS certificate (Let's Encrypt auto-renewal)
- [ ] SECRET_KEY rotated (at least monthly)
- [ ] Database password in .env (not in code)
- [ ] S3 credentials in secrets manager (not .env)
- [ ] ALLOWED_HOSTS set to specific domains
- [ ] DEBUG = False in production
- [ ] Rate limiting enabled
- [ ] CORS restricted to known origins
- [ ] Firewall rules (only 80, 443, 5432 to VPC)
- [ ] Database backups encrypted
- [ ] Regular security updates (patch day schedule)

---

## Maintenance Windows

### Weekly
- Review error logs (Sentry)
- Check database size/growth
- Monitor uptime

### Monthly
- Update dependencies
- Rotate secrets
- Review metrics (cpu, memory, database connections)

### Quarterly
- Load test (simulate 1.5x expected users)
- Disaster recovery drill (test backups)
- Security audit (dependencies, config)

---

## Rollback Procedure

```bash
# Rollback to previous version
git log --oneline | head -5
git revert <commit-hash>

# OR with tagged releases
git checkout v1.2.3
docker-compose build
docker-compose up -d

# Verify
curl https://api.kezdes.kz/api/v1/health/ready/
```

---

## Support & Escalation

**Level 1** (24h response): Bugs, feature requests  
**Level 2** (4h response): Performance issues, data loss risk  
**Level 3** (1h response): Security vulnerabilities, outage

Contact: ops@kezdes.kz
