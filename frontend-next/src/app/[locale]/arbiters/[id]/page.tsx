import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cachedArbiterProfile } from "@/lib/cached";
import TournamentHistoryTable from "@/components/TournamentHistoryTable";

export default async function ArbiterProfile({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { official, tournaments } = await cachedArbiterProfile(Number(id));
  if (!official) notFound();
  const listTitle = t("arbiters.tournamentsArbitrated");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">
        {official.title && (
          <span className="mr-2 text-emerald-600">{official.title}</span>
        )}
        {official.last_name} {official.first_name} {official.middle_name ?? ""}
      </h1>
      <div className="mt-1 text-sm text-neutral-500">
        {listTitle}: {tournaments.length}
      </div>
      <h2 className="mt-8 text-lg font-semibold">{listTitle}</h2>
      <TournamentHistoryTable
        rows={tournaments.map((tr) => ({
          id: tr.id,
          slug: tr.slug,
          name: tr.name,
          start_date: String(tr.start_date),
          end_date: String(tr.end_date),
          time_control: tr.time_control,
          tournament_type_id: tr.tournament_type_id,
        }))}
      />
    </div>
  );
}
