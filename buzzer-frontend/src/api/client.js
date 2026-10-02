import axios from 'axios';
import { getToken, removeToken } from '../utils/token';

// Flask backend URL — development-এ localhost, production-এ Render URL
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Request Interceptor — প্রতিটি request-এ JWT token যোগ করে
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor — 401 হলে logout করে
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 1. Maintenance Mode (503)
    if (error.response?.status === 503 && error.response?.data?.error === 'maintenance_mode') {
      if (window.location.pathname !== '/maintenance') {
        window.location.href = '/maintenance';
      }
      return Promise.reject(error.response?.data);
    }
    
    // 2. Suspended Account (403 or specific 401)
    const errorMsg = (error.response?.data?.message || '').toLowerCase();
    if (
      (error.response?.status === 403 && errorMsg.includes('suspended')) ||
      (error.response?.status === 401 && errorMsg.includes('suspended'))
    ) {
      removeToken(); localStorage.clear();
      if (window.location.pathname !== '/suspended') {
        window.location.href = '/suspended';
      }
      return Promise.reject(error.response?.data);
    }

    // 3. Normal Unauthorized (401)
    if (error.response?.status === 401) {
      removeToken(); localStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || { error: 'Network error' });
  }
);

export default api;
