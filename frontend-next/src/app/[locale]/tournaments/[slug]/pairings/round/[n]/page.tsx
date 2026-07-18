import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getPairings, getRounds, getTournamentBySlug } from "@/lib/data";
import ResultChip from "@/components/ResultChip";

export default async function RoundPairings({
  params,
}: {
  params: Promise<{ locale: string; slug: string; n: string }>;
}) {
  const { locale, slug, n } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tr = await getTournamentBySlug(locale, slug);
  if (!tr) notFound();
  const rounds = await getRounds(tr.id);
  const current = rounds.find((r) => r.round_number === Number(n));
  if (!current && rounds.length > 0) notFound();
  const pairings = current ? await getPairings(current.id) : [];

  return (
    <div>
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {rounds.map((r) => (
          <Link
            key={r.id}
            href={`/tournaments/${slug}/pairings/round/${r.round_number}`}
            className={`rounded-lg border px-4 py-1.5 text-sm font-medium ${
              r.round_number === Number(n)
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {t("tournamentView.round", { n: r.round_number })}
          </Link>
        ))}
      </div>

      {pairings.length === 0 ? (
        <p className="text-neutral-500">{t("tournamentView.noPairings")}</p>
      ) : (
        <div className="space-y-2">
          {pairings.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
            >
              <span className="w-8 shrink-0 text-center font-mono text-neutral-400">
                {m.board_number === 999 ? "—" : m.board_number}
              </span>
              <div className="flex-1 text-right">
                <span className="font-medium">{m.white_name}</span>{" "}
                <span className="text-neutral-400">
                  [{m.white_rating ?? 0}
                  {m.white_points != null ? ` · ${Number(m.white_points)}` : ""}]
                </span>
              </div>
              <ResultChip result={m.result_id} />
              <div className="flex-1">
                {m.black_player_id ? (
                  <>
                    <span className="text-neutral-400">
                      [{m.black_rating ?? 0}
                      {m.black_points != null ? ` · ${Number(m.black_points)}` : ""}]
                    </span>{" "}
                    <span className="font-medium">{m.black_name}</span>
                  </>
                ) : (
                  <span className="text-neutral-400">{t("tournamentView.bye")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
