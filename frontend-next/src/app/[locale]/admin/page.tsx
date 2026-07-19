import { setRequestLocale } from "next-intl/server";
import { getLookups } from "@/lib/data";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // No player list is loaded here on purpose: the registry is expected to grow
  // to millions of rows, so players are reached by id, not by listing them.
  const lookups = await getLookups(locale);

  return <AdminPanel federations={lookups.federations} />;
}
