import { setRequestLocale } from "next-intl/server";
import { cachedLookups } from "@/lib/cached";
import AdminPanel from "./AdminPanel";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // No player list is loaded here on purpose: the registry is expected to grow
  // to millions of rows, so players are reached by id, not by listing them.
  const lookups = await cachedLookups(locale);

  return <AdminPanel federations={lookups.federations} />;
}
