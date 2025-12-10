// src/components/Chat/ChatWindow.tsx
import React, { useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const ChatWindow: React.FC = () => {
  const { rooms, currentRoom, selectRoom, messages, sendMessage } = useChat();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !currentRoom) return;

    try {
      setIsSending(true);
      await sendMessage(trimmed);
      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (!currentRoom) {
    return (
      <div className="flex h-full gap-4">
        {/* Room List */}
        <div className="w-64 border-r bg-card rounded-lg overflow-y-auto">
          <div className="p-4 border-b font-semibold text-sm">Rooms</div>
          {rooms && rooms.length > 0 ? (
            <div className="space-y-1 p-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => selectRoom(room)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  {room.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-xs text-muted-foreground">
              No rooms available
            </div>
          )}
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a room to start chatting
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Room List */}
      <div className="w-64 border-r bg-card rounded-lg overflow-y-auto">
        <div className="p-4 border-b font-semibold text-sm">Rooms</div>
        {rooms && rooms.length > 0 ? (
          <div className="space-y-1 p-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => selectRoom(room)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  currentRoom?.id === room.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col rounded-lg border bg-card">
        {/* Header */}
        <div className="border-b px-4 py-3 text-sm font-semibold bg-muted/50">
          {currentRoom.name}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages && messages.length > 0 ? (
            messages.map((m) => (
              <div key={m.id} className="text-sm">
                <div className="font-semibold text-xs text-primary">
                  {m.sender?.username ?? "Unknown"}
                </div>
                <div className="text-foreground mt-1">{m.content}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(m.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground text-sm">
              No messages yet
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-3 bg-muted/30">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isSending) {
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              disabled={isSending}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!text.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
