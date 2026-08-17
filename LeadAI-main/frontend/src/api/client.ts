import axios from 'axios';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000/api';
  }
  return '/api';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Attach Bearer token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('leadai_token') || localStorage.getItem('token');
      if (token && token !== 'internal_admin_token') {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Detailed Error Extraction & Global 401 Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('leadai_token');
        localStorage.removeItem('token');
        localStorage.removeItem('leadai_user');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'leadai_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        window.location.href = '/login';
      }
    }

    let message = 'An unexpected error occurred';
    if (!error.response) {
      message = 'Cannot connect to server. Please ensure the backend REST API is running.';
    } else if (error.response.data?.detail) {
      message = error.response.data.detail;
    } else if (error.response.data?.message) {
      message = error.response.data.message;
    } else if (error.response.status === 401) {
      message = 'Invalid email or password.';
    } else if (error.response.status === 422) {
      message = 'Validation error. Please verify your inputs.';
    } else {
      message = `Server error (${error.response.status}).`;
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
