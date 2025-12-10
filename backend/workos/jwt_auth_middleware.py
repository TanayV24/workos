# workos/jwt_auth_middleware.py
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken

User = get_user_model()

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return None

class JwtAuthMiddleware:
    """
    Token auth middleware for Django Channels.
    Accepts JWT token from:
      - query string: ?token=<jwt>
      - or headers: Authorization: Bearer <jwt>
    Uses Django settings.SIMPLE_JWT for validation.
    Attaches `scope['user']` = User instance or AnonymousUser.
    """

    def __init__(self, inner):
        self.inner = inner

    def __call__(self, scope):
        return JwtAuthMiddlewareInstance(scope, self.inner)

class JwtAuthMiddlewareInstance:
    def __init__(self, scope, inner):
        self.scope = dict(scope)
        self.inner = inner

    async def __call__(self, receive, send):
        token = None

        # 1) check query string
        query_string = self.scope.get("query_string", b"").decode()
        qs = parse_qs(query_string)
        if "token" in qs:
            token = qs["token"][0]

        # 2) check headers
        if not token:
            headers = {k.decode(): v.decode() for k, v in self.scope.get("headers", [])}
            auth = headers.get("authorization") or headers.get("Authorization")
            if auth and auth.lower().startswith("bearer "):
                token = auth.split(" ", 1)[1]

        user = None
        if token:
            try:
                # Validate token using Simple JWT's UntypedToken (raises if invalid/expired)
                UntypedToken(token)
                alg = settings.SIMPLE_JWT.get("ALGORITHM", "HS256")
                key = settings.SIMPLE_JWT.get("SIGNING_KEY", None) or settings.SECRET_KEY
                decoded = jwt.decode(token, key, algorithms=[alg], options={"verify_aud": False})
                user_id = decoded.get("user_id") or decoded.get("user")
                if user_id:
                    user = await get_user(user_id)
            except Exception:
                user = None

        if user:
            self.scope["user"] = user
        else:
            self.scope["user"] = AnonymousUser()

        inner = self.inner(self.scope)
        return await inner(receive, send)


def JwtAuthMiddlewareStack(inner):
    """
    Helper that composes the JwtAuthMiddleware with the inner application.
    Use in asgi.py as: JwtAuthMiddlewareStack(URLRouter(...))
    """
    return JwtAuthMiddleware(inner)
