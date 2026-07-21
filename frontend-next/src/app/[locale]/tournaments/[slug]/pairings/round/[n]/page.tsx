import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cachedPairings } from "@/lib/cached";
import PairingCard from "@/components/PairingCard";

export default async function RoundPairings({
  params,
}: {
  params: Promise<{ locale: string; slug: string; n: string }>;
}) {
  const { locale, slug, n } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { tournament: tr, rounds, current, pairings } = await cachedPairings(
    locale,
    slug,
    Number(n)
  );
  if (!tr) notFound();
  if (!current && rounds.length > 0) notFound();

  return (
    <div>
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {rounds.map((r) => (
          <Link
            key={r.id}
            href={`/tournaments/${slug}/pairings/round/${r.round_number}`}
            className={`rounded-lg border px-4 py-1.5 text-sm font-medium ${
              r.round_number === Number(n)
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-neutral-300"
            }`}
          >
            {t("tournamentView.round", { n: r.round_number })}
          </Link>
        ))}
      </div>

      {pairings.length === 0 ? (
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
