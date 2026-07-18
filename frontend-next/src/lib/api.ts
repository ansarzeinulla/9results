/** Client-side calls to the FastAPI backend (organizer/admin actions). */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function getUser(): { username: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("user");
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function login(username: string, password: string) {
  const data = await api<{ token: string; user: { username: string; role: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) }
  );
  window.localStorage.setItem("token", data.token);
  window.localStorage.setItem("user", JSON.stringify(data.user));
  return data.user;
}
