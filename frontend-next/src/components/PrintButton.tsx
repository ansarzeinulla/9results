"use client";

import { useTranslations } from "next-intl";

/** Prints the current page. Print CSS (globals.css) hides the site chrome so
 *  only the list/table content lands on the A4 sheet. Hidden when printing. */
export default function PrintButton() {
  const t = useTranslations();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print h-9 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
    >
      {t("tournamentView.print")}
    </button>
  );
}
