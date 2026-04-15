import { create } from 'zustand';
import { auth as authApi } from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('vault_user') || 'null'),
  token: localStorage.getItem('vault_token') || null,
  isAuthenticated: !!localStorage.getItem('vault_token'),
  isLoading: false,

  login: async (username, password, totp_code) => {
    set({ isLoading: true });
    try {
      const payload = { username, password };
      if (totp_code) payload.totp_code = totp_code;
      const data = await authApi.login(payload);
      localStorage.setItem('vault_token', data.token);
      localStorage.setItem('vault_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const user = await authApi.me();
      localStorage.setItem('vault_user', JSON.stringify(user));
      set({ user });
    } catch {
      get().logout();
    }
  },

  isAdmin: () => get().user?.role === 'admin',
  isManager: () => ['admin', 'manager'].includes(get().user?.role),
}));

export default useAuthStore;
