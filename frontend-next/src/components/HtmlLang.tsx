"use client";

import { useEffect } from "react";

/** Keeps <html lang> in sync with the active locale (html lives in the root layout). */
export default function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
