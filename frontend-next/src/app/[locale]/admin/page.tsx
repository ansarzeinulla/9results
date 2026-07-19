import { setRequestLocale } from "next-intl/server";
import { getLookups, listPlayers } from "@/lib/data";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const [{ rows }, lookups] = await Promise.all([
    listPlayers({ q: sp.q, pageSize: 50 }),
    getLookups(locale),
  ]);

  return <AdminPanel players={rows} federations={lookups.federations} />;
}
