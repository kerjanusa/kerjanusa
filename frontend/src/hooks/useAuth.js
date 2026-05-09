import { create } from 'zustand';
import AuthService from '../services/authService';

const getErrorMessage = (error, fallback) =>
  typeof error === 'string' ? error : error?.message || fallback;

const useAuthStore = create((set) => ({
  user: AuthService.getStoredUser(),
  token: AuthService.getToken(),
  isLoading: false,
  error: null,

  // Login action
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await AuthService.login(email, password);
      set({
        user: data.user,
        token: data.token,
        isLoading: false,
      });
      return data;
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Login failed'),
        isLoading: false,
      });
      throw error;
    }
  },

  // Register action
  register: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await AuthService.register(formData);
      set({
        user: data.user,
        token: data.token,
        isLoading: false,
      });
      return data;
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Registration failed'),
        isLoading: false,
      });
      throw error;
    }
  },

  // Logout action
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.logout();
      set({
        user: null,
        token: null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Logout failed'),
        isLoading: false,
      });
    }
  },

  // Update profile action
  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.updateProfile(data);
      set({
        user: response.user,
        isLoading: false,
      });
      return response;
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Update failed'),
        isLoading: false,
      });
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const user = await AuthService.getCurrentUser();
      set({
        user,
        isLoading: false,
      });
      return user;
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Failed to fetch user'),
        isLoading: false,
      });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Check if authenticated
  isAuthenticated: () => !!AuthService.getToken(),
}));

export default useAuthStore;
