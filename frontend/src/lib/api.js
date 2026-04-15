const BASE_URL = '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  return localStorage.getItem('vault_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user');
    window.location.href = '/login';
    throw new ApiError('Unauthorized', 401);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error || data?.message || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data;
}

// Auth
export const auth = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  me: () => request('/auth/me'),
  setup2FA: () => request('/auth/2fa/setup', { method: 'POST' }),
  verify2FA: (code) => request('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  disable2FA: () => request('/auth/2fa/disable', { method: 'POST' }),
  verifyPassword: (password) => request('/auth/verify-password', { method: 'POST', body: JSON.stringify({ password }) }),
};

// Credentials
export const credentials = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.branch_id) qs.set('branch_id', params.branch_id);
    if (params.q) qs.set('q', params.q);
    if (params.device_type) qs.set('device_type', params.device_type);
    const query = qs.toString();
    return request(`/credentials${query ? '?' + query : ''}`);
  },
  get: (id) => request(`/credentials/${id}`),
  create: (data) => request('/credentials', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/credentials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/credentials/${id}`, { method: 'DELETE' }),
  history: (id) => request(`/credentials/${id}/history`),
};

// Branches
export const branches = {
  list: () => request('/branches'),
  create: (data) => request('/branches', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/branches/${id}`, { method: 'DELETE' }),
};

// Users
export const users = {
  list: () => request('/users'),
  create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  getAccess: (id) => request(`/users/${id}/access`),
  updateAccess: (id, data) => request(`/users/${id}/access`, { method: 'PUT', body: JSON.stringify(data) }),
  getCredentialAccess: (id) => request(`/users/${id}/credential-access`),
  updateCredentialAccessBulk: (id, data) =>
    request(`/users/${id}/credential-access/bulk`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Dashboard
export const dashboard = {
  get: () => request('/dashboard'),
};

// Audit
export const audit = {
  list: (limit = 100) => request(`/audit?limit=${limit}`),
};

// Device Types
export const deviceTypes = {
  list: () => request('/device-types'),
};

// Password Generator
export const generatePassword = (length = 20) =>
  request(`/generate-password?length=${length}`);

export { ApiError };
