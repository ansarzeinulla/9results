/**
 * Read-only data access for public pages (Server Components).
 *
 * Production: supabase-js with the anon key — RLS makes it read-only.
 * Local dev/tests: direct Postgres via `pg` when DATABASE_URL is set.
 */
import { cache } from "react";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { indexTranslations, localizedName } from "./translations";

/**
 * Reference data (locations, levels, rating types, federations) changes
 * essentially never but was re-read on every organizer/admin page load — four
 * queries plus every location translation. Memoised per server instance with a
 * short TTL so it costs one round trip per window instead of per request.
 */
const REFERENCE_TTL_MS = 10 * 60 * 1000;
const referenceCache = new Map<string, { at: number; value: unknown }>();

async function memoReference<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = referenceCache.get(key);
  if (hit && Date.now() - hit.at < REFERENCE_TTL_MS) return hit.value as T;
  const value = await load();
  referenceCache.set(key, { at: Date.now(), value });
  return value;
}

/** Throw on Supabase errors instead of silently returning empty results. */
function unwrap<T>(res: { data: T; error: unknown }): T {
  if (res.error) {
    const msg =
      typeof res.error === "object" && res.error && "message" in res.error
        ? (res.error as { message: string }).message
        : String(res.error);
    throw new Error(`Supabase query failed: ${msg}`);
  }
  return res.data;
}

/** Fetch location names for the given ids in one query; returns a lang index. */
async function locationNameIndex(locationIds: (string | null)[]) {
  const ids = [...new Set(locationIds.filter((x): x is string => !!x))];
  if (ids.length === 0) return indexTranslations([]);
  const res = await supabase()
    .from("location_translations")
    .select("location_id, lang_code, name")
    .in("location_id", ids);
  return indexTranslations(unwrap(res) ?? []);
}

const useSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

let pool: Pool | null = null;
function pg() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ?? "postgresql://localhost:5432/results_togyz",
    });
  }
  return pool;
}

