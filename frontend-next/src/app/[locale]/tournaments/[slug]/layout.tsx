import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTournamentBySlug } from "@/lib/data";
import TabNav from "./TabNav";

export default async function TournamentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tournament = await getTournamentBySlug(locale, slug);
  if (!tournament) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link href="/tournaments" className="text-sm text-neutral-500 hover:underline">
          ← {t("tournaments.title")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">{tournament.name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
          <span>📍 {tournament.location_name ?? tournament.location_id}</span>
          <span>📅 {tournament.start_date} — {tournament.end_date}</span>
          {tournament.time_control && <span>⏱ {tournament.time_control}</span>}
          <span>♟ {tournament.tournament_type_id}</span>
        </div>
      </div>
      <TabNav slug={slug} />
      <div className="mt-4">{children}</div>
    </div>
  );
}
