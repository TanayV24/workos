from django.urls import path
from . import views

urlpatterns = [
    path('rooms/', views.rooms_list, name='chat-rooms'),
    path('rooms/<uuid:room_id>/messages/', views.room_messages, name='chat-room-messages'),
    path('rooms/<uuid:room_id>/messages/post/', views.post_message, name='chat-post-message'),
]
