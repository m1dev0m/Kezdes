import os
import sys
from pathlib import Path
from datetime import timedelta
import environ
BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(
    DEBUG=(bool, False)
)

IS_TESTING = (
    "pytest" in sys.modules
    or os.environ.get("PYTEST_CURRENT_TEST") is not None
    or any("pytest" in arg for arg in sys.argv)
    or sys.argv[1:2] == ["test"]
    or os.environ.get("TEST_ENV") == "true"
)

                                                                                            
                                                       
if IS_TESTING:
    os.environ["DEBUG"] = "True"
    os.environ.setdefault("SECRET_KEY", "django-insecure-test-key-change-me-2026")

def _load_env_file():
    env_file_path = os.path.join(BASE_DIR, '.env')
    if os.path.exists(env_file_path):
        environ.Env.read_env(env_file_path)
                                                                                       
                                                                                       
                                                                                        
        raw_debug = os.environ.get("DEBUG")
        valid_debug_values = {
            "true",
            "false",
            "1",
            "0",
            "yes",
            "no",
            "on",
            "off",
        }
        if raw_debug and raw_debug.lower() not in valid_debug_values:
            try:
                with open(env_file_path, "r", encoding="utf-8") as handle:
                    for raw_line in handle:
                        line = raw_line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, value = line.split("=", 1)
                        if key.strip() == "DEBUG":
                            os.environ["DEBUG"] = value.strip().strip('"').strip("'")
                            break
            except OSError:
                pass

_load_env_file()
DEBUG = env('DEBUG')
SECRET_KEY = env('SECRET_KEY', default=None)
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-key-please-change-in-production-2026'
    else:
        raise ValueError('SECRET_KEY is required when DEBUG=False')

JWT_SIGNING_KEY = env('JWT_SIGNING_KEY', default=SECRET_KEY)
if not DEBUG and len(JWT_SIGNING_KEY) < 32:
    raise ValueError('JWT_SIGNING_KEY must be at least 32 characters when DEBUG=False')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', 'testserver'])
if DEBUG:
                                                                                           
    ALLOWED_HOSTS = ['*']
TWOGIS_API_KEY = env('TWOGIS_API_KEY', default='')
CSRF_TRUSTED_ORIGINS = env.list(
    'CSRF_TRUSTED_ORIGINS',
    default=[
        'http://localhost:3000',
        'http://localhost:5000',
        'http://localhost:5173',
        'http://localhost:5175',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5175',
        'https://kezdes.kz',
        'https://www.kezdes.kz',
    ],
)
ENABLE_API_DOCS = env.bool('ENABLE_API_DOCS', default=DEBUG)

ADMIN_URL = env('ADMIN_URL', default='secure-super-admin-9481')
ALLOW_ADMIN_IPS = env.list('ALLOW_ADMIN_IPS', default=[])
TRUSTED_PROXY_IPS = env.list('TRUSTED_PROXY_IPS', default=[])

INSTALLED_APPS = [
    'core.admin_config.KezdesAdminConfig',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'django_filters',
    'core',
    'restaurants',
    'bookings',
    'crm',
    'chat',
    'orders',
    'contractors',
    'analytics',
    'automations',
    'venues',
    'django_celery_beat',
]
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'core.middleware.AdminIPAllowlistMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'config.urls'
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
WSGI_APPLICATION = 'config.wsgi.application'
DATABASES = {
    'default': env.db(
        'DATABASE_URL',
    )
}

ASGI_APPLICATION = 'config.asgi.application'
REDIS_URL = env("REDIS_URL", default=None)
if not DEBUG and not REDIS_URL:
    raise ValueError('REDIS_URL is required when DEBUG=False')

if IS_TESTING or DEBUG:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "kezdes-dev-cache",
        }
    }
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }
    CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=REDIS_URL or "redis://127.0.0.1:6379/0")
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        }
    }
    CELERY_BROKER_URL = env('CELERY_BROKER_URL', default=REDIS_URL)
    if not CELERY_BROKER_URL:
        raise ValueError('CELERY_BROKER_URL is required when DEBUG=False')
CELERY_BEAT_SCHEDULER = env(
    'CELERY_BEAT_SCHEDULER',
    default='django_celery_beat.schedulers:DatabaseScheduler',
)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000          
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_REFERRER_POLICY = 'same-origin'

USE_X_FORWARDED_HOST = env.bool('USE_X_FORWARDED_HOST', default=not DEBUG)
if env.bool('USE_X_FORWARDED_PROTO', default=not DEBUG):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = env('TIME_ZONE', default='Asia/Almaty')
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core.exceptions.api_exception_handler',
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated', 
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': env('THROTTLE_ANON_RATE', default='100/min'),
        'user': env('THROTTLE_USER_RATE', default='1000/min'),
        'auth': env('THROTTLE_AUTH_RATE', default='20/min'),
    },
}

if DEBUG or IS_TESTING:
    REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'].append(
        'rest_framework.authentication.SessionAuthentication'
    )

if IS_TESTING:
    REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = []
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {}
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True

SPECTACULAR_SETTINGS = {
    'TITLE': 'Kezdes API',
    'DESCRIPTION': 'API for Kezdes App',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=DEBUG)
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=[
        'https://kezdes.kz',
        'https://www.kezdes.kz',
        'http://localhost:3000',
        'http://localhost:5000',
        'http://localhost:5173',
        'http://localhost:5175',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5175',
    ],
)

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
                                                                                      
                                                                                           
    'BLACKLIST_AFTER_ROTATION': 'rest_framework_simplejwt.token_blacklist' in INSTALLED_APPS,
    'UPDATE_LAST_LOGIN': True,
    'SIGNING_KEY': JWT_SIGNING_KEY,
}

                
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='')
EMAIL_PORT = int(env('EMAIL_PORT', default=587))
EMAIL_USE_TLS = env('EMAIL_USE_TLS', default='True').lower() == 'true'
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@kezdes.kz')

GLOBAL_ADMIN_EMAIL = env('GLOBAL_ADMIN_EMAIL', default='admin@kezdes.kz')

              
                                                                           
                                                      
REQUIRE_EMAIL_OTP = env('REQUIRE_EMAIL_OTP', default='False' if DEBUG else 'True').lower() == 'true' and not IS_TESTING
OTP_EXPIRE_MINUTES = int(env('OTP_EXPIRE_MINUTES', default=10))

if not DEBUG:
    if not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS:
        raise ValueError('ALLOWED_HOSTS must be explicitly configured when DEBUG=False')
    if CORS_ALLOW_ALL_ORIGINS:
        raise ValueError('CORS_ALLOW_ALL_ORIGINS must be False when DEBUG=False')
