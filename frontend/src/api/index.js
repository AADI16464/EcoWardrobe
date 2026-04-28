import axios from 'axios';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getToken = () => localStorage.getItem('token') || '';

export const getUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getUserId = () => getUser()?.user_id || null;

export const isLoggedIn = () => !!getToken() && !!getUserId();

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Attach JWT token to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized — redirecting to login');
      logout();
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const apiSignup = (data) =>
  axios.post('/api/auth/signup', data, {
    headers: { 'Content-Type': 'application/json' },
  });

export const apiLogin = (data) =>
  axios.post('/api/auth/login', data, {
    headers: { 'Content-Type': 'application/json' },
  });

// ─── Items ───────────────────────────────────────────────────────────────────

export const getItems = (params = {}) => api.get('/items', { params });
export const getItem  = (id)          => api.get(`/items/${id}`);

export const getUserItems = (user_id = getUserId()) =>
  api.get(`/items/user/${user_id}`);

export const buyItem = (item_id) =>
  api.post('/buy-item', { item_id });

// ─── Upload ──────────────────────────────────────────────────────────────────

export const uploadItem = (formData) =>
  api.post('/upload-item', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const uploadItems = (formData) =>
  api.post('/upload-items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const tryOn = (formData) => 
  api.post('/tryon', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob', // Because the response is an image
  });


// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getDashboardSummary = () => api.get('/dashboard/summary');
export const getDashboardItems   = ()  => api.get('/dashboard/items');
export const getOrders           = ()  => api.get('/dashboard/orders');
export const getImpact           = ()  => api.get('/dashboard/impact');
export const getPassport = (item_id)   => api.get(`/dashboard/passport/${item_id}`);
export const getCertificates     = ()  => api.get('/dashboard/certificates');

// ─── Platform stats ──────────────────────────────────────────────────────────

export const getStats = () => api.get('/stats');

export default api;
