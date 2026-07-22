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

  const items = [
    { href: "/tournaments", label: t("nav.tournaments"), count: counts.tournaments },
    { href: "/players", label: t("nav.players"), count: counts.players },
    { href: "/organizers", label: t("nav.organizers"), count: counts.organizations },
    { href: "/arbiters", label: t("nav.arbiters"), count: counts.arbiters },
  ];

  const construction = [
    { label: t("nav.engine") },
    { label: t("nav.arena") },
    { label: t("nav.games") },
    { label: t("nav.var") },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-6 py-10 text-white">
        <h1 className="text-3xl font-bold md:text-4xl">9ecosystem</h1>
        <p className="mt-2 max-w-xl text-emerald-100">{t("app.tagline")}</p>
        
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl bg-white/10 p-4 hover:bg-white/20"
            >
              <div className="text-2xl font-bold">{item.count}</div>
              <div className="text-sm text-emerald-100">{item.label}</div>
            </Link>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {construction.map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-white/5 p-4 text-emerald-200 opacity-70"
            >
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs">{t("nav.underConstruction")}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
