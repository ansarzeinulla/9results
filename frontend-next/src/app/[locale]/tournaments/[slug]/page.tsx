import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cachedTournamentInfo } from "@/lib/cached";

export default async function InfoTab({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("fields");
  const { tournament: tr, tieBreaks } = await cachedTournamentInfo(locale, slug);
  if (!tr) notFound();

  const rows: [string, string | number | null][] = [
    [t("federation"), tr.federation_id],
    [t("location"), tr.location_name ?? tr.location_id],
    [t("date"), `${tr.start_date} — ${tr.end_date}`],
    [t("level"), tr.level_name ?? tr.level_id],
    [t("system"), tr.tournament_type_name ?? tr.tournament_type_id],
    [t("ratingType"), tr.rating_type_name ?? tr.rating_type_id],
    [t("timeControl"), tr.time_control],
    [t("organizer"), tr.organizer_name ?? null],
    [t("arbiter"), tr.arbiter_name ?? null],
    [t("director"), tr.director_name ?? null],
    [
      t("tieBreaks"),
      tieBreaks.length
        ? tieBreaks.map((tb) => `TB${tb.position}: ${tb.tie_break_id}`).join(", ")
        : null,
    ],
    [t("status"), tr.status],
    [
      t("lastUpdate"),
      tr.last_updated ? String(tr.last_updated).slice(0, 16).replace("T", " ") : null,
    ],
  ];

  return (
    <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
      {rows
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-neutral-100 pb-2">
            <dt className="text-neutral-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
    </dl>
  );
}
