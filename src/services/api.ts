import type { Room, Message } from "@/types/chat";

// Use backend URL from environment or default
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

// ============================================
// AUTH & COMPANY SETUP ENDPOINTS
// ============================================

export const authRest = {
  // Company Admin Login
  async login(email: string, password: string) {
    const res = await fetch(`${API}/api/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }

    return res.json();
  },

  // Change Temporary Password (Company Admin)
  async changePassword(oldPassword: string, newPassword: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/auth/change_temp_password/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to change password');
    }

    return res.json();
  },

  // Complete Company Setup
  async companySetup(data: {
    company_name: string;
    company_website?: string;
    company_industry?: string;
    timezone?: string;
    currency?: string;
    total_employees?: number;
    working_hours_start: string;
    working_hours_end: string;
    casual_leave_days: number;
    sick_leave_days: number;
    personal_leave_days: number;
  }) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/auth/company_setup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Company setup failed');
    }

    return res.json();
  },

  // ✅ ADD HR MANAGER (MOVED HERE FROM usersRest)
  async addHR(name: string, email: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/auth/add_hr/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, email }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add HR');
    }

    return res.json();
  },
};

// ============================================
// USER/HR ENDPOINTS
// ============================================

export const usersRest = {
  // User Login (HR/Manager/Employee)
  async login(email: string, password: string) {
    const res = await fetch(`${API}/api/users/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }

    return res.json();
  },

  // Change Password (HR/Manager/Employee)
  async changePassword(oldPassword: string, newPassword: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/users/change_password/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to change password');
    }

    return res.json();
  },

  // Complete Profile (HR/Manager/Employee)
  async completeProfile(data: {
    full_name: string;
    phone?: string;
    department: string;
    designation?: string;
  }) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/users/profile/complete/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to complete profile');
    }

    return res.json();
  },

  // List HR Users
  async listHR() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/users/company_hrs/`, {
      headers: { ...authHeaders() },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch HR users');
    }

    return res.json();
  },
};
