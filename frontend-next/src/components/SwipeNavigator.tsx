"use client";

import { useRef, type ReactNode, type TouchEvent } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

const MIN_X = 75;
const MAX_Y = 40;
const MAX_MS = 600;

export default function SwipeNavigator({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  const base = `/tournaments/${slug}`;
  const tabs = [
    base,
    `${base}/starting-rank`,
    `${base}/pairings`,
    `${base}/standings`,
    `${base}/alphabetical`,
  ];
  const current =
    pathname === base
      ? 0
      : tabs.findIndex((t, i) => i > 0 && pathname.startsWith(t));

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || current === -1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = Math.abs(t.clientY - s.y);
    if (Math.abs(dx) < MIN_X || dy > MAX_Y || Date.now() - s.t > MAX_MS) return;
    const next = current + (dx < 0 ? 1 : -1);
    if (next < 0 || next >= tabs.length) return;
    router.push(tabs[next]);
  };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  );
}
