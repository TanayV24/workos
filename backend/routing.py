from django.urls import re_path
from whiteboard.consumers import WhiteboardConsumer
from chat.consumers import ChatConsumer

websocket_urlpatterns = [
    re_path(r"ws/whiteboard/(?P<room_id>\d+)/?$", WhiteboardConsumer.as_asgi()),
    re_path(r"ws/chat/(?P<room_id>[-0-9a-fA-F]+)/?$", ChatConsumer.as_asgi()),
]
