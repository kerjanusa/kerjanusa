import axios from 'axios';
import { getLoginRouteForRole } from './routeHelpers.js';
import { resolvedApiUrl } from './mockMode.js';

const API_BASE_URL = resolvedApiUrl || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      let userRole = null;

      try {
        userRole = JSON.parse(localStorage.getItem('user') || 'null')?.role || null;
      } catch {
        userRole = null;
      }

      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.replace(getLoginRouteForRole(userRole));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
