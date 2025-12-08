from django.db import models
from django.conf import settings

class Whiteboard(models.Model):
    title = models.CharField(max_length=255, default="Untitled board")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="whiteboards")
    canvas_json = models.JSONField(default=dict, blank=True)  # stores shapes, notes, meta
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.owner})"
