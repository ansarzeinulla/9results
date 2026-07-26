import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cachedRoundPairings, cachedRoundsBundle } from "@/lib/cached";
import PairingCard from "@/components/PairingCard";
import PrintHeader from "@/components/PrintHeader";

/**
 * The round switcher. It needs the full round list, which the boards below do
 * not — so it streams in on its own and never delays them.
 */
async function RoundTabs({
  locale,
  slug,
  current,
}: {
  locale: string;
  slug: string;
  current: number;
}) {
  const t = await getTranslations();
  const { rounds } = await cachedRoundsBundle(locale, slug);
  return (
    <>
      {rounds.map((r) => (
        <Link
          key={r.id}
          href={`/tournaments/${slug}/pairings/round/${r.round_number}`}
          className={`rounded-lg border px-4 py-1.5 text-sm font-medium ${
            r.round_number === current
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-neutral-300"
          }`}
        >
          {t("tournamentView.round", { n: r.round_number })}
        </Link>
      ))}
    </>
  );
}

export default async function RoundPairings({
  params,
}: {
  params: Promise<{ locale: string; slug: string; n: string }>;
}) {
  const { locale, slug, n } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { tournament: tr, current, pairings } = await cachedRoundPairings(
    locale,
    slug,
    Number(n)
  );
  if (!tr) notFound();

  return (
    <div>
      <PrintHeader
        title={tr.name}
        subtitle={t("tournamentView.pairings", { n: Number(n) })}
      />
      <div className="scrollbar-none no-print -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <Suspense
          fallback={
            <span className="h-8 w-24 animate-pulse rounded-lg bg-neutral-100" />
          }
        >
          <RoundTabs locale={locale} slug={slug} current={Number(n)} />
        </Suspense>
      </div>

      {!current || pairings.length === 0 ? (
        <p className="text-neutral-500">{t("tournamentView.noPairings")}</p>
      ) : (
        <div className="space-y-2">
          {pairings.map((m) => (
            <PairingCard key={m.id} pairing={m} byeLabel={t("tournamentView.bye")} />
          ))}
        </div>
      )}
    </div>
  );
}
