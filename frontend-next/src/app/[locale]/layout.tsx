import type { ReactNode } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import HtmlLang from "@/components/HtmlLang";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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
    <NextIntlClientProvider>
      <HtmlLang locale={locale} />
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </NextIntlClientProvider>
  );
}