export function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pg().query(text, params);
  // pg returns DATE/TIMESTAMP as Date objects; React can't render them.
  for (const row of res.rows) {
    for (const [k, v] of Object.entries(row)) {
      if (v instanceof Date) {
        // Local date parts — toISOString would shift by the TZ offset.
        const pad = (n: number) => String(n).padStart(2, "0");
        row[k] = `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
      }
    }
  }
  return res.rows as T[];
}

export interface TournamentRow {
  id: number;
  name: string;
  slug: string | null;
  federation_id: string | null;
  location_id: string | null;
  location_name?: string | null;
  start_date: string | null;
  end_date: string | null;
  rounds: number | null;
  status: string;
  level_id: string | null;
  rating_type_id: string | null;
  tournament_type_id: string | null;
  time_control: string | null;
  last_updated: string | null;
}

const LANG_MAP: Record<string, string> = { ru: "RUS", en: "ENG", kk: "KAZ" };
export const dbLang = (locale: string) => LANG_MAP[locale] ?? "RUS";

export async function getCounts() {
  if (useSupabase) {
    const sb = supabase();
    const [p, t] = await Promise.all([
      sb.from("players").select("id", { count: "exact", head: true }),
      sb.from("tournaments").select("id", { count: "exact", head: true }),
    ]);
    return { players: p.count ?? 0, tournaments: t.count ?? 0 };
  }
  const rows = await sql<{ players: string; tournaments: string }>(
    `SELECT (SELECT COUNT(*) FROM players) AS players,
            (SELECT COUNT(*) FROM tournaments) AS tournaments`
  );
  return {
    players: Number(rows[0].players),
    tournaments: Number(rows[0].tournaments),
  };
}

export interface TournamentFilters {
  q?: string;
  federation?: string;
  location?: string;
  level?: string;
  ratingType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listTournaments(locale: string, f: TournamentFilters = {}) {
  const pageSize = f.pageSize ?? 20;
  const offset = ((f.page ?? 1) - 1) * pageSize;
  if (useSupabase) {
    let q = supabase()
      .from("tournaments")
      .select("*", { count: "exact" })
      .neq("status", "DRAFT")
      .order("start_date", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (f.q) q = q.ilike("name", `%${f.q}%`);
    if (f.federation) q = q.eq("federation_id", f.federation);
    if (f.location) q = q.eq("location_id", f.location);
    if (f.level) q = q.eq("level_id", f.level);
    if (f.ratingType) q = q.eq("rating_type_id", f.ratingType);
    if (f.dateFrom) q = q.gte("start_date", f.dateFrom);
    if (f.dateTo) q = q.lte("start_date", f.dateTo);
    const res = await q;
    const data = unwrap(res) ?? [];
    const index = await locationNameIndex(data.map((t) => t.location_id));
    const rows = data.map((t) => ({
      ...t,
      location_name: localizedName(index, t.location_id, dbLang(locale)),
    }));
    return { rows: rows as unknown as TournamentRow[], total: res.count ?? 0 };
  }
  const conds: string[] = ["t.status <> 'DRAFT'"];
  const params: unknown[] = [dbLang(locale)];
  const add = (cond: string, val: unknown) => {
    params.push(val);
    conds.push(cond.replace("?", `$${params.length}`));
  };
  if (f.q) add("t.name ILIKE ?", `%${f.q}%`);
  if (f.federation) add("t.federation_id = ?", f.federation);
  if (f.location) add("t.location_id = ?", f.location);
  if (f.level) add("t.level_id = ?", f.level);
  if (f.ratingType) add("t.rating_type_id = ?", f.ratingType);
  if (f.dateFrom) add("t.start_date >= ?", f.dateFrom);
  if (f.dateTo) add("t.start_date <= ?", f.dateTo);
  params.push(pageSize, offset);
  const rows = await sql<TournamentRow & { total: string }>(
    `SELECT t.*, lt.name AS location_name, COUNT(*) OVER() AS total
     FROM tournaments t
     LEFT JOIN location_translations lt
       ON lt.location_id = t.location_id AND lt.lang_code = $1
     WHERE ${conds.join(" AND ")}
     ORDER BY t.start_date DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows, total: rows.length ? Number(rows[0].total) : 0 };
}

async function loadTournamentBySlug(locale: string, rawSlug: string) {
  // Route params arrive percent-encoded for non-Latin slugs (e.g. Cyrillic
  // tournament names), and the dashboard links `slug ?? id`, so a tournament
  // without a slug is addressed by its numeric id.
  const slug = decodeURIComponent(rawSlug);
  const asId = /^\d+$/.test(slug) ? Number(slug) : null;

  if (useSupabase) {
    let data = unwrap(
      await supabase().from("tournaments").select("*").eq("slug", slug).maybeSingle()
    );
    if (!data && asId !== null) {
      data = unwrap(
        await supabase().from("tournaments").select("*").eq("id", asId).maybeSingle()
      );
    }
    if (!data) return null;
    const index = await locationNameIndex([data.location_id]);
    return {
      ...data,
      location_name: localizedName(index, data.location_id, dbLang(locale)),
    } as TournamentRow;
  }
  const rows = await sql<TournamentRow>(
    `SELECT t.*, lt.name AS location_name
     FROM tournaments t
     LEFT JOIN location_translations lt
       ON lt.location_id = t.location_id AND lt.lang_code = $1
     WHERE t.slug = $2 OR ($3::int IS NOT NULL AND t.id = $3::int)
     LIMIT 1`,
    [dbLang(locale), slug, asId]
  );
  return rows[0] ?? null;
}

/**
 * Deduplicated per request: the tournament layout and the active tab each need
 * the tournament, which previously issued the same query twice per page view.
 */
export const getTournamentBySlug = cache(loadTournamentBySlug);

export interface ParticipantRow {
  player_id: string;
  starting_rank: number | null;
  rating_at_tournament: number | null;
  points: string;
  tie_break_1: string;
  tie_break_2: string;
  tie_break_3: string;
  final_rank: number | null;
  status: string;
  club: string | null;
  first_name: string;
  last_name: string;
  title_id: string | null;
}

export async function getParticipants(
  tournamentId: number,
  order: "starting" | "alphabetical" | "standings"
): Promise<ParticipantRow[]> {
  if (useSupabase) {
    const { data } = await supabase()
      .from("tournament_participants")
      .select(
        "player_id, starting_rank, rating_at_tournament, points, tie_break_1, tie_break_2, tie_break_3, final_rank, status, club, players(first_name, last_name, title_id)"
      )
      .eq("tournament_id", tournamentId);
    const rows = (data ?? []).map((r) => {
      const p = r.players as unknown as {
        first_name: string;
        last_name: string;
        title_id: string | null;
      };
      return { ...r, ...p } as unknown as ParticipantRow;
    });
    if (order === "alphabetical")
      rows.sort((a, b) => a.last_name.localeCompare(b.last_name));
    else if (order === "standings")
      rows.sort((a, b) => (a.final_rank ?? 999) - (b.final_rank ?? 999));
    else rows.sort((a, b) => (a.starting_rank ?? 999) - (b.starting_rank ?? 999));
    return rows;
  }
  const orderSql =
    order === "alphabetical"
      ? "p.last_name, p.first_name"
      : order === "standings"
        ? "tp.final_rank NULLS LAST"
        : "tp.starting_rank NULLS LAST";
  return sql<ParticipantRow>(
    `SELECT tp.player_id, tp.starting_rank, tp.rating_at_tournament, tp.points,
            tp.tie_break_1, tp.tie_break_2, tp.tie_break_3, tp.final_rank,
            tp.status, tp.club, p.first_name, p.last_name, p.title_id
     FROM tournament_participants tp
     JOIN players p ON p.id = tp.player_id
     WHERE tp.tournament_id = $1
     ORDER BY ${orderSql}`,
    [tournamentId]
  );
}

export interface RoundRow {
  id: number;
  round_number: number;
  is_closed: boolean;
}

export async function getRounds(tournamentId: number): Promise<RoundRow[]> {
  if (useSupabase) {
    const { data } = await supabase()
      .from("rounds")
      .select("id, round_number, is_closed")
      .eq("tournament_id", tournamentId)
      .order("round_number");
    return (data ?? []) as RoundRow[];
  }
  return sql<RoundRow>(
    `SELECT id, round_number, is_closed FROM rounds
     WHERE tournament_id = $1 ORDER BY round_number`,
    [tournamentId]
  );
}

export interface PairingRow {
  id: number;
  board_number: number;
  white_player_id: string;
  black_player_id: string | null;
  result_id: string | null;
  white_name?: string;
  black_name?: string | null;
  white_rating?: number | null;
  black_rating?: number | null;
  white_points?: string;
  black_points?: string | null;
}

export async function getPairings(roundId: number): Promise<PairingRow[]> {
  if (useSupabase) {
    const sb = supabase();
    const pairings = unwrap(
      await sb
        .from("pairings")
        .select("id, board_number, white_player_id, black_player_id, result_id, round_id")
        .eq("round_id", roundId)
        .order("board_number")
    ) as {
      id: number;
      board_number: number;
      white_player_id: string;
      black_player_id: string | null;
      result_id: string | null;
      round_id: number;
    }[];
    if (pairings.length === 0) return [];

    const round = unwrap(
      await sb.from("rounds").select("tournament_id").eq("id", roundId).maybeSingle()
    ) as { tournament_id: number } | null;

    const ids = [
      ...new Set(
        pairings.flatMap((p) =>
          [p.white_player_id, p.black_player_id].filter((x): x is string => !!x)
        )
      ),
    ];
    const players = unwrap(
      await sb.from("players").select("id, first_name, last_name").in("id", ids)
    ) as { id: string; first_name: string; last_name: string }[];
    const nameById = new Map(
      players.map((p) => [p.id, `${p.last_name} ${p.first_name}`])
    );

    const tps = round
      ? ((unwrap(
          await sb
            .from("tournament_participants")
            .select("player_id, rating_at_tournament, points")
            .eq("tournament_id", round.tournament_id)
            .in("player_id", ids)
        ) ?? []) as {
          player_id: string;
          rating_at_tournament: number | null;
          points: string;
        }[])
      : [];
    const tpById = new Map(tps.map((t) => [t.player_id, t]));

    return pairings.map((p) => ({
      id: p.id,
      board_number: p.board_number,
      white_player_id: p.white_player_id,
      black_player_id: p.black_player_id,
      result_id: p.result_id,
      white_name: nameById.get(p.white_player_id) ?? p.white_player_id,
      black_name: p.black_player_id
        ? (nameById.get(p.black_player_id) ?? p.black_player_id)
        : null,
      white_rating: tpById.get(p.white_player_id)?.rating_at_tournament ?? null,
      black_rating: p.black_player_id
        ? (tpById.get(p.black_player_id)?.rating_at_tournament ?? null)
        : null,
      white_points: tpById.get(p.white_player_id)?.points,
      black_points: p.black_player_id
        ? tpById.get(p.black_player_id)?.points
        : null,
    }));
  }
  return sql<PairingRow>(
    `SELECT pr.id, pr.board_number, pr.white_player_id, pr.black_player_id,
            pr.result_id,
            (w.last_name || ' ' || w.first_name) AS white_name,
            (b.last_name || ' ' || b.first_name) AS black_name,
            wtp.rating_at_tournament AS white_rating,
            btp.rating_at_tournament AS black_rating,
            wtp.points AS white_points, btp.points AS black_points
     FROM pairings pr
     JOIN rounds r ON r.id = pr.round_id
     JOIN players w ON w.id = pr.white_player_id
     LEFT JOIN players b ON b.id = pr.black_player_id
     LEFT JOIN tournament_participants wtp
       ON wtp.tournament_id = r.tournament_id AND wtp.player_id = pr.white_player_id
     LEFT JOIN tournament_participants btp
       ON btp.tournament_id = r.tournament_id AND btp.player_id = pr.black_player_id
     WHERE pr.round_id = $1
     ORDER BY pr.board_number`,
    [roundId]
  );
}

export interface PlayerFilters {
  q?: string;
  federation?: string;
  birthYear?: string;
  page?: number;
  pageSize?: number;
}

export interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  federation_id: string | null;
  gender_id: string | null;
  year_of_birth: number | null;
  title_id: string | null;
  club: string | null;
  rating_classic: number;
  rating_rapid: number;
  rating_blitz: number;
}

