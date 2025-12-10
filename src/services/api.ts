import type { Room, Message } from "@/types/chat";

const API = import.meta.env.VITE_API_URL || "";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const chatRest = {
  async getRooms(): Promise<Room[]> {
    const res = await fetch(`${API}/api/chat/rooms/`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch rooms");
    }
    return res.json();
  },

  async getMessages(
    roomId: string,
    limit = 50,
    before?: string
  ): Promise<Message[]> {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (before) params.set("before", before);

    const res = await fetch(
      `${API}/api/chat/rooms/${roomId}/messages/?${params.toString()}`,
      {
        headers: { ...authHeaders() },
      }
    );
    if (!res.ok) {
      throw new Error("Failed to fetch messages");
    }
    return res.json();
  },

  async postMessage(roomId: string, content: string, metadata: object = {}) {
    const res = await fetch(
      `${API}/api/chat/rooms/${roomId}/messages/post/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ content, metadata }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to post message");
    }

    return res.json();
  },
};
