import type { Room, Message } from '../types/chat';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthToken(): string | null {
  // Check all possible token locations
  const token = 
    localStorage.getItem('access_token') || 
    localStorage.getItem('access') || 
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    sessionStorage.getItem('access') ||
    sessionStorage.getItem('token');
  
  if (token) {
    console.log('✅ Token found:', token.substring(0, 20) + '...');
  } else {
    console.warn('❌ No token found in storage!');
  }
  
  return token;
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('⚠️ WARNING: No token for Authorization header!');
  }

  return headers;
}

export const chatRest = {
  async getRooms(): Promise<Room[]> {
    try {
      const url = `${API}/api/chat/rooms/`;
      const headers = authHeaders();
      
      console.log('📡 Fetching rooms from:', url);
      console.log('📦 Headers:', Object.keys(headers));
      
      const res = await fetch(url, {
        method: 'GET',
        headers: headers,
        credentials: 'include', // Send cookies if needed
      });

      console.log('📬 Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error response:', res.status, errorText);
        throw new Error(`API Error ${res.status}: ${errorText.substring(0, 100)}`);
      }

      const data = await res.json();
      console.log('✅ Rooms fetched:', data);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('❌ getRooms error:', err);
      throw err;
    }
  },

  async getMessages(roomId: string, limit = 50, before?: string): Promise<Message[]> {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (before) params.set('before', before);

      const url = `${API}/api/chat/rooms/${roomId}/messages/?${params.toString()}`;
      console.log('📡 Fetching messages from:', url);

      const res = await fetch(url, {
        method: 'GET',
        headers: authHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch messages: ${res.status}`);
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('❌ getMessages error:', err);
      throw err;
    }
  },

  async postMessage(roomId: string, content: string, metadata = {}): Promise<Message> {
    try {
      const url = `${API}/api/chat/rooms/${roomId}/messages/post/`;
      console.log('📡 Posting message to:', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ content, metadata }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to post message: ${res.status}`);
      }

      return res.json();
    } catch (err) {
      console.error('❌ postMessage error:', err);
      throw err;
    }
  },
};
