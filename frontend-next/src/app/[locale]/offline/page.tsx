import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function OfflinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("offline");

  return (
    <div className="mx-auto mt-24 max-w-sm text-center">
      <div className="text-5xl">📴</div>
      <h1 className="mt-4 text-xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-sm text-neutral-500">{t("hint")}</p>
    </div>
  );
}
