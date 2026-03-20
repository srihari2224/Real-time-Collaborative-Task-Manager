import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('taskflow-auth') || '{}');
      if (stored?.state?.token) {
        config.headers.Authorization = `Bearer ${stored.state.token}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('taskflow-auth');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
