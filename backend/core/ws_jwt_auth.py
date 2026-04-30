from __future__ import annotations

import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)


@database_sync_to_async
def _get_user_for_token(raw_token: str):
    auth = JWTAuthentication()
    validated = auth.get_validated_token(raw_token)
    return auth.get_user(validated)


def _extract_bearer_token_from_headers(scope) -> str | None:
    headers = dict(scope.get("headers", []))
    auth_header = headers.get(b"authorization")
    if not auth_header:
        return None
    try:
        decoded = auth_header.decode("utf-8")
    except UnicodeDecodeError:
        return None
    prefix = "bearer "
    if decoded.lower().startswith(prefix):
        token = decoded[len(prefix):].strip()
        return token or None
    return None


def _extract_token_from_subprotocols(scope) -> str | None:
    for protocol in scope.get("subprotocols", []) or []:
        if isinstance(protocol, str) and protocol.startswith("bearer."):
            token = protocol[len("bearer."):].strip()
            return token or None
    return None


class QueryStringJWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        token = _extract_bearer_token_from_headers(scope) or _extract_token_from_subprotocols(scope)
        if token is None:
            query_string = scope.get('query_string', b'').decode('utf-8')
            params = parse_qs(query_string)
            token = (params.get('token') or [None])[0]

        if token:
            try:
                scope['user'] = await _get_user_for_token(token)
            except (InvalidToken, TokenError):
                scope["user"] = AnonymousUser()
            except Exception:
                logger.exception("WebSocket JWT auth failed")
                scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
