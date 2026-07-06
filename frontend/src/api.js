async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function apiGet(path) {
  return handle(await fetch(`/api${path}`));
}

export async function apiPost(path, body) {
  return handle(
    await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

export const STATUS_LABELS = { setup: 'Upcoming', ongoing: 'Live', finished: 'Finished' };
