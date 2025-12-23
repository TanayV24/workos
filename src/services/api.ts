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
Auth & user helpers - UNIFIED
--------------------------- */
export const authRest = {
  // ✅ UNIFIED LOGIN ENDPOINT FOR ALL USERS (Admin + HR/Manager/Employee)
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

  // ✅ UNIFIED CHANGE TEMP PASSWORD ENDPOINT FOR ALL USERS
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

  // Company setup (Admin only)
  async companySetup(payload: any) {
  console.log('📤 Original payload:', payload);
  
  // Determine scenario based on payload
  let backendPayload: any = {
    companyname: payload.companyname,
    companywebsite: payload.companywebsite,
    companyindustry: payload.companyindustry,
    timezone: payload.timezone,
    currency: payload.currency,
    totalemployees: payload.totalemployees,
    work_type: payload.work_type,
    break_minutes: payload.break_minutes,
    casualleavedays: payload.casualleavedays,
    sickleavedays: payload.sickleavedays,
    personalleavedays: payload.personalleavedays,
  };

  if (payload.work_type === 'fixed_hours') {
  console.log('📋 Scenario 1: Standard Office Hours');
  backendPayload = {
    ...backendPayload,  // ✅ Spread existing fields
    workinghoursstart: payload.workinghoursstart,
    workinghoursend: payload.workinghoursend,
    };
  }
  // SCENARIO 2 & 3: Shift-Based
else if (payload.work_type === 'shift_based') {
  // Check if shifts have actual data (name + times) - Scenario 3
  const hasDetailedShifts = payload.shifts && 
    payload.shifts.length > 0 && 
    payload.shifts.some((shift: any) => shift.name && shift.startTime && shift.endTime);  // ✅ FIX

  if (hasDetailedShifts) {
    console.log('📋 Scenario 3: Detailed Schedule Shifts');
    backendPayload = {
      ...backendPayload,
      shifts: payload.shifts.map((shift: any) => ({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        requiredHours: shift.requiredHours,
        description: shift.description,
        is_default: shift.is_default || false,
      })),
    };
  } else {
    // Scenario 2: Only shift duration
    console.log('📋 Scenario 2: Shift-Based Flexible Hours');
    backendPayload = {
      ...backendPayload,
      shift_duration_minutes: payload.shift_duration_minutes,
    };
  }
}

  console.log('📤 Sending to backend:', backendPayload);

  const res = await fetch(`${API}/api/auth/company_setup/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(backendPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('❌ Backend error:', err);
    throw new Error(err.error || "Company setup failed");
  }

  const result = await res.json();
  console.log('✅ Company setup successful:', result);
  return result;
},

  // ✅ ADD HR MANAGER
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

  // ✅ ADD MANAGER
  async addManager(name: string, email: string, role: string) {
    const res = await fetch(`${API}/api/auth/add_manager/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ name, email, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to add manager");
    }
    return res.json();
  },

  // ✅ CREATE SHIFTS
  async createShifts(companyId: string, shiftsData: any) {
    const res = await fetch(`${API}/api/shifts/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        company_id: companyId,
        shifts: shiftsData,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create shifts");
    }
    return res.json();
  },

  // ✅ GET COMPANY SHIFTS
  async getCompanyShifts(companyId: string) {
    const res = await fetch(`${API}/api/shifts/list/?company_id=${companyId}`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch shifts");
    }
    return res.json();
  },

  // Logout
  async logout() {
    const res = await fetch(`${API}/api/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    });
    if (!res.ok) {
      return;
    }
    return res.json();
  },
};

