import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { cachedRoundsBundle } from "@/lib/cached";
import { getTranslations } from "next-intl/server";

export default async function PairingsIndex({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { tournament: tr, rounds } = await cachedRoundsBundle(locale, slug);
  if (!tr) notFound();
  if (rounds.length > 0) {
    const latest = rounds[rounds.length - 1].round_number;
    redirect({ href: `/tournaments/${slug}/pairings/round/${latest}`, locale });
  }
  const t = await getTranslations("tournamentView");
  return <p className="text-neutral-500">{t("noPairings")}</p>;
}
