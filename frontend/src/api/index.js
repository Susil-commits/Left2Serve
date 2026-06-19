const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options, headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
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
  admin: {
    login: (body) => request('/admin/login', { method: 'POST', body }),
    stats: () => request('/admin/stats'),
    users: () => request('/admin/users'),
    ngos: () => request('/admin/ngos'),
    orders: () => request('/admin/orders'),
    listings: () => request('/admin/listings'),
    updateOrder: (id, body) => request(`/admin/orders/${id}`, { method: 'PATCH', body }),
  }
};