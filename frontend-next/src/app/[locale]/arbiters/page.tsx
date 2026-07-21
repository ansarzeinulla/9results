import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cachedArbiters } from "@/lib/cached";
import SearchBox from "./SearchBox";

export default async function ArbitersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const t = await getTranslations();
  const rows = await cachedArbiters(q);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("arbiters.title")}</h1>
      <SearchBox placeholder={t("arbiters.searchName")} />
      {rows.length === 0 ? (
        <p className="mt-4 text-neutral-500">{t("arbiters.empty")}</p>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-neutral-500">
              <th className="w-full py-2 pr-3">{t("fields.name")}</th>
              <th className="py-2 pr-3">{t("fields.title")}</th>
              <th className="py-2">{t("arbiters.tournamentsArbitrated")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="py-2 pr-3 font-medium">
                  <Link href={`/arbiters/${r.id}`} className="hover:underline">
                    {r.last_name} {r.first_name}
                  </Link>
                </td>
                <td className="py-2 pr-3">{r.title ?? ""}</td>
                <td className="py-2">{r.tournaments_count ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
