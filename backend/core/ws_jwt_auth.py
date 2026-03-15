from __future__ import annotations

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication


@database_sync_to_async
def _get_user_for_token(raw_token: str):
    auth = JWTAuthentication()
    validated = auth.get_validated_token(raw_token)
    return auth.get_user(validated)


class QueryStringJWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        params = parse_qs(query_string)
        token = (params.get('token') or [None])[0]

        if token:
            try:
                scope['user'] = await _get_user_for_token(token)
            except Exception:
                pass

        return await super().__call__(scope, receive, send)
