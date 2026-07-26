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

  // The engine is live and lives on its own site; the rest are placeholders.
  const construction = [
    {
      label: t("nav.engine"),
      sub: t("nav.engineRating"),
      count: 0,
      href: "https://9qumalaq.vercel.app/",
    },
    { label: t("nav.arena"), sub: t("nav.games"), count: 0 },
    { label: t("nav.var"), count: 0 },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 px-6 py-10 text-white">
        <h1 className="text-3xl font-bold md:text-4xl">9ecosystem</h1>

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
          {construction.map((item) => {
            const body = (
              <>
                <div className="text-2xl font-bold">{item.count}</div>
                <div className="text-sm text-emerald-100">{item.label}</div>
                {item.sub ? (
                  <div className="text-xs text-emerald-200">{item.sub}</div>
                ) : null}
              </>
            );
            return item.href ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white/10 p-4 hover:bg-white/20"
              >
                {body}
              </a>
            ) : (
              <div key={item.label} className="rounded-xl bg-white/5 p-4">
                {body}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
