import { describe, expect, it } from "vitest";
import { strategyFor } from "./sw-strategy";

describe("service-worker caching strategy by URL", () => {
  it("hashed build assets are cache-first (immutable)", () => {
    expect(strategyFor("/_next/static/chunks/abc123.js", "script")).toBe(
      "cache-first"
    );
    expect(strategyFor("/_next/static/css/app.css", "style")).toBe(
      "cache-first"
    );
  });

  it("page navigations are network-first with offline fallback", () => {
    expect(strategyFor("/en/tournaments/astana-open", "navigate")).toBe(
      "network-first"
    );
    expect(strategyFor("/ru", "navigate")).toBe("network-first");
  });

  it("API calls are never touched by the service worker", () => {
    expect(strategyFor("/api/revalidate", "fetch")).toBe("bypass");
    expect(strategyFor("/api/omni", "fetch")).toBe("bypass");
  });

  it("organizer and admin areas are never served from cache", () => {
    expect(strategyFor("/en/organizer/tournaments/5", "navigate")).toBe(
      "bypass"
    );
    expect(strategyFor("/kk/admin", "navigate")).toBe("bypass");
    expect(strategyFor("/en/login", "navigate")).toBe("bypass");
  });

  it("everything else defaults to network-only", () => {
    expect(strategyFor("/manifest.webmanifest", "fetch")).toBe("bypass");
  });
});
