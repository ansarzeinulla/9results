"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { useRouter } from "@/i18n/navigation";

const THRESHOLD = 70;
const RESISTANCE = 0.4;
const MAX_PULL = 120;

export default function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: TouchEvent) => {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    setPull(delta > 0 ? Math.min(delta * RESISTANCE, MAX_PULL) : 0);
  };

  const onTouchEnd = () => {
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      router.refresh();
      setTimeout(() => {
        setRefreshing(false);
        setPull(0);
      }, 800);
    } else {
      setPull(0);
    }
  };

  const visible = pull > 0 || refreshing;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        aria-hidden={!visible}
        className="pointer-events-none flex justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: visible ? Math.max(pull, refreshing ? 48 : 0) : 0 }}
      >
        <svg
          viewBox="0 0 24 24"
          className={`mt-2 h-6 w-6 text-emerald-600 ${refreshing ? "animate-spin" : ""}`}
          style={
            refreshing ? undefined : { transform: `rotate(${pull * 2.6}deg)` }
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v5h-5" />
        </svg>
      </div>
      {children}
    </div>
  );
}
