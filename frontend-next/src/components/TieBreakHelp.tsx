"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/**
 * The "?" in the standings header: explains how the tie-breaks are computed
 * and what the player / arbiter title abbreviations mean. A native <dialog>
 * gives focus trapping and Esc-to-close for free.
 */
export default function TieBreakHelp() {
  const t = useTranslations("help");
  const ref = useRef<HTMLDialogElement>(null);

  // Clicking the backdrop (the dialog's own box, outside its content) closes it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === el) el.close();
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

  const section = (heading: string, body: string[]) => (
    <section className="mt-4">
      <h3 className="text-sm font-semibold">{heading}</h3>
      <ul className="mt-1 space-y-1 text-sm text-neutral-600">
        {body.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      <button
        type="button"
        aria-label={t("open")}
        title={t("open")}
        onClick={() => ref.current?.showModal()}
        className="no-print ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-400 align-middle text-[10px] leading-none text-neutral-500"
      >
        ?
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[90vw] max-w-lg rounded-xl p-5 backdrop:bg-black/40"
      >
        <h2 className="text-lg font-bold">{t("title")}</h2>
        {section(t("tbHeading"), [t("tb1"), t("tb2"), t("tb3"), t("tb4")])}
        <p className="mt-2 text-sm text-neutral-500">{t("order")}</p>
        {section(t("titlesHeading"), [t("titles")])}
        {section(t("arbiterTitlesHeading"), [t("arbiterTitles")])}
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("close")}
        </button>
      </dialog>
    </>
  );
}
