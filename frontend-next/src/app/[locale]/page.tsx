import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";
import { Link } from "@/i18n/navigation";
import { getCounts, listTournaments } from "@/lib/data";
import kaz from "@/data/kaz.json";
import wdf from "@/data/wdf.json";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const [counts, { rows: tournaments }] = await Promise.all([
    getCounts(),
    listTournaments(locale, { pageSize: 4 }),
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-6 py-10 text-white">
        <h1 className="text-3xl font-bold md:text-4xl">{t("app.title")}</h1>
        <p className="mt-2 max-w-xl text-emerald-100">{t("app.tagline")}</p>
        <div className="mt-6 flex gap-8">
          <div>
            <div className="text-3xl font-bold">{counts.players}</div>
            <div className="text-sm text-emerald-200">{t("hero.activePlayers")}</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{counts.tournaments}</div>
            <div className="text-sm text-emerald-200">{t("hero.tournamentsCount")}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("hero.ongoing")}</h2>
            <Link href="/tournaments" className="text-sm text-emerald-600 hover:underline">
              {t("nav.tournaments")} →
            </Link>
          </div>
          {tournaments.length === 0 ? (
            <p className="text-neutral-500">{t("home.noTournaments")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tournaments.map((tr) => (
                <div
                  key={tr.id}
                  className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <div className="font-semibold">{tr.name}</div>
                  <div className="mt-1 text-sm text-neutral-500">
                    📍 {tr.location_name ?? tr.location_id} · 📅 {tr.start_date} —{" "}
                    {tr.end_date}
                  </div>
                  <Link
                    href={`/tournaments/${tr.slug ?? tr.id}/pairings`}
                    className="mt-3 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    {t("hero.viewPairings")}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <h2 className="text-xl font-semibold">{t("hero.contacts")}</h2>
          {[kaz, wdf].map((f) => (
            <div
              key={f.code}
              className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800"
            >
              <div className="font-semibold">{f.name}</div>
              <div className="mt-1 text-neutral-500">{f.code}</div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
