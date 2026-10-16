import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Attach JWT token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('labellens_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem('labellens_token');
        localStorage.removeItem('labellens_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
