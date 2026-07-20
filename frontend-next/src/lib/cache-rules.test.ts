import { describe, expect, it } from "vitest";
import { lifeForStatus, tagsForMutation } from "./cache-rules";

describe("cacheLife profile by tournament status", () => {
  it("live tournaments get short SWR windows", () => {
    expect(lifeForStatus("ONGOING")).toEqual({
      stale: 30,
      revalidate: 60,
      expire: 300,
    });
    expect(lifeForStatus("REGISTRATION")).toEqual(lifeForStatus("ONGOING"));
  });

  it("finished and cancelled tournaments cache for hours", () => {
    expect(lifeForStatus("COMPLETED")).toBe("hours");
    expect(lifeForStatus("CANCELLED")).toBe("hours");
  });

  it("unknown or draft statuses fall back to the live profile (safe default)", () => {
    expect(lifeForStatus("DRAFT")).toEqual(lifeForStatus("ONGOING"));
    expect(lifeForStatus(undefined)).toEqual(lifeForStatus("ONGOING"));
  });
});

describe("cache tags invalidated by a mutation URL", () => {
  it("tournament-scoped mutations tag that tournament and the lists", () => {
    expect(tagsForMutation("/tournaments/7/players/bulk")).toEqual([
      "tournament-7",
      "tournaments",
    ]);
    expect(tagsForMutation("/tournaments/7/finalize")).toEqual([
      "tournament-7",
      "tournaments",
    ]);
    expect(tagsForMutation("/tournaments/7")).toEqual([
      "tournament-7",
      "tournaments",
    ]);
  });

  it("creating a tournament invalidates the lists", () => {
    expect(tagsForMutation("/tournaments")).toEqual(["tournaments"]);
  });

  it("round and pairing mutations cannot know the tournament id from the URL", () => {
    // the caller passes the id it already has on screen
    expect(tagsForMutation("/rounds/3/results", 7)).toEqual([
      "tournament-7",
      "tournaments",
    ]);
    expect(tagsForMutation("/pairings/12/result", 7)).toEqual([
      "tournament-7",
      "tournaments",
    ]);
    expect(tagsForMutation("/rounds/3/results")).toEqual(["tournaments"]);
  });

  it("player registry mutations tag players", () => {
    expect(tagsForMutation("/players")).toEqual(["players"]);
    expect(tagsForMutation("/players/KAZ-101")).toEqual(["players"]);
  });

  it("auth and unknown paths invalidate nothing", () => {
    expect(tagsForMutation("/auth/login")).toEqual([]);
    expect(tagsForMutation("/officials")).toEqual([]);
  });
});
