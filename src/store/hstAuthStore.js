import { create } from 'zustand';
import hstApi from '../api/hstAxios';

export const useHstAuthStore = create((set) => ({
  user: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await hstApi.post('/auth/login', { email, password });
      // 2FA step: server returns {requires2FA, userId} — no user yet
      if (data.requires2FA) {
        set({ loading: false });
        return { requires2FA: true, userId: data.userId };
      }
      set({ user: data.user, loading: false });
      return data.user;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    await hstApi.post('/auth/logout');
    set({ user: null });
    window.location.href = '/login';
  },

  fetchMe: async () => {
    try {
      const { data } = await hstApi.get('/auth/me');
      set({ user: data.user });
      return data.user;
    } catch {
      set({ user: null });
      return null;
    }
  },

  setUser: (user) => set({ user }),
}));
