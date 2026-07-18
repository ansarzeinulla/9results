import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLookups, listAllTournaments } from "@/lib/data";
import CreateTournament from "./CreateTournament";

export const dynamic = "force-dynamic";

export default async function OrganizerDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const [tournaments, lookups] = await Promise.all([
    listAllTournaments(locale),
    getLookups(locale),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">{t("dashboard.title")}</h1>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
        {tournaments.map((tr) => (
          <li key={tr.id} className="flex items-center justify-between py-3">
            <div>
              <Link
                href={`/organizer/tournaments/${tr.id}`}
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                {tr.name}
              </Link>
              <div className="text-sm text-neutral-500">
                {tr.start_date} — {tr.end_date} · {tr.status}
              </div>
            </div>
            <Link
              href={`/tournaments/${tr.slug ?? tr.id}`}
              className="text-sm text-neutral-500 hover:underline"
            >
              {t("common.publicPage")}
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mb-3 mt-8 text-lg font-semibold">{t("dashboard.create")}</h2>
      <CreateTournament lookups={lookups} />
    </div>
  );
}
