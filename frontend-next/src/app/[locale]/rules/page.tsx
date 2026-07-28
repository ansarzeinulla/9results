import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function PairingSystemsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rulesPage.pairing");

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-lg font-semibold">{t("heading")}</h2>
      <p className="text-neutral-600">{t("intro")}</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>{t("swiss")}</li>
        <li>{t("roundRobin")}</li>
        <li>{t("olympic")}</li>
        <li>{t("teamMatch")}</li>
      </ul>
    </div>
  );
}
