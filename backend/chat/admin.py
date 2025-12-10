from django.contrib import admin
from .models import Team, TeamMembership, ChatRoom, Message

admin.site.register(Team)
admin.site.register(TeamMembership)
admin.site.register(ChatRoom)
admin.site.register(Message)
