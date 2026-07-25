import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MyTournaments from "../MyTournaments";
import OrganizerGate from "../OrganizerGate";

export default async function MyTournamentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <OrganizerGate>
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("dashboard.myTournaments")}</h1>
          <Link
            href="/organizer"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            {t("dashboard.create")}
          </Link>
        </div>
        <MyTournaments />
      </div>
    </OrganizerGate>
  );
}
