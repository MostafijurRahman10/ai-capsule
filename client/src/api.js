async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.errors?.join(' ') || body.error || 'Request failed.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

export const api = {
  me: () => request('/api/me'),
  list: () => request('/api/capsules'),
  create: data => request('/api/capsules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/capsules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: id => request(`/api/capsules/${id}`, { method: 'DELETE' }),
  logout: () => request('/auth/logout', { method: 'POST' })
};
