import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import RulesSidebar from "./RulesSidebar";

export default async function RulesLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rulesPage");

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <div className="flex flex-col gap-6 sm:flex-row">
        <RulesSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
