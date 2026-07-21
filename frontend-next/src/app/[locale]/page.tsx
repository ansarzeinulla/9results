import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cachedHome } from "@/lib/cached";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { counts, tournaments } = await cachedHome(locale);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-6 py-10 text-white">
        <h1 className="text-3xl font-bold md:text-4xl">9Ecosystem</h1>
        <p className="mt-2 max-w-xl text-emerald-100">{t("app.tagline")}</p>
        <div className="mt-6 flex flex-wrap gap-8">
          <div>
            <div className="text-3xl font-bold">{counts.players}</div>
            <div className="text-sm text-emerald-200">{t("hero.activePlayers")}</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{counts.tournaments}</div>
            <div className="text-sm text-emerald-200">{t("hero.tournamentsCount")}</div>
          </div>
          <div>
            <div className="text-3xl font-bold">0</div>
            <div className="text-sm text-emerald-200">{t("hero.gamesCount")}</div>
          </div>
          <div>
            <div className="text-3xl font-bold">0</div>
            <div className="text-sm text-emerald-200">{t("hero.liveCount")}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("hero.ongoing")}</h2>
          </div>
          {tournaments.length === 0 ? (
            <p className="text-neutral-500">{t("home.noTournaments")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tournaments.map((tr) => (
                <Link
                  key={tr.id}
                  href={`/tournaments/${tr.slug ?? tr.id}/pairings`}
                  className="block rounded-xl border border-neutral-200 p-4 hover:border-emerald-500 dark:border-neutral-800 dark:hover:border-emerald-500 transition-colors"
                >
                  <div className="font-semibold">{tr.name}</div>
                  <div className="mt-1 text-sm text-neutral-500">
                    {tr.location_name ?? tr.location_id} · {tr.start_date} —{" "}
                    {tr.end_date}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
