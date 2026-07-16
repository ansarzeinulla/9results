function getApiUrl() {
  // Local development: use Vite proxy or local backend
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api';
  }
  // Production: use Render backend URL (from environment or default)
  return import.meta.env.VITE_API_URL || 'https://nineresults-api.onrender.com/api';
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.data = data; // full payload (e.g. Swiss validation errors/warnings)
    throw err;
  }
  return data;
}

export async function apiGet(path) {
  return handle(await fetch(`${getApiUrl()}${path}`, { headers: authHeaders() }));
}

export async function apiSend(method, path, body) {
  return handle(
    await fetch(`${getApiUrl()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    })
  );
}

export const apiPost = (path, body) => apiSend('POST', path, body);
export const apiPut = (path, body) => apiSend('PUT', path, body);

export const STATUS_LABELS = { setup: 'Upcoming', ongoing: 'Live', finished: 'Finished' };
