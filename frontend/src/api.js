function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function apiGet(path) {
  return handle(await fetch(`/api${path}`, { headers: authHeaders() }));
}

export async function apiSend(method, path, body) {
  return handle(
    await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    })
  );
}

export const apiPost = (path, body) => apiSend('POST', path, body);
export const apiPut = (path, body) => apiSend('PUT', path, body);

export const STATUS_LABELS = { setup: 'Upcoming', ongoing: 'Live', finished: 'Finished' };
