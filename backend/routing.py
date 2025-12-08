# workos/routing.py
from django.urls import re_path
from whiteboard.consumers import WhiteboardConsumer

websocket_urlpatterns = [
    # ws://<host>/ws/whiteboard/<board_id>/
    re_path(r"ws/whiteboard/(?P<board_id>\d+)/?$", WhiteboardConsumer.as_asgi()),
]
