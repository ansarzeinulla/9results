import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cachedStandings } from "@/lib/cached";
import type { ParticipantRow } from "@/lib/data";
import ParticipantsTable from "../ParticipantsTable";

export default async function StandingsTab({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const roundN = sp.round ? Number(sp.round) : undefined;
  const { tournament: tr, rounds, target, history, live } = await cachedStandings(
    locale,
    slug,
    roundN
  );
  if (!tr) notFound();

  const rows: ParticipantRow[] = target
    ? history.map((h) => ({
        player_id: h.player_id,
        starting_rank: null,
        rating_at_tournament: h.rating_at_tournament,
        points: h.points,
        tie_break_1: h.tie_break_1,
        tie_break_2: h.tie_break_2,
        tie_break_3: h.tie_break_3,
        final_rank: h.rank_after_round,
        status: h.status,
        club: h.club,
        first_name: h.first_name,
        last_name: h.last_name,
        title_id: h.title_id,
      }))
    : live;

  return (
    <div>
      {rounds.length > 0 && (
        <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          <Link
            href={`/tournaments/${slug}/standings`}
            className={`whitespace-nowrap rounded-lg border px-4 py-1.5 text-sm font-medium ${
              !target
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-neutral-300"
            }`}
          >
            {t("standings.current")}
          </Link>
          {rounds.map((r) => (
            <Link
              key={r.id}
              href={`/tournaments/${slug}/standings?round=${r.round_number}`}
              className={`whitespace-nowrap rounded-lg border px-4 py-1.5 text-sm font-medium ${
                target?.id === r.id
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-neutral-300"
              }`}
            >
              {t("standings.afterRound", { n: r.round_number })}
            </Link>
          ))}
        </div>
      )}
      <ParticipantsTable rows={rows} mode="standings" />
    </div>
  );
}
