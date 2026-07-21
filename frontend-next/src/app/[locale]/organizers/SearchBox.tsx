"use client";

import { useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export default function SearchBox({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const apply = () => router.push(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname);
  return (
    <div className="flex gap-2">
      <input
        className="w-full max-w-md rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
      />
      <button
        onClick={apply}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        OK
      </button>
    </div>
  );
}