export async function listPlayers(f: PlayerFilters = {}) {
  const pageSize = f.pageSize ?? 25;
  const offset = ((f.page ?? 1) - 1) * pageSize;
  if (useSupabase) {
    let q = supabase()
      .from("players")
      .select("*", { count: "exact" })
      .order("rating_classic", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (f.q) q = q.or(`last_name.ilike.%${f.q}%,first_name.ilike.%${f.q}%,id.ilike.%${f.q}%`);
    if (f.federation) q = q.eq("federation_id", f.federation);
    if (f.birthYear) q = q.eq("year_of_birth", Number(f.birthYear));
    const { data, count } = await q;
    return { rows: (data ?? []) as PlayerRow[], total: count ?? 0 };
  }
  const conds: string[] = ["TRUE"];
  const params: unknown[] = [];
  if (f.q) {
    params.push(`%${f.q}%`);
    conds.push(
      `(p.last_name ILIKE $${params.length} OR p.first_name ILIKE $${params.length} OR p.id ILIKE $${params.length})`
    );
  }
  if (f.federation) {
    params.push(f.federation);
    conds.push(`p.federation_id = $${params.length}`);
  }
  if (f.birthYear) {
    params.push(Number(f.birthYear));
    conds.push(`p.year_of_birth = $${params.length}`);
  }
  params.push(pageSize, offset);
  const rows = await sql<PlayerRow & { total: string }>(
    `SELECT p.*, COUNT(*) OVER() AS total FROM players p
     WHERE ${conds.join(" AND ")}
     ORDER BY p.rating_classic DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows, total: rows.length ? Number(rows[0].total) : 0 };
}

export async function getPlayer(id: string) {
  if (useSupabase) {
    const { data } = await supabase()
      .from("players")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as PlayerRow) ?? null;
  }
  const rows = await sql<PlayerRow>("SELECT * FROM players WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function getPlayerTournaments(id: string, limit = 10) {
  if (useSupabase) {
    const { data } = await supabase()
      .from("tournament_participants")
      .select(
        "points, final_rank, rating_change, tournaments(id, name, slug, start_date, end_date)"
      )
      .eq("player_id", id)
      .limit(limit);
    return (data ?? [])
      .map((r) => ({
        ...(r.tournaments as unknown as TournamentRow),
        points: r.points,
        final_rank: r.final_rank,
        rating_change: r.rating_change,
      }))
      .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
  }
  return sql(
    `SELECT t.id, t.name, t.slug, t.start_date, t.end_date,
            tp.points, tp.final_rank, tp.rating_change
     FROM tournament_participants tp
     JOIN tournaments t ON t.id = tp.tournament_id
     WHERE tp.player_id = $1
     ORDER BY t.start_date DESC
     LIMIT $2`,
    [id, limit]
  );
}

export async function getRatingHistory(id: string, limit = 20) {
  if (useSupabase) {
    const { data } = await supabase()
      .from("rating_history")
      .select("rating_type_id, rating_before, rating_after, created_at, tournaments(name, slug)")
      .eq("player_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      ...r,
      tournament_name: (r.tournaments as unknown as { name: string } | null)?.name,
    }));
  }
  return sql(
    `SELECT rh.rating_type_id, rh.rating_before, rh.rating_after, rh.created_at,
            t.name AS tournament_name
     FROM rating_history rh
     LEFT JOIN tournaments t ON t.id = rh.tournament_id
     WHERE rh.player_id = $1
     ORDER BY rh.created_at DESC
     LIMIT $2`,
    [id, limit]
  );
}

export async function getTournamentById(locale: string, id: number) {
  if (useSupabase) {
    const { data } = await supabase()
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as TournamentRow) ?? null;
  }
  const rows = await sql<TournamentRow>(
    `SELECT t.*, lt.name AS location_name
     FROM tournaments t
     LEFT JOIN location_translations lt
       ON lt.location_id = t.location_id AND lt.lang_code = $1
     WHERE t.id = $2`,
    [dbLang(locale), id]
  );
  return rows[0] ?? null;
}

export async function listAllTournaments(locale: string) {
  if (useSupabase) {
    const { data } = await supabase()
      .from("tournaments")
      .select("*")
      .order("start_date", { ascending: false });
    return (data ?? []) as TournamentRow[];
  }
  return sql<TournamentRow>(
    `SELECT t.*, lt.name AS location_name FROM tournaments t
     LEFT JOIN location_translations lt
       ON lt.location_id = t.location_id AND lt.lang_code = $1
     ORDER BY t.start_date DESC`,
    [dbLang(locale)]
  );
}

export async function getLookups(locale: string) {
  return memoReference(`lookups:${dbLang(locale)}`, () => loadLookups(locale));
}

async function loadLookups(locale: string) {
  const lang = dbLang(locale);
  if (useSupabase) {
    const sb = supabase();
    const [locs, levels, ratings, feds] = await Promise.all([
      sb.from("location_translations").select("location_id, name").eq("lang_code", lang),
      sb.from("level_translations").select("level_id, name").eq("lang_code", lang),
      sb.from("rating_translations").select("rating_type_id, name").eq("lang_code", lang),
      sb.from("federations").select("id"),
    ]);
    return {
      locations: (locs.data ?? []).map((r) => ({ id: r.location_id, name: r.name })),
      levels: (levels.data ?? []).map((r) => ({ id: r.level_id, name: r.name })),
      ratingTypes: (ratings.data ?? []).map((r) => ({ id: r.rating_type_id, name: r.name })),
      federations: (feds.data ?? []).map((r) => ({ id: r.id, name: r.id })),
    };
  }
  const [locations, levels, ratingTypes, federations] = await Promise.all([
    sql<{ id: string; name: string }>(
      "SELECT location_id AS id, name FROM location_translations WHERE lang_code = $1 ORDER BY name",
      [lang]
    ),
    sql<{ id: string; name: string }>(
      "SELECT level_id AS id, name FROM level_translations WHERE lang_code = $1",
      [lang]
    ),
    sql<{ id: string; name: string }>(
      "SELECT rating_type_id AS id, name FROM rating_translations WHERE lang_code = $1",
      [lang]
    ),
    sql<{ id: string; name: string }>("SELECT id, id AS name FROM federations", []),
  ]);
  return { locations, levels, ratingTypes, federations };
}
