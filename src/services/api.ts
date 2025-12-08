// src/services/api.ts

import axios, { AxiosInstance } from 'axios';

class APIService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const response = await this.refreshAccessToken(refreshToken);
              localStorage.setItem('access_token', response.access);
              return this.instance(error.config);
            } catch {
              localStorage.clear();
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string, role: string) {
    return this.instance.post('/auth/login/', { email, password, role });
  }

  async createAdmin(data: {
    company_id: string;
    full_name: string;
    personal_email: string;
    phone?: string;
  }) {
    return this.instance.post('/auth/create-admin/', data);
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.instance.post('/auth/change-temp-password/', {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: newPassword,
    });
  }

  // Company endpoints
  async registerCompany(data: any) {
    return this.instance.post('/companies/register/', data);
  }

  async getDashboard() {
    return this.instance.get('/admin/dashboard/');
  }

  // Helper
  private async refreshAccessToken(refreshToken: string) {
    return this.instance.post('/token/refresh/', { refresh: refreshToken });
  }
}

export const api = new APIService();
