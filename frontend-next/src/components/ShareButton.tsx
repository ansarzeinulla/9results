"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ShareButton({ title }: { title: string }) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // user dismissed the share sheet
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (insecure context or focus lost) — nothing to show
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={share}
        aria-label={t("share")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {t("share")}
      </button>
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-white dark:text-neutral-900">
          {t("copied")}
        </span>
      )}
    </span>
  );
}
