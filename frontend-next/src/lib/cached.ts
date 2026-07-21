/**
 * Cached read layer for the public pages (Next.js Cache Components).
 *
 * Each function bundles everything one page needs into a single `use cache`
 * scope, so a page view costs at most one database round trip per cache
 * window instead of one per query. Lifetimes follow the tournament status
 * (live = short SWR window, finished = hours) and every entry is tagged so
 * organizer writes can invalidate exactly the affected tournament via
 * /api/revalidate.
 */
import { cacheLife, cacheTag } from "next/cache";
import { lifeForStatus } from "./cache-rules";
import {
  getCounts,
  getLookups,
  getOfficial,
  getOfficialTournaments,
  getOrganization,
  getOrganizationTournaments,
  getPairings,
  getParticipants,
  getPlayer,
  getPlayerTournaments,
  getRatingHistory,
  getRounds,
  getStandingsAfterRound,
  getTournamentBySlug,
  getTournamentTieBreaks,
  listOfficials,
  listOrganizations,
  listPlayers,
  listTournaments,
  type PlayerFilters,
  type TournamentFilters,
  type TournamentRow,
} from "./data";

/** Tag + lifetime for one tournament's data, chosen by its live status. */
function markTournament(t: TournamentRow | null) {
  if (t) {
    cacheTag(`tournament-${t.id}`);
    const life = lifeForStatus(t.status);
    // narrow the union: cacheLife has separate string/object overloads
    if (typeof life === "string") cacheLife(life);
    else cacheLife(life);
  } else {
    // cache the 404 briefly so a mistyped slug cannot hammer the database
    cacheLife("minutes");
  }
}

export async function cachedTournament(locale: string, slug: string) {
  "use cache";
  const t = await getTournamentBySlug(locale, slug);
  markTournament(t);
  return t;
}

export async function cachedStartList(
  locale: string,
  slug: string,
  order: "starting" | "alphabetical" | "standings"
) {
  "use cache";
  const tournament = await getTournamentBySlug(locale, slug);
  markTournament(tournament);
  const rows = tournament ? await getParticipants(tournament.id, order) : [];
  return { tournament, rows };
}

export async function cachedRoundsBundle(locale: string, slug: string) {
  "use cache";
  const tournament = await getTournamentBySlug(locale, slug);
  markTournament(tournament);
  const rounds = tournament ? await getRounds(tournament.id) : [];
  return { tournament, rounds };
}

export async function cachedPairings(locale: string, slug: string, n: number) {
  "use cache";
  const tournament = await getTournamentBySlug(locale, slug);
  markTournament(tournament);
  const rounds = tournament ? await getRounds(tournament.id) : [];
  const current = rounds.find((r) => r.round_number === n) ?? null;
  const pairings = current ? await getPairings(current.id) : [];
  return { tournament, rounds, current, pairings };
}

export async function cachedTournamentInfo(locale: string, slug: string) {
  "use cache";
  const tournament = await getTournamentBySlug(locale, slug);
  markTournament(tournament);
  const tieBreaks = tournament ? await getTournamentTieBreaks(tournament.id) : [];
  return { tournament, tieBreaks };
}

/** Standings snapshot after a chosen round (falls back to live standings). */
export async function cachedStandings(locale: string, slug: string, roundN?: number) {
  "use cache";
  const tournament = await getTournamentBySlug(locale, slug);
  markTournament(tournament);
  const rounds = tournament ? await getRounds(tournament.id) : [];
  const closed = rounds.filter((r) => r.is_closed);
  const target =
    roundN != null ? closed.find((r) => r.round_number === roundN) ?? null : null;
  const history =
    tournament && target
      ? await getStandingsAfterRound(tournament.id, target.id)
      : [];
  const live =
    tournament && !target ? await getParticipants(tournament.id, "standings") : [];
  return { tournament, rounds: closed, target, history, live };
}

export async function cachedOrganizers(q?: string) {
  "use cache";
  cacheTag("tournaments");
  cacheLife("hours");
  return listOrganizations(q);
}

export async function cachedOrganizerProfile(id: number) {
  "use cache";
  cacheTag("tournaments");
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  const organization = await getOrganization(id);
  const tournaments = organization ? await getOrganizationTournaments(id) : [];
  return { organization, tournaments };
}

export async function cachedArbiters(q?: string) {
  "use cache";
  cacheTag("tournaments");
  cacheLife("hours");
  return listOfficials(q);
}

export async function cachedArbiterProfile(id: number) {
  "use cache";
  cacheTag("tournaments");
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  const official = await getOfficial(id);
  const tournaments = official ? await getOfficialTournaments(id) : [];
  return { official, tournaments };
}

export async function cachedHome(locale: string) {
  "use cache";
  cacheTag("tournaments");
  cacheLife({ stale: 60, revalidate: 120, expire: 3600 });
  const [counts, list] = await Promise.all([
    getCounts(),
    listTournaments(locale, { pageSize: 4 }),
  ]);
  return { counts, tournaments: list.rows };
}

export async function cachedTournamentList(
  locale: string,
  filters: TournamentFilters
) {
  "use cache";
  cacheTag("tournaments");
  cacheLife({ stale: 60, revalidate: 120, expire: 3600 });
  return listTournaments(locale, filters);
}

export async function cachedPlayersList(filters: PlayerFilters) {
  "use cache";
  cacheTag("players");
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  return listPlayers(filters);
}

export async function cachedPlayerProfile(id: string) {
  "use cache";
  cacheTag("players");
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  const player = await getPlayer(id);
  if (!player) return { player: null, tournaments: [], history: [] };
  const [tournaments, history] = await Promise.all([
    getPlayerTournaments(player.id),
    getRatingHistory(player.id),
  ]);
  return { player, tournaments, history };
}

/** Reference data (locations, levels, …) — changes only via migrations. */
export async function cachedLookups(locale: string) {
  "use cache";
  cacheTag("lookups");
  cacheLife("hours");
  return getLookups(locale);
}
