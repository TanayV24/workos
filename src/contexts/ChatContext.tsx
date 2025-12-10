import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { chatRest } from '../services/chat.service';
import { ChatSocket } from '../lib/ws';
import type { Room, Message, User } from '../types/chat';

type ChatContextValue = {
  rooms: Room[];
  fetchRooms: () => Promise<void>;
  currentRoom?: Room | null;
  selectRoom: (room: Room | null) => Promise<void>;
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  user?: User | null;
  loading: boolean;
  error?: string;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};

export const ChatProvider: React.FC<{ user?: User | null; children: React.ReactNode }> = ({ user, children }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<ChatSocket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    return () => { socket?.disconnect(); };
  }, [socket]);

  async function fetchRooms() {
    try {
      setLoading(true);
      setError(undefined);
      console.log('🔄 Fetching rooms...');
      const r = await chatRest.getRooms();
      console.log('✅ Rooms loaded:', r);
      setRooms(r);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch rooms';
      console.error('❌ Error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function selectRoom(room: Room | null) {
    try {
      socket?.disconnect();
      setMessages([]);
      setCurrentRoom(room);
      setError(undefined);

      if (!room) {
        setSocket(null);
        return;
      }

      const msgs = await chatRest.getMessages(room.id, 50);
      setMessages(msgs);

      const s = new ChatSocket(room.id);
      s.on('new_message', (payload: any) => {
        setMessages((m) => [...m, payload]);
      });
      s.on('user_joined', (payload) => { /* optional presence */ });
      s.connect();
      setSocket(s);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to select room';
      setError(errorMsg);
    }
  }

  async function sendMessage(content: string) {
    if (!currentRoom) throw new Error('No room selected');

    const tmp: Message = {
      id: `tmp-${Date.now()}`,
      room: currentRoom.id,
      sender: user ?? null,
      content,
      metadata: {},
      created_at: new Date().toISOString()
    };

    setMessages((m) => [...m, tmp]);

    try {
      if (socket) {
        socket.send({ action: 'send_message', payload: { room_id: currentRoom.id, content } });
      } else {
        await chatRest.postMessage(currentRoom.id, content);
      }
    } catch (err) {
      console.error('send error', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }

  const val = useMemo(() => ({
    rooms, fetchRooms, currentRoom, selectRoom, messages, sendMessage, user, loading, error
  }), [rooms, currentRoom, messages, socket, user, loading, error]);

  return <ChatContext.Provider value={val}>{children}</ChatContext.Provider>;
};
