import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cachedOrganizerProfile } from "@/lib/cached";
import TournamentHistoryTable from "@/components/TournamentHistoryTable";

export default async function OrganizerProfile({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { organization, tournaments } = await cachedOrganizerProfile(Number(id));
  if (!organization) notFound();
  const listTitle = t("organizers.tournamentsOrganized");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">{organization.name}</h1>
      <div className="mt-1 text-sm text-neutral-500">
        {t("fields.federation")}: {organization.federation_id ?? "—"} ·{" "}
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
