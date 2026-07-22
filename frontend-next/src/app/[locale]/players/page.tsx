import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cachedLookups, cachedPlayersList } from "@/lib/cached";
import PlayerSearch from "./PlayerSearch";

const PAGE_SIZE = 100;

export default async function PlayersPage({
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
    cachedPlayersList({
      q: sp.q,
      id: sp.id,
      firstName: sp.firstName,
      lastName: sp.lastName,
      middleName: sp.middleName,
      title: sp.title,
      club: sp.club,
      federation: sp.federation,
      yobMin: sp.yobMin,
      yobMax: sp.yobMax,
      minClassic: sp.minClassic,
      minRapid: sp.minRapid,
      minBlitz: sp.minBlitz,
      page,
      pageSize: PAGE_SIZE,
    }),
    cachedLookups(locale),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("players.title")}</h1>
      <PlayerSearch lookups={lookups} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-neutral-500">
              <th className="w-10 py-2 pr-3">#</th>
              <th className="w-12 py-2 pr-3">{t("fields.title")}</th>
              <th className="w-full py-2 pr-3">{t("fields.player")}</th>
              <th className="py-2 pr-3">{t("fields.ratingClassic")}</th>
              <th className="hidden py-2 pr-3 sm:table-cell">{t("fields.ratingRapid")}</th>
              <th className="hidden py-2 pr-3 sm:table-cell">{t("fields.ratingBlitz")}</th>
              <th className="hidden py-2 pr-3 sm:table-cell">{t("fields.federation")}</th>
              <th className="hidden py-2 sm:table-cell">{t("fields.club")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr
                key={p.id}
                className="border-b border-neutral-100 hover:bg-neutral-50"
              >
                <td className="py-2 pr-3 text-neutral-400">
                  {(page - 1) * PAGE_SIZE + i + 1}
                </td>
                <td className="py-2 pr-3 text-neutral-500">{p.title_id ?? ""}</td>
                <td className="py-2 pr-3 font-medium">
                  <Link href={`/players/${p.id}`} className="hover:underline">
                    {p.last_name} {p.first_name} {p.middle_name ?? ""}
                  </Link>
                </td>
                <td className="py-2 pr-3 tabular-nums">{p.rating_classic}</td>
                <td className="hidden py-2 pr-3 tabular-nums sm:table-cell">{p.rating_rapid}</td>
                <td className="hidden py-2 pr-3 tabular-nums sm:table-cell">{p.rating_blitz}</td>
                <td className="hidden py-2 pr-3 sm:table-cell">{p.federation_id}</td>
                <td className="hidden py-2 sm:table-cell">{p.club ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: pages }).map((_, i) => {
            const qp = new URLSearchParams(
              Object.entries(sp).filter(([, v]) => v) as [string, string][]
            );
            qp.set("page", String(i + 1));
            return (
              <Link
                key={i}
                href={`/players?${qp}`}
                className={`rounded-lg border px-3 py-1 text-sm ${
                  page === i + 1
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-neutral-300"
                }`}
              >
                {i + 1}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
