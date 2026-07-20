/**
 * Pure caching policy, shared by the `use cache` data layer and the
 * client-side invalidation call. Kept free of Next.js imports so it is unit
 * testable.
 */

export type CacheLifeProfile =
  | "hours"
  | { stale: number; revalidate: number; expire: number };

/** Short SWR windows while a tournament is live; long cache once it is over. */
export function lifeForStatus(status: string | undefined): CacheLifeProfile {
  if (status === "COMPLETED" || status === "CANCELLED") return "hours";
  // ONGOING / REGISTRATION / DRAFT / unknown: results may change any minute.
  return { stale: 30, revalidate: 60, expire: 300 };
}

/**
 * Which cache tags a successful organizer/admin mutation invalidates.
 *
 * Round/pairing URLs carry no tournament id, so the caller passes the id it
 * already has on screen (`knownTournamentId`).
 */
export function tagsForMutation(
  path: string,
  knownTournamentId?: number
): string[] {
  const tournament = path.match(/^\/tournaments\/(\d+)/);
  if (tournament) return [`tournament-${tournament[1]}`, "tournaments"];
  if (path === "/tournaments") return ["tournaments"];

  if (/^\/(rounds|pairings)\//.test(path)) {
    return knownTournamentId != null
      ? [`tournament-${knownTournamentId}`, "tournaments"]
      : ["tournaments"];
  }

  if (/^\/players(\/|$)/.test(path)) return ["players"];
  return [];
}
