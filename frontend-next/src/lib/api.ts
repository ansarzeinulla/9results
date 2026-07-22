/** Client-side calls to the FastAPI backend (organizer/admin actions). */
import { tagsForMutation } from "./cache-rules";
import { formatApiError } from "./api-error";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * After a successful mutation, tell Next.js which cached tournament data is
 * now stale. Fire-and-forget: a failure only means spectators wait out the
 * normal SWR window instead of seeing the change instantly.
 */
function invalidateCache(path: string, method: string) {
  if (method === "GET") return;
  // round/pairing URLs carry no tournament id — take it from the organizer
  // page the arbiter is standing on (/organizer/tournaments/{id})
  const onScreen = window.location.pathname.match(
    /\/organizer\/tournaments\/(\d+)/
  );
  const tags = tagsForMutation(
    path,
    onScreen ? Number(onScreen[1]) : undefined
  );
  if (tags.length === 0) return;
  fetch("/api/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
    keepalive: true,
  }).catch(() => {});
}

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
    let detail: string = res.statusText;
    try {
      detail = formatApiError((await res.json()).detail, res.statusText);
    } catch {}
    throw new Error(detail);
  }
  invalidateCache(path, (options.method ?? "GET").toUpperCase());
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
