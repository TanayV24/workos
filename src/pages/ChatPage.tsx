// src/pages/ChatPage.tsx
import React, { useEffect, useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import ChatWindow from "@/components/Chat/ChatWindow";
import { Loader2 } from "lucide-react";

const ChatPage: React.FC = () => {
  const { fetchRooms, rooms, loading, error } = useChat();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initChat = async () => {
      try {
        await fetchRooms();
      } catch (err) {
        console.error("Failed to initialize chat:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initChat();
  }, []);

  if (isInitializing || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        Error: {error}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No chat rooms available.
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <ChatWindow />
    </div>
  );
};

export default ChatPage;
