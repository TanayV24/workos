# whiteboard/consumers.py
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class WhiteboardConsumer(AsyncJsonWebsocketConsumer):
    """
    Simple broadcast consumer:
      - Clients join group "whiteboard_<board_id>"
      - Clients send JSON messages {action: "...", payload: {...}}
      - Server rebroadcasts to group so all connected clients receive updates
    You can extend with auth checks, rate limiting, and persistence hooks.
    """
    async def connect(self):
        # expected URL: ws/whiteboard/<board_id>/
        self.board_id = self.scope["url_route"]["kwargs"].get("board_id")
        self.group_name = f"whiteboard_{self.board_id}"
        # Optional: you can check user auth in scope["user"] here
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming JSON from a client and broadcast to group.
        content should be: {"action":"update_canvas","payload":{...}}
        """
        action = content.get("action")
        payload = content.get("payload")
        # You might validate content here or persist to DB
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "board.message",
                "action": action,
                "payload": payload,
                "sender_channel": self.channel_name,
            }
        )

    async def board_message(self, event):
        """
        Handler for messages sent to the group.
        We forward to WebSocket clients. We attach 'action' and 'payload'.
        """
        # Optionally avoid echoing back to sender (if you want)
        # if event.get("sender_channel") == self.channel_name:
        #     return
        await self.send_json({
            "action": event.get("action"),
            "payload": event.get("payload"),
        })
