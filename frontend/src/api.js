import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
});

// We no longer inject localStorage token here since it's handled automatically by HttpOnly cookies
api.interceptors.request.use((config) => {
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
