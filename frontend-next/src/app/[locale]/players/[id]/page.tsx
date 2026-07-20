import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cachedPlayerProfile } from "@/lib/cached";

export default async function PlayerProfile({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { player, tournaments, history } = await cachedPlayerProfile(
    decodeURIComponent(id)
  );
  if (!player) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900">
          👤
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {player.title_id && (
              <span className="mr-2 text-emerald-600">{player.title_id}</span>
            )}
            {player.last_name} {player.first_name} {player.middle_name ?? ""}
          </h1>
          <div className="text-sm text-neutral-500">
            ID: {player.id} · {player.federation_id}
            {player.year_of_birth ? ` · ${player.year_of_birth}` : ""}
            {player.club ? ` · ${player.club}` : ""}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        {(
          [
            ["ratingClassic", player.rating_classic],
            ["ratingRapid", player.rating_rapid],
            ["ratingBlitz", player.rating_blitz],
          ] as const
        ).map(([key, val]) => (
          <div
            key={key}
            className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <div className="text-2xl font-bold">{val}</div>
            <div className="text-xs text-neutral-500">{t(`fields.${key}`)}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">{t("players.history")}</h2>
      {tournaments.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">{t("players.noHistory")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100 text-sm dark:divide-neutral-900">
          {tournaments.map((tr) => (
            <li key={String(tr.id)} className="flex justify-between py-2">
              <Link
                href={`/tournaments/${tr.slug ?? tr.id}`}
                className="font-medium hover:underline"
              >
                {String(tr.name)}
              </Link>
              <span className="text-neutral-500">
                {tr.final_rank ? `#${tr.final_rank} · ` : ""}
                {tr.points != null ? `${Number(tr.points)} ${t("fields.points")}` : ""}
                {tr.rating_change != null
                  ? ` · ${Number(tr.rating_change) > 0 ? "+" : ""}${Number(tr.rating_change)}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-lg font-semibold">{t("players.ratingHistory")}</h2>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">{t("players.noRatingHistory")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100 text-sm dark:divide-neutral-900">
          {history.map((h, i) => (
            <li key={i} className="flex justify-between py-2">
              <span>
                {String(h.tournament_name ?? "")} ({String(h.rating_type_id)})
              </span>
              <span className="font-mono">
                {String(h.rating_before)} → {String(h.rating_after)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
