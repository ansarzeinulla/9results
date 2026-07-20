import { getTranslations, setRequestLocale } from "next-intl/server";
import { cachedLookups } from "@/lib/cached";
import CreateTournament from "./CreateTournament";
import MyTournaments from "./MyTournaments";

export default async function OrganizerDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  // Only reference data is loaded server-side; the tournament list is fetched
  // client-side with the organizer's token so each account sees only its own.
  const lookups = await cachedLookups(locale);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">{t("dashboard.title")}</h1>
      <MyTournaments />
      <h2 className="mb-3 mt-8 text-lg font-semibold">{t("dashboard.create")}</h2>
      <CreateTournament lookups={lookups} />
    </div>
  );
}
