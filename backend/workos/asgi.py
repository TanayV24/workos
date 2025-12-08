# workos/asgi.py
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "workos.settings")

# get default Django ASGI app for HTTP
django_asgi_app = get_asgi_application()

# channels imports
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# import websocket_urlpatterns from the routing module you just created
import workos.routing

application = ProtocolTypeRouter({
    # http -> Django ASGI application (handles normal HTTP requests)
    "http": django_asgi_app,

    # websocket -> use AuthMiddlewareStack then router
    "websocket": AuthMiddlewareStack(
        URLRouter(
            workos.routing.websocket_urlpatterns
        )
    ),
})
