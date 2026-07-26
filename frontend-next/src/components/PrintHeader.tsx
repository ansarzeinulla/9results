"use client";

import { useEffect, useState } from "react";

/**
 * Print-only masthead: the tournament, what exactly is on the sheet (which
 * round / which standings), and the address the sheet came from — at the top,
 * where a reader looks for it, instead of the browser's own footer.
 *
 * Hidden on screen; `.print-only` is defined in globals.css.
 */
export default function PrintHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const [href, setHref] = useState("");
  // location is not available while rendering on the server; filling it in
  // after mount keeps the markup identical on both sides.
  useEffect(() => setHref(window.location.href), []);

  return (
    <header className="print-only mb-3 border-b border-black pb-2">
      <div className="text-xs">{href}</div>
      <div className="mt-1 text-lg font-bold">{title}</div>
      {subtitle && <div className="text-sm">{subtitle}</div>}
    </header>
  );
}
