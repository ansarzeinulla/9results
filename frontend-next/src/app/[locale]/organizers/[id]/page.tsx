import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cachedOrganizerProfile } from "@/lib/cached";

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
      {tournaments.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">{t("tournaments.empty")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100 text-sm">
          {tournaments.map((tr) => (
            <li key={tr.id} className="flex flex-wrap justify-between gap-2 py-2">
              <Link
                href={`/tournaments/${tr.slug ?? tr.id}`}
                className="font-medium hover:underline"
              >
                {tr.name}
              </Link>
              <span className="text-neutral-500">
                {tr.start_date} — {tr.end_date}
                {tr.time_control ? ` · ${tr.time_control}` : ""}
                {tr.tournament_type_id ? ` · ${tr.tournament_type_id}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
