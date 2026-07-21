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
  const { counts } = await cachedHome(locale);

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
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/tournaments"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            {t("nav.tournaments")}
          </Link>
          <Link
            href="/players"
            className="rounded-lg border border-white/60 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            {t("nav.players")}
          </Link>
        </div>
      </section>
    </div>
  );
}
