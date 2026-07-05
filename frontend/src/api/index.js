const API_BASE = import.meta.env.VITE_API_URL || '/api';
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
    updateProfile: (body) => request('/auth/profile', { method: 'PUT', body }),
    changePassword: (body) => request('/auth/password', { method: 'PUT', body }),
  },
  listings: {
    getAll: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/listings${qs ? `?${qs}` : ''}`); },
    getMine: () => request('/listings/mine'),
    getOne: (id) => request(`/listings/${id}`),
    getStats: () => request('/listings/stats'),
    create: (body) => request('/listings', { method: 'POST', body }),
    update: (id, body) => request(`/listings/${id}`, { method: 'PUT', body }),
    delete: (id) => request(`/listings/${id}`, { method: 'DELETE' }),
    upload: (formData) => request('/listings/upload', { method: 'POST', body: formData }),
  },
  reservations: {
    create: (body) => request('/reservations', { method: 'POST', body }),
    getMine: () => request('/reservations'),
    getForListing: (listingId) => request(`/reservations/listing/${listingId}`),
    update: (id, body) => request(`/reservations/${id}`, { method: 'PATCH', body }),
  },
  notifications: {
    list: () => request('/notifications'),
    unreadCount: () => request('/notifications/unread-count'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
    remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },
  admin: {
    login: (body) => request('/admin/login', { method: 'POST', body }),
    stats: () => request('/admin/stats'),
    users: () => request('/admin/users'),
    ngos: () => request('/admin/ngos'),
    orders: () => request('/admin/orders'),
    listings: () => request('/admin/listings'),
    trends: (days = 14) => request(`/admin/trends?days=${days}`),
    auditLog: (limit = 50) => request(`/admin/audit-log?limit=${limit}`),
    updateOrder: (id, body) => request(`/admin/orders/${id}`, { method: 'PATCH', body }),
    updateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  }
};