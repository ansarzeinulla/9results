import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function RatingFormulaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rulesPage.rating");

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-lg font-semibold">{t("heading")}</h2>
      <p className="text-neutral-600">{t("intro")}</p>
      <pre className="whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs">
        {t("formula")}
      </pre>
      <p className="text-neutral-600">{t("notes")}</p>
    </div>
  );
}
