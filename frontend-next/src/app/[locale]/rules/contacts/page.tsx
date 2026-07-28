import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rulesPage.contacts");

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-lg font-semibold">{t("heading")}</h2>
      <p className="text-neutral-600">{t("body")}</p>
    </div>
  );
}
