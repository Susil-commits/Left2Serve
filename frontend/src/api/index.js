// Build the API base. Accepts VITE_API_URL with or without a trailing "/api".
// e.g. "https://x.onrender.com" and "https://x.onrender.com/api" both resolve correctly.
function resolveApiBase() {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return '/api';
  const noSlash = raw.replace(/\/+$/, '');
  return noSlash.endsWith('/api') ? noSlash : `${noSlash}/api`;
}
const API_BASE = resolveApiBase();
export const API_BASE_URL = API_BASE.replace(/\/api$/, '');
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/admin/login'];

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options, headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined
  });
  const isAuthEndpoint = AUTH_ENDPOINTS.some((e) => endpoint.startsWith(e));
  if (res.status === 401 && token && !isAuthEndpoint) {
    localStorage.removeItem('token');
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    me: () => request('/auth/me'),
    impact: () => request('/auth/impact'),
    updateProfile: (body) => request('/auth/profile', { method: 'PUT', body }),
    changePassword: (body) => request('/auth/password', { method: 'PUT', body }),
    forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body }),
    resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),
  },
  listings: {
    getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/listings${qs ? `?${qs}` : ''}`); },
    getMine: () => request('/listings/mine'),
    getOne: (id) => request(`/listings/${id}`),
    getStats: () => request('/listings/stats'),
    getImpact: () => request('/listings/impact'),
    create: (body) => request('/listings', { method: 'POST', body }),
    update: (id, body) => request(`/listings/${id}`, { method: 'PUT', body }),
    delete: (id) => request(`/listings/${id}`, { method: 'DELETE' }),
    close: (id) => request(`/listings/${id}/close`, { method: 'POST' }),
    upload: (formData) => request('/listings/upload', { method: 'POST', body: formData }),
  },
  reservations: {
    create: (body) => request('/reservations', { method: 'POST', body }),
    getMine: () => request('/reservations'),
    getForListing: (listingId) => request(`/reservations/listing/${listingId}`),
    update: (id, body) => request(`/reservations/${id}`, { method: 'PATCH', body }),
    getQrToken: (id) => request(`/reservations/${id}/qr-token`),
    verifyQr: (body) => request('/reservations/verify-qr', { method: 'POST', body }),
  },
  chat: {
    getHistory: (reservationId) => request(`/chat/${reservationId}`),
  },
  payments: {
    config: () => request('/payments/config', { method: 'POST' }),
    createOrder: (body) => request('/payments/create-order', { method: 'POST', body }),
    verify: (body) => request('/payments/verify', { method: 'POST', body }),
  },
  reviews: {
    create: (body) => request('/reviews', { method: 'POST', body }),
    forReservation: (id) => request(`/reviews/reservation/${id}`),
    forUser: (userId) => request(`/reviews/user/${userId}`),
  },
  notifications: {
    list: () => request('/notifications'),
    unreadCount: () => request('/notifications/unread-count'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
    remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },
  watchlists: {
    getAll: () => request('/watchlists'),
    create: (body) => request('/watchlists', { method: 'POST', body }),
    delete: (id) => request(`/watchlists/${id}`, { method: 'DELETE' }),
  },
  forum: {
    getCategories: () => request('/forum/categories'),
    getCategoryPosts: (id) => request(`/forum/categories/${id}/posts`),
    createPost: (id, body) => request(`/forum/categories/${id}/posts`, { method: 'POST', body }),
    getPost: (id) => request(`/forum/posts/${id}`),
    updatePost: (id, body) => request(`/forum/posts/${id}`, { method: 'PUT', body }),
    deletePost: (id) => request(`/forum/posts/${id}`, { method: 'DELETE' }),
    createReply: (id, body) => request(`/forum/posts/${id}/replies`, { method: 'POST', body }),
    updateReply: (id, body) => request(`/forum/replies/${id}`, { method: 'PUT', body }),
    deleteReply: (id) => request(`/forum/replies/${id}`, { method: 'DELETE' }),
  },
  admin: {
    login: (body) => request('/admin/login', { method: 'POST', body }),
    stats: () => request('/admin/stats'),
    users: () => request('/admin/users'),
    ngos: () => request('/admin/ngos'),
    orders: () => request('/admin/orders'),
    listings: () => request('/admin/listings'),
    deleteListing: (id) => request(`/admin/listings/${id}`, { method: 'DELETE' }),
    trends: (days = 14) => request(`/admin/trends?days=${days}`),
    auditLog: (limit = 50) => request(`/admin/audit-log?limit=${limit}`),
    updateOrder: (id, body) => request(`/admin/orders/${id}`, { method: 'PATCH', body }),
    updateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body }),
    resetUserPassword: (id, body) => request(`/admin/users/${id}/password`, { method: 'PATCH', body }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  }
};