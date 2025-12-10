export interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
}

export interface Room {
  id: string;
  room_type: string;
  team?: string;
  name: string;
  created_by?: string;
  created_at: string;
}

export interface Message {
  id: string;
  room: string;
  sender?: User | null;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}
