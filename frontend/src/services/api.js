import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getProfile: () => api.get('/api/auth/profile'),
  updateShopifyCredentials: (data) => api.put('/api/auth/shopify-credentials', data),
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/api/analytics/overview'),
  getRevenueTrends: (params) => api.get('/api/analytics/revenue-trends', { params }),
  getTopCustomers: (params) => api.get('/api/analytics/top-customers', { params }),
  getOrdersAnalytics: (params) => api.get('/api/analytics/orders', { params }),
  getProductPerformance: (params) => api.get('/api/analytics/products', { params }),
};

// Tenant API
export const tenantAPI = {
  getTenant: () => api.get('/api/tenant'),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;