/* ---------------------------
Users helpers
--------------------------- */
export const usersRest = {
  // ✅ COMPLETE PROFILE ENDPOINT
  async completeProfile(data: {
    full_name?: string;
    phone?: string;
    designation?: string;
    department?: string;
    gender?: string;
    date_of_birth?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    marital_status?: string;
    bio?: string;
  }) {
    const res = await fetch(`${API}/api/users/complete_profile/`, {
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

  // List HR Users
  async listHR() {
    const res = await fetch(`${API}/api/users/company_hrs/`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch HR users");
    }
    return res.json();
  },
};

/* ---------------------------
✅ Department Management (FIXED WITH ERROR HANDLING)
--------------------------- */
export const departmentRest = {
  async addDepartment(data: {
    name: string;
    code: string;
    description: string;
  }) {
    try {
      console.log("📤 Sending department data:", data);
      const res = await fetch(`${API}/api/users/add_department/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: data.name.trim(),
          code: data.code.trim().toUpperCase(),
          description: data.description.trim(),
        }),
      });

      const result = await res.json();
      console.log("📨 Response:", result);

      if (!res.ok) {
        return {
          success: false,
          error: result.error || "Failed to add department",
          errors: result.errors,
        };
      }

      return {
        success: result.success !== false,
        data: result.data || result,
        error: result.error,
      };
    } catch (error: any) {
      console.error("❌ Exception:", error);
      return {
        success: false,
        error: error.message || "Failed to add department",
      };
    }
  },

  async listDepartments() {
    try {
      console.log("📥 Fetching departments...");
      const res = await fetch(`${API}/api/users/list_departments/`, {
        method: "GET",
        headers: {
          ...authHeaders(),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          data: [],
          error: err.error || "Failed to fetch departments",
        };
      }

      const result = await res.json();
      console.log("✅ Departments fetched:", result);

      return {
        success: result.success !== false,
        data: result.data || result,
        error: result.error,
      };
    } catch (error: any) {
      console.error("❌ Exception:", error);
      return {
        success: false,
        data: [],
        error: error.message || "Failed to fetch departments",
      };
    }
  },
};

/* ---------------------------
✅ Employee Management (FIXED WITH ERROR HANDLING)
--------------------------- */
export const userRest = {
  async addEmployee(data: {
    name: string;
    email: string;
    phone?: string;
    role?: 'employee' | 'team_lead';
    department?: string;
    designation?: string;
  }) {
    try {
      console.log('📤 Sending employee data:', data);

      const res = await fetch(`${API}/api/users/add_employee/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.phone?.trim() || '',  // ← FIXED: Accept phone
          role: data.role || 'employee',     // ← FIXED: Use new role values
          department: data.department || '', // ← FIXED: Use department NAME, not ID
          designation: data.designation || '',
        }),
      });

      const result = await res.json();
      console.log('📨 Response:', result);

      if (!res.ok) {
        return {
          success: false,
          error: result.error || 'Failed to add employee',
          errors: result.errors,
        };
      }

      return {
        success: result.success !== false,
        data: result.data || result,
        error: result.error,
      };
    } catch (error: any) {
      console.error('❌ Exception:', error);
      return {
        success: false,
        error: error.message || 'Failed to add employee',
      };
    }
  },

  async listEmployees() {
    try {
      const res = await fetch(`${API}/api/users/list_employees/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
      });

      const result = await res.json();
      console.log("📨 Employees list response:", result);

      if (!res.ok) {
        return {
          success: false,
          data: [],
          error: result.error || "Failed to fetch employees",
        };
      }

      return {
        success: result.success !== false,
        data: result.data || result,
        error: result.error,
      };
    } catch (error: any) {
      console.error("❌ Error fetching employees:", error);
      return {
        success: false,
        data: [],
        error: error.message || "Failed to fetch employees",
      };
    }
  },

  async deleteEmployee(employeeId: string) {
    try {
        console.log('🗑️ Deleting employee:', employeeId);
        
        const res = await fetch(`${API}/api/users/delete_employee/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
            },
            body: JSON.stringify({
                employee_id: employeeId,
            }),
        });
        
        const result = await res.json();
        console.log('📨 Delete Response:', result);
        
        if (!res.ok) {
            return {
                success: false,
                error: result.error || 'Failed to delete employee',
            };
        }
        
        return {
            success: result.success !== false,
            data: result.data || result,
            error: result.error,
        };
    } catch (error: any) {
        console.error('❌ Exception:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete employee',
        };
    }
  },
};
/* --------------------------- 
✅ NOTIFICATIONS API (NEW)
--------------------------- */
export const notificationRest = {
  async getNotifications(page = 1, pageSize = 20) {
    const res = await fetch(`${API}/api/notifications/?page=${page}&page_size=${pageSize}`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch notifications");
    }
    return res.json();
  },

  async getUnreadNotifications() {
    const res = await fetch(`${API}/api/notifications/unread/`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch unread notifications");
    return res.json();
  },

  async getUnreadCount() {
    const res = await fetch(`${API}/api/notifications/unread_count/`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch unread count");
    const data = await res.json();
    return data.unread_count;
  },

  async markNotificationAsRead(notificationId: string) {
    const res = await fetch(`${API}/api/notifications/${notificationId}/mark-read/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to mark as read");
    }
    return res.json();
  },

  async markAllNotificationsAsRead() {
    const res = await fetch(`${API}/api/notifications/mark-all-read/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
    if (!res.ok) throw new Error("Failed to mark all as read");
    return res.json();
  },

  async deleteNotification(notificationId: string) {
    const res = await fetch(`${API}/api/notifications/${notificationId}/`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error("Failed to delete notification");
    return { success: true };
  },
};

/* --------------------------- 
✅ TASK INTEGRATION API (NEW) 
--------------------------- */
export const taskRest = {
  async getTaskSettings() {
    const res = await fetch(`${API}/api/tasks/settings/get/`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch task settings");
    }
    return res.json();
  },

  async updateTaskSettings(settings: any) {
    const res = await fetch(`${API}/api/tasks/settings/update/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update task settings");
    }
    return res.json();
  },

  async getTasks() {
    const res = await fetch(`${API}/api/tasks/`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
  },
};


export default {
  authRest,
  usersRest,
  chatRest,
  departmentRest,
  userRest,
  notificationRest,  // ✅ ADD THIS
  taskRest,  
};
