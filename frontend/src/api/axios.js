import axios from 'axios';

const buildTimeApiUrl = import.meta.env.VITE_API_URL;

const resolveBaseUrl = () => {
  // Prefer explicit build-time env var
  if (buildTimeApiUrl && buildTimeApiUrl !== '') return buildTimeApiUrl;
  // Fallback to runtime origin (when frontend served from same host as backend)
  if (typeof window !== 'undefined' && window.location && window.location.origin) return `${window.location.origin}/api`;
  // Final fallback for local development
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cartrescue_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
