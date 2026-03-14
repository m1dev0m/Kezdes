import os
from pathlib import Path
from typing import Any, Callable, Dict, Optional


class Env:
    """
    Lightweight replacement for django-environ used in this project.

    Supports only the subset of features actually used in settings.py:
    - type casting for simple values via Env(DEBUG=(bool, True))
    - env('NAME', default=...)
    - env.bool('NAME', default=...)
    - env.list('NAME', default=[...])
    - env.db('DATABASE_URL')
    """

    def __init__(self, **schema: tuple[type, Any]):
        self._schema: Dict[str, tuple[type, Any]] = {
            k.upper(): (v_type, default) for k, (v_type, default) in schema.items()
        }

    def __call__(self, name: str, default: Any = ...):
        key = name.upper()
        raw = os.environ.get(key)

        if raw is None:
            if key in self._schema:
                v_type, schema_default = self._schema[key]
                return schema_default if schema_default is not ... else self._cast(v_type, None, default)
            if default is not ...:
                return default
            raise KeyError(f"Environment variable {key} is required")

        v_type: Optional[type] = None
        if key in self._schema:
            v_type = self._schema[key][0]

        return self._cast(v_type, raw, default)

    @staticmethod
    def _cast(v_type: Optional[type], raw: Optional[str], default: Any):
        if raw is None:
            return default if default is not ... else None

        if v_type is bool:
            return raw.lower() in ("1", "true", "yes", "on")
        if v_type is int:
            return int(raw)
        if v_type is float:
            return float(raw)
        # Fallback: string
        return raw

    @classmethod
    def read_env(cls, env_file: str):
        """
        Very small .env parser: KEY=VALUE per line, ignoring comments.
        """
        path = Path(env_file)
        if not path.exists():
            return

        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)

    def bool(self, name: str, default: bool = False) -> bool:
        raw = os.environ.get(name.upper())
        if raw is None:
            return default
        return raw.lower() in ("1", "true", "yes", "on")

    def list(self, name: str, default: Optional[list] = None, separator: str = ","):
        raw = os.environ.get(name.upper())
        if raw is None:
            return list(default) if default is not None else []
        return [item.strip() for item in raw.split(separator) if item.strip()]

    def db(self, name: str, default: Optional[str] = None) -> Dict[str, Any]:
        """
        Parse DATABASE_URL into Django DATABASES['default'] style dict.
        If env var is missing, fallback to SQLite in BASE_DIR / 'db.sqlite3'.
        """
        url = os.environ.get(name.upper(), default)
        if not url:
            # Lazy import to avoid circulars
            from django.conf import settings  # type: ignore

            return {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": str(Path(getattr(settings, "BASE_DIR", Path("."))) / "db.sqlite3"),
            }

        # Very small parser: postgres://USER:PWD@HOST:PORT/NAME
        # For anything more exotic, users should install django-environ.
        if "://" not in url:
            raise ValueError("DATABASE_URL must be in URL form, e.g. postgres://user:pass@host:5432/dbname")

        scheme, rest = url.split("://", 1)
        engine_map = {
            "postgres": "django.db.backends.postgresql",
            "postgresql": "django.db.backends.postgresql",
            "psql": "django.db.backends.postgresql",
            "mysql": "django.db.backends.mysql",
            "sqlite": "django.db.backends.sqlite3",
        }
        engine = engine_map.get(scheme, "django.db.backends.postgresql")

        if scheme.startswith("sqlite"):
            return {"ENGINE": engine, "NAME": rest}

        user = password = host = port = db_name = None
        creds, _, host_part = rest.partition("@")
        if ":" in creds:
            user, password = creds.split(":", 1)
        else:
            user = creds

        if "/" in host_part:
            host_port, db_name = host_part.split("/", 1)
        else:
            host_port = host_part

        if ":" in host_port:
            host, port = host_port.split(":", 1)
        else:
            host = host_port

        config: Dict[str, Any] = {
            "ENGINE": engine,
            "NAME": db_name,
            "USER": user,
            "PASSWORD": password or "",
            "HOST": host or "",
            "PORT": port or "",
        }
        return config

