import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cachedTournament } from "@/lib/cached";
import TabNav from "./TabNav";
import SwipeNavigator from "@/components/SwipeNavigator";
import PullToRefresh from "@/components/PullToRefresh";
import ShareButton from "@/components/ShareButton";

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
      <div className="mb-4">
        <Link href="/tournaments" className="text-sm text-neutral-500 hover:underline">
          ← {t("tournaments.title")}
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">{tournament.name}</h1>
          <ShareButton title={tournament.name} />
        </div>
      </div>
      <TabNav slug={slug} />
      <SwipeNavigator slug={slug}>
        <div className="mt-4">{children}</div>
      </SwipeNavigator>
    </PullToRefresh>
  );
}
