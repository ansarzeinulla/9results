import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cachedLookups } from "@/lib/cached";
import CreateTournament from "./CreateTournament";
import OrganizerGate from "./OrganizerGate";

export default async function OrganizerDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  // Only reference data is loaded server-side; the tournament list lives on its
  // own page, fetched client-side with the organizer's token.
  const lookups = await cachedLookups(locale);

  return (
    <OrganizerGate>
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          <Link
            href="/organizer/my"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            {t("dashboard.myTournaments")}
          </Link>
        </div>
        <h2 className="mb-3 mt-2 text-lg font-semibold">{t("dashboard.create")}</h2>
        <CreateTournament lookups={lookups} />
      </div>
    </OrganizerGate>
  );
}
