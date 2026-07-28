import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function TieBreaksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rulesPage.tieBreaks");

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-lg font-semibold">{t("heading")}</h2>
      <p className="text-neutral-600">{t("intro")}</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>{t("points")}</li>
        <li>{t("directEncounter")}</li>
        <li>{t("winCount")}</li>
        <li>{t("buchholz")}</li>
        <li>{t("berger")}</li>
        <li>{t("buchholzCut1")}</li>
        <li>{t("buchholzCut2")}</li>
        <li>{t("medianBuchholz")}</li>
        <li>{t("cumulativeScore")}</li>
      </ul>
    </div>
  );
}
