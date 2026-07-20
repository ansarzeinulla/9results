/**
 * Single source of truth for what the service worker may cache.
 * public/sw.js inlines the same rules (it cannot import modules); this file
 * exists so the rules are unit-tested.
 */
export type SwStrategy = "cache-first" | "network-first" | "bypass";

export function strategyFor(pathname: string, mode: string): SwStrategy {
  // never serve authenticated or mutating surfaces from cache
  if (pathname.startsWith("/api/")) return "bypass";
  if (/^\/[a-z]{2}\/(organizer|admin|login)(\/|$)/.test(pathname)) {
    return "bypass";
  }

  // hashed build output is immutable: cache forever, serve instantly
  if (pathname.startsWith("/_next/static/")) return "cache-first";

  // page navigations: try the network (fresh results), fall back to the last
  // cached copy, then to /offline — this is what survives a 2G hall
  if (mode === "navigate") return "network-first";

  return "bypass";
}
