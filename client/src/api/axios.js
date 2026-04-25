import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401 + auto-refresh
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (error.response.data?.code === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          }).then(token => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          });
        }
        original._retry = true;
        isRefreshing = true;
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
          const newToken = res.data.data.accessToken;
          localStorage.setItem('accessToken', newToken);
          refreshQueue.forEach(p => p.resolve(newToken));
          refreshQueue = [];
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          refreshQueue.forEach(p => p.reject());
          refreshQueue = [];
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        } finally {
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
