import type { ReactNode } from "react";
import { Suspense } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
import HtmlLang from "@/components/HtmlLang";
import { SkeletonRows } from "@/components/Skeleton";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Static-shell fallback while the localized app streams in. */
function ShellFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-20">
      <SkeletonRows rows={6} />
    </div>
  );
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // NextIntlClientProvider reads the request config (messages) at render
    // time, which Cache Components treats as uncached data — it must live
    // under a Suspense boundary so the static shell can prerender.
    <Suspense fallback={<ShellFallback />}>
      <NextIntlClientProvider>
        <HtmlLang locale={locale} />
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4">
          {children}
        </main>
      </NextIntlClientProvider>
    </Suspense>
  );
}
