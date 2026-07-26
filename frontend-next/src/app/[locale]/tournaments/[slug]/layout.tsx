import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cachedTournament } from "@/lib/cached";
import TabNav from "./TabNav";
import SwipeNavigator from "@/components/SwipeNavigator";
import PullToRefresh from "@/components/PullToRefresh";
import ShareButton from "@/components/ShareButton";
import PrintButton from "@/components/PrintButton";

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
  const tournament = await cachedTournament(locale, slug);
  if (!tournament) notFound();

  return (
    <PullToRefresh>
      {/* On paper this whole block is replaced by each tab's PrintHeader,
          which also carries the round and the source address. */}
      <div className="no-print mb-4">
        <Link
          href="/tournaments"
          className="no-print text-sm text-neutral-500 hover:underline"
        >
          ← {t("tournaments.title")}
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">{tournament.name}</h1>
          <div className="flex items-center gap-2">
            <PrintButton />
            <ShareButton title={tournament.name} />
          </div>
        </div>
      </div>
      <TabNav slug={slug} />
      <SwipeNavigator slug={slug}>
        <div className="mt-4">{children}</div>
      </SwipeNavigator>
    </PullToRefresh>
  );
}
