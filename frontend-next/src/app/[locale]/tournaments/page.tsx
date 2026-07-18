import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLookups, listTournaments } from "@/lib/data";
import FiltersPanel from "./FiltersPanel";

export default async function TournamentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total }, lookups] = await Promise.all([
    listTournaments(locale, {
      q: sp.q,
      federation: sp.federation,
      location: sp.location,
      level: sp.level,
      ratingType: sp.ratingType,
      dateFrom: sp.dateFrom,
      dateTo: sp.dateTo,
      page,
    }),
    getLookups(locale),
  ]);
  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <FiltersPanel lookups={lookups} />
      <section>
        <h1 className="mb-4 text-2xl font-bold">{t("tournaments.title")}</h1>
        {rows.length === 0 ? (
          <p className="text-neutral-500">{t("tournaments.empty")}</p>
        ) : (
          <>
            {/* mobile: cards */}
            <div className="space-y-3 md:hidden">
              {rows.map((tr) => (
                <Link
                  key={tr.id}
                  href={`/tournaments/${tr.slug ?? tr.id}`}
                  className="block rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <div className="font-semibold">{tr.name}</div>
                  <div className="mt-1 text-sm text-neutral-500">
                    📍 {tr.location_name ?? tr.location_id} · ⏱{" "}
                    {tr.rating_type_id} · 📅 {tr.start_date}
                  </div>
                </Link>
              ))}
            </div>
            {/* desktop: table */}
            <table className="hidden w-full border-collapse text-sm md:table">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500 dark:border-neutral-700">
                  <th className="py-2 pr-4">{t("fields.name")}</th>
                  <th className="py-2 pr-4">{t("fields.federation")}</th>
                  <th className="py-2 pr-4">{t("fields.location")}</th>
                  <th className="py-2 pr-4">{t("fields.date")}</th>
                  <th className="py-2">{t("fields.lastUpdate")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tr) => (
                  <tr
                    key={tr.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900"
                  >
                    <td className="py-2 pr-4">
                      <Link
                        href={`/tournaments/${tr.slug ?? tr.id}`}
                        className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {tr.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{tr.federation_id}</td>
                    <td className="py-2 pr-4">{tr.location_name ?? tr.location_id}</td>
                    <td className="py-2 pr-4">
                      {tr.start_date} — {tr.end_date}
                    </td>
                    <td className="py-2 text-neutral-500">
                      {tr.last_updated ? String(tr.last_updated).slice(0, 10) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <nav className="mt-4 flex gap-2">
                {Array.from({ length: pages }).map((_, i) => {
                  const qp = new URLSearchParams(
                    Object.entries(sp).filter(([, v]) => v) as [string, string][]
                  );
                  qp.set("page", String(i + 1));
                  return (
                    <Link
                      key={i}
                      href={`/tournaments?${qp}`}
                      className={`rounded-lg border px-3 py-1 text-sm ${
                        page === i + 1
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-neutral-300 dark:border-neutral-700"
                      }`}
                    >
                      {i + 1}
                    </Link>
                  );
                })}
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
