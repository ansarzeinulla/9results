import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function TitlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rulesPage.titles");

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-lg font-semibold">{t("heading")}</h2>
      <div>
        <h3 className="mb-1 font-medium">{t("playerHeading")}</h3>
        <p className="text-neutral-600">{t("playerTitles")}</p>
      </div>
      <div>
        <h3 className="mb-1 font-medium">{t("arbiterHeading")}</h3>
        <p className="text-neutral-600">{t("arbiterTitles")}</p>
      </div>
    </div>
  );
}
