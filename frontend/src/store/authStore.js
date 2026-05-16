import { create } from 'zustand';
import client from '../api/client';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await client.post('/auth/login', { email, password });
      const { access_token } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify({ email }));

      set({
        token: access_token,
        user: { email },
        isLoading: false,
      });
      return true;
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await client.post('/auth/register', { email, password });
      return true;
    } catch (err) {
      const message = err.response?.data?.detail || 'Registration failed';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  isAuthenticated: () => !!localStorage.getItem('token'),
}));
