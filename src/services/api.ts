// workos/src/services/api.ts
import type { Room, Message } from "@/types/chat";

// Use backend URL from environment or default
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * authHeaders()
 * - Prefer the new key 'access_token' stored by AuthContext.
 * - Fallback to legacy 'token' if present (keeps backwards compatibility).
 * - Returns an object suitable for fetch headers: { Authorization: 'Bearer ...' }
 */
function authHeaders() {
  // primary key used by AuthContext
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) {
    return { Authorization: `Bearer ${accessToken}` };
  }

  // fallback for older builds that used "token"
  const legacyToken = localStorage.getItem("token");
  if (legacyToken) {
    return { Authorization: `Bearer ${legacyToken}` };
  }

  return {};
}

/* ---------------------------
   Chat API helpers
   --------------------------- */
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

  async getRoomMessages(roomId: string): Promise<Message[]> {
    const res = await fetch(`${API}/api/chat/rooms/${roomId}/messages/`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch messages");
    }
    return res.json();
  },

  async postMessage(roomId: string, content: string) {
    const res = await fetch(`${API}/api/chat/rooms/${roomId}/messages/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to post message");
    }
    return res.json();
  },
};

/* ---------------------------
   Auth & user helpers
   --------------------------- */
export const authRest = {
  // Company Admin Login
  async login(email: string, password: string) {
    const res = await fetch(`${API}/api/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }

    return res.json();
  },

  // Change temporary password
  async changeTempPassword(oldPassword: string, newPassword: string) {
    const res = await fetch(`${API}/api/auth/change_temp_password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to change password");
    }

    return res.json();
  },

  // Company setup
  async companySetup(payload: any) {
    const res = await fetch(`${API}/api/auth/company_setup/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Company setup failed");
    }

    return res.json();
  },

  // Complete Profile (HR/Manager/Employee)
  async completeProfile(data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    // add other fields as needed
  }) {
    const res = await fetch(`${API}/api/auth/complete_profile/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to complete profile");
    }

    return res.json();
  },

  // ✅ ADD HR MANAGER
  // Uses authHeaders() for token retrieval (access_token preferred)
  async addHR(name: string, email: string) {
    const res = await fetch(`${API}/api/auth/add_hr/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ name, email }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to add HR");
    }

    return res.json();
  },

  // Example: logout on backend if you have an endpoint
  async logout() {
    const res = await fetch(`${API}/api/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    });
    if (!res.ok) {
      // ignore errors in logout for now
      return;
    }
    return res.json();
  },

  // other auth related helpers as needed...
};

/* ---------------------------
   Users helpers (company HR listing)
   --------------------------- */
export const usersRest = {
  // List HR Users (company)
  async listHR() {
    const res = await fetch(`${API}/api/users/company_hrs/`, {
      headers: { ...authHeaders() },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch HR users");
    }

    return res.json();
  },

  // Add additional users functions here...
};

export default {
  authRest,
  usersRest,
  chatRest,
};